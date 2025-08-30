import { 
  Founder, 
  FundingRound, 
  ESOPPool, 
  Investor, 
  CapTableState, 
  RoundCalculationResult, 
  ExitSimulation,
  Scenario 
} from '../types/financial';

export class FinancialEngine {
  static readonly INITIAL_SHARES = 10_000_000; // 10M shares initially
  
  static calculateCapTable(scenario: Scenario): CapTableState[] {
    const states: CapTableState[] = [];
    
    // Initial state
    let currentState = this.createInitialState(scenario.founders, scenario.esopPools);
    states.push(currentState);
    
    // Process each round
    for (const round of scenario.rounds) {
      const result = this.processRound(currentState, round);
      currentState = result.postRoundState;
      states.push(currentState);
    }
    
    return states;
  }
  
  private static createInitialState(founders: Founder[], esopPools: ESOPPool[]): CapTableState {
    const totalEquityPercent = founders.reduce((sum, f) => sum + f.initialEquity, 0) +
                              esopPools.reduce((sum, e) => sum + e.percentage, 0);
    
    if (Math.abs(totalEquityPercent - 100) > 0.01) {
      throw new Error('Initial equity must sum to 100%');
    }
    
    const totalShares = this.INITIAL_SHARES;
    const esopShares = esopPools.reduce((sum, pool) => 
      sum + Math.round((pool.percentage / 100) * totalShares), 0);
    
    return {
      totalShares,
      founders: founders.map(founder => ({
        id: founder.id,
        name: founder.name,
        shares: Math.round((founder.initialEquity / 100) * totalShares),
        percentage: founder.initialEquity
      })),
      esop: {
        shares: esopShares,
        percentage: esopPools.reduce((sum, pool) => sum + pool.percentage, 0)
      },
      investors: []
    };
  }
  
  private static processRound(
    preRoundState: CapTableState, 
    round: FundingRound
  ): RoundCalculationResult {
    let postRoundState = { ...preRoundState };
    let sharePrice: number;
    let preMoney: number;
    let postMoney: number;
    let newShares: number;
    
    // Handle founder secondary sales first
    if (round.founderSecondary) {
      postRoundState = this.processFounderSecondary(postRoundState, round.founderSecondary);
    }
    
    // Handle ESOP adjustments (pre-money)
    if (round.esopAdjustment?.isPreMoney) {
      postRoundState = this.adjustESOPPool(
        postRoundState, 
        round.esopAdjustment.newPoolPercentage, 
        true, 
        0
      );
    }
    
    if (round.type === 'PRICED') {
      const terms = round.pricedTerms!;
      
      if (terms.preMoneyValuation) {
        preMoney = terms.preMoneyValuation;
        sharePrice = preMoney / postRoundState.totalShares;
        newShares = Math.round(round.capitalRaised / sharePrice);
        postMoney = preMoney + round.capitalRaised;
      } else {
        postMoney = terms.postMoneyValuation!;
        preMoney = postMoney - round.capitalRaised;
        sharePrice = preMoney / postRoundState.totalShares;
        newShares = Math.round(round.capitalRaised / sharePrice);
      }
    } else {
      // SAFE conversion logic
      const safeTerms = round.safeTerms!;
      
      // Calculate conversion price based on cap and discount
      let conversionPrice: number;
      
      if (safeTerms.valuationCap && safeTerms.discount) {
        // Use better of cap price or discount price for investor
        const capPrice = safeTerms.valuationCap / postRoundState.totalShares;
        const discountPrice = capPrice * (1 - safeTerms.discount / 100);
        conversionPrice = Math.min(capPrice, discountPrice);
      } else if (safeTerms.valuationCap) {
        conversionPrice = safeTerms.valuationCap / postRoundState.totalShares;
      } else if (safeTerms.discount) {
        // Need next round price for discount calculation
        // For now, assume a reasonable price
        const assumedPrice = 1.0; // $1 per share assumption
        conversionPrice = assumedPrice * (1 - safeTerms.discount / 100);
      } else {
        throw new Error('SAFE must have either valuation cap or discount');
      }
      
      sharePrice = conversionPrice;
      newShares = Math.round(round.capitalRaised / sharePrice);
      preMoney = sharePrice * postRoundState.totalShares;
      postMoney = preMoney + round.capitalRaised;
    }
    
    // Add new shares to total
    const newTotalShares = postRoundState.totalShares + newShares;
    
    // Handle ESOP adjustments (post-money)
    if (round.esopAdjustment && !round.esopAdjustment.isPreMoney) {
      postRoundState = this.adjustESOPPool(
        postRoundState, 
        round.esopAdjustment.newPoolPercentage, 
        false, 
        newShares
      );
    }
    
    // Create new investor
    const investorEquityPercent = (newShares / newTotalShares) * 100;
    
    const newInvestor = {
      id: `investor-${round.id}`,
      name: `${round.name} Investor`,
      shares: newShares,
      percentage: investorEquityPercent,
      investmentAmount: round.capitalRaised
    };
    
    // Recalculate all percentages with new total
    postRoundState.totalShares = newTotalShares;
    postRoundState.founders = postRoundState.founders.map(founder => ({
      ...founder,
      percentage: (founder.shares / newTotalShares) * 100
    }));
    
    postRoundState.esop.percentage = (postRoundState.esop.shares / newTotalShares) * 100;
    
    postRoundState.investors = [
      ...postRoundState.investors.map(investor => ({
        ...investor,
        percentage: (investor.shares / newTotalShares) * 100
      })),
      newInvestor
    ];
    
    // Validate totals
    const totalPercentage = postRoundState.founders.reduce((sum, f) => sum + f.percentage, 0) +
                           postRoundState.esop.percentage +
                           postRoundState.investors.reduce((sum, i) => sum + i.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.1) {
      console.warn(`Total percentage mismatch: ${totalPercentage.toFixed(2)}%`);
    }
    
    return {
      preRoundState,
      postRoundState,
      newShares,
      sharePrice,
      valuation: { preMoney, postMoney }
    };
  }
  
  private static processFounderSecondary(
    state: CapTableState,
    secondary: { founderId: string; sharesSold: number; salePrice: number }
  ): CapTableState {
    return {
      ...state,
      founders: state.founders.map(founder => {
        if (founder.id === secondary.founderId) {
          const newShares = Math.max(0, founder.shares - secondary.sharesSold);
          return {
            ...founder,
            shares: newShares,
            percentage: (newShares / state.totalShares) * 100
          };
        }
        return founder;
      })
    };
  }
  
  private static adjustESOPPool(
    state: CapTableState, 
    targetPercent: number, 
    isPreMoney: boolean, 
    newSharesFromRound: number
  ): CapTableState {
    const currentESOPPercent = (state.esop.shares / state.totalShares) * 100;
    
    if (targetPercent <= currentESOPPercent) {
      return state; // No adjustment needed
    }
    
    const additionalESOPPercent = targetPercent - currentESOPPercent;
    let additionalESOPShares: number;
    
    if (isPreMoney) {
      // ESOP dilution happens before the round
      // Calculate additional shares needed to reach target percentage
      additionalESOPShares = Math.round((additionalESOPPercent / (100 - additionalESOPPercent)) * state.totalShares);
      
      // Dilute founders proportionally
      const dilutionFactor = state.totalShares / (state.totalShares + additionalESOPShares);
      state.founders = state.founders.map(founder => ({
        ...founder,
        shares: Math.round(founder.shares * dilutionFactor)
      }));
      
      // Update total shares
      state.totalShares += additionalESOPShares;
    } else {
      // ESOP comes from post-money pool
      const futureShares = state.totalShares + newSharesFromRound;
      additionalESOPShares = Math.round((targetPercent / 100) * futureShares) - state.esop.shares;
    }
    
    return {
      ...state,
      esop: {
        shares: state.esop.shares + additionalESOPShares,
        percentage: targetPercent
      }
    };
  }
  
  static simulateExit(finalState: CapTableState, exitValuation: number): ExitSimulation {
    const founderReturns = finalState.founders.map(founder => ({
      founderId: founder.id,
      name: founder.name,
      finalEquity: founder.percentage,
      cashReturn: (founder.percentage / 100) * exitValuation
    }));
    
    const investorReturns = finalState.investors.map(investor => ({
      investorId: investor.id,
      name: investor.name,
      finalEquity: investor.percentage,
      cashReturn: (investor.percentage / 100) * exitValuation,
      multiple: ((investor.percentage / 100) * exitValuation) / investor.investmentAmount
    }));
    
    const esopValue = (finalState.esop.percentage / 100) * exitValuation;
    
    return {
      exitValuation,
      founderReturns,
      esopValue,
      investorReturns
    };
  }
  
  static validateScenario(scenario: Partial<Scenario>): string[] {
    const errors: string[] = [];
    
    if (!scenario.founders || scenario.founders.length === 0) {
      errors.push('At least one founder is required');
    }
    
    if (scenario.founders && scenario.founders.length > 6) {
      errors.push('Maximum 6 founders allowed');
    }
    
    if (scenario.founders) {
      const totalEquity = scenario.founders.reduce((sum, f) => sum + f.initialEquity, 0) +
                         (scenario.esopPools || []).reduce((sum, e) => sum + e.percentage, 0);
      
      if (Math.abs(totalEquity - 100) > 0.01) {
        errors.push('Total equity must sum to 100%');
      }
      
      // Check for negative equity
      scenario.founders.forEach(founder => {
        if (founder.initialEquity < 0) {
          errors.push(`${founder.name} cannot have negative equity`);
        }
      });
    }
    
    if (scenario.rounds) {
      scenario.rounds.forEach((round, index) => {
        if (round.capitalRaised <= 0) {
          errors.push(`Round ${index + 1}: Capital raised must be positive`);
        }
        
        if (round.type === 'PRICED' && round.pricedTerms?.preMoneyValuation && round.pricedTerms.preMoneyValuation <= 0) {
          errors.push(`Round ${index + 1}: Pre-money valuation must be positive`);
        }
        
        if (round.type === 'SAFE') {
          if (!round.safeTerms?.valuationCap && !round.safeTerms?.discount) {
            errors.push(`Round ${index + 1}: SAFE must have either valuation cap or discount`);
          }
        }
      });
    }
    
    return errors;
  }
  
  // Helper method to calculate share price for a given valuation and shares
  static calculateSharePrice(valuation: number, totalShares: number): number {
    return valuation / totalShares;
  }
  
  // Helper method to calculate dilution percentage
  static calculateDilution(oldShares: number, newTotalShares: number): number {
    const newPercentage = (oldShares / newTotalShares) * 100;
    const oldPercentage = 100; // Assuming we're calculating from 100% ownership
    return oldPercentage - newPercentage;
  }
}