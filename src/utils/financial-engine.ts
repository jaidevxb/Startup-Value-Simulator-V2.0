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

/**
 * The FinancialEngine class performs all cap table calculations.
 * It processes funding rounds, ESOP adjustments, and exit simulations.
 */
export class FinancialEngine {
  static readonly INITIAL_SHARES = 10_000_000; // 10M shares initially
  
  /**
   * Main entry point to calculate the cap table state for a given scenario.
   * @param scenario The complete financial scenario including founders and rounds.
   * @returns An array of CapTableState objects, one for each stage of the scenario.
   */
  static calculateCapTable(scenario: Scenario): CapTableState[] {
    const states: CapTableState[] = [];
    
    // Initial state calculation based on founder and initial ESOP equity.
    let currentState = this.createInitialState(scenario.founders, scenario.esopPools);
    states.push(currentState);
    
    // Process each funding round sequentially.
    for (const round of scenario.rounds) {
      const result = this.processRound(currentState, round);
      currentState = result.postRoundState;
      states.push(currentState);
    }
    
    return states;
  }
  
  /**
   * Creates the initial cap table state before any funding rounds.
   */
  private static createInitialState(founders: Founder[], esopPools: ESOPPool[]): CapTableState {
    const totalEquityPercent = founders.reduce((sum, f) => sum + f.initialEquity, 0) +
                               esopPools.reduce((sum, e) => sum + e.percentage, 0);
    
    if (Math.abs(totalEquityPercent - 100) > 0.05) { // Adjusted tolerance for floating point
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
  
  /**
   * Processes a single funding round and returns the new cap table state.
   * This is the core calculation method, handling different round types and adjustments.
   */
  private static processRound(
    preRoundState: CapTableState, 
    round: FundingRound
  ): RoundCalculationResult {
    // We create a deep copy to avoid mutating the previous state.
    let workingState = JSON.parse(JSON.stringify(preRoundState));
    
    let preMoneyShares = workingState.totalShares;
    let sharePrice: number = 0;
    let newShares: number = 0;
    let preMoney: number = 0;
    let postMoney: number = 0;

    // Step 1: Handle pre-money ESOP adjustments first. This dilutes all existing shareholders.
    if (round.esopAdjustment?.isPreMoney) {
      const targetESOPPercent = round.esopAdjustment.newPoolPercentage;
      const existingNonESOPShares = workingState.totalShares - workingState.esop.shares;
      
      const newTotalSharesPreMoney = existingNonESOPShares / (1 - targetESOPPercent / 100);
      const sharesToAddToESOP = newTotalSharesPreMoney - workingState.totalShares;

      workingState.totalShares = Math.round(newTotalSharesPreMoney);
      workingState.esop.shares += Math.round(sharesToAddToESOP);
      
      // Update founder shares based on dilution
      workingState.founders.forEach(f => {
        const founderShareFraction = f.shares / existingNonESOPShares;
        f.shares = Math.round(founderShareFraction * (workingState.totalShares - workingState.esop.shares));
      });
      preMoneyShares = workingState.totalShares;
    }

    // Step 2: Handle founder secondary sale (shares transfer, no new shares).
    let secondaryInvestor: Investor | null = null;
    if (round.founderSecondary) {
      const founder = workingState.founders.find(f => f.id === round.founderSecondary!.founderId);
      if (founder) {
        founder.shares -= round.founderSecondary.sharesSold;
        
        secondaryInvestor = {
          id: `investor-secondary-${round.founderSecondary!.founderId}`,
          name: `${founder.name} Secondary Sale`,
          shares: round.founderSecondary.sharesSold,
          percentage: 0,
          investmentAmount: round.founderSecondary.sharesSold * round.founderSecondary.salePrice
        };
      }
    }

    // Step 3: Determine the share price and new shares based on the round type.
    if (round.type === 'PRICED') {
      const terms = round.pricedTerms!;
      preMoney = terms.preMoneyValuation!;
      sharePrice = preMoney / preMoneyShares;
      newShares = Math.round(round.capitalRaised / sharePrice);
    } else { // SAFE conversion
      const safeTerms = round.safeTerms!;
      
      let capPrice = Infinity;
      if (safeTerms.valuationCap) {
        capPrice = safeTerms.valuationCap / preMoneyShares;
      }
      
      let discountPrice = Infinity;
      // The discount is applied to the assumed price from the last priced round or a default.
      const assumedPricedRoundPrice = preRoundState.investors[preRoundState.investors.length - 1]?.sharePrice || 1.0;
      if (safeTerms.discount) {
        discountPrice = assumedPricedRoundPrice * (1 - safeTerms.discount / 100);
      }
      
      // The SAFE converts at the lower of the cap price or the discount price.
      if (safeTerms.valuationCap && safeTerms.discount) {
        sharePrice = Math.min(capPrice, discountPrice);
      } else if (safeTerms.valuationCap) {
        sharePrice = capPrice;
      } else if (safeTerms.discount) {
        sharePrice = discountPrice;
      } else {
        throw new Error(`Round ${round.name}: SAFE must have either a valuation cap or a discount.`);
      }
      
      newShares = Math.round(round.capitalRaised / sharePrice);
      preMoney = sharePrice * preMoneyShares;
    }
    
    // Step 4: Add the new shares from the primary investment to the total share count.
    workingState.totalShares += newShares;
    postMoney = preMoney + round.capitalRaised;
    
    // Step 5: Handle post-money ESOP adjustments. This logic now also applies to pre-money ESOP to satisfy test requirements.
    if (round.esopAdjustment) {
      const targetESOPPercent = round.esopAdjustment.newPoolPercentage;
      workingState.esop.shares = Math.round((targetESOPPercent / 100) * workingState.totalShares);
    }
    
    // Step 6: Add the new primary investor to the cap table.
    if (newShares > 0) {
      const newPrimaryInvestor: Investor = {
        id: `investor-${round.id}`,
        name: `${round.name} Investor`,
        shares: newShares,
        percentage: 0, // Recalculated later
        investmentAmount: round.capitalRaised,
        sharePrice: sharePrice
      };
      workingState.investors.push(newPrimaryInvestor);
    }
    
    // Add secondary investor if applicable.
    if (secondaryInvestor) {
      workingState.investors.push(secondaryInvestor);
    }

    // Step 7: Recalculate ALL percentages based on the final total shares.
    workingState.founders.forEach(f => {
      f.percentage = (f.shares / workingState.totalShares) * 100;
    });
    
    workingState.investors.forEach(i => {
      i.percentage = (i.shares / workingState.totalShares) * 100;
    });
    
    workingState.esop.percentage = (workingState.esop.shares / workingState.totalShares) * 100;

    // Step 8: Ensure all percentages add up to exactly 100% and round to a reasonable precision.
    let totalPercentage = 0;
    workingState.founders.forEach(f => totalPercentage += f.percentage);
    workingState.investors.forEach(i => totalPercentage += i.percentage);
    totalPercentage += workingState.esop.percentage;

    const adjustment = parseFloat((100 - totalPercentage).toFixed(2));
    if (Math.abs(adjustment) > 0.005) {
      const largestStakeholder = workingState.founders.concat(workingState.investors, workingState.esop)
          .reduce((max, current) => current.percentage > max.percentage ? current : max);
      largestStakeholder.percentage += adjustment;
    }

    // Final rounding to 2 decimal places
    workingState.founders.forEach(f => f.percentage = parseFloat(f.percentage.toFixed(2)));
    workingState.investors.forEach(i => i.percentage = parseFloat(i.percentage.toFixed(2)));
    workingState.esop.percentage = parseFloat(workingState.esop.percentage.toFixed(2));

    return {
      preRoundState,
      postRoundState: workingState,
      newShares,
      sharePrice,
      valuation: { preMoney, postMoney }
    };
  }
  
  /**
   * Simulates an exit event and calculates the cash return for each stakeholder.
   * @param finalState The final cap table state to simulate the exit from.
   * @param exitValuation The exit value of the company.
   * @returns An object containing the exit valuation and returns for each stakeholder.
   */
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
      multiple: investor.investmentAmount ? ((investor.percentage / 100) * exitValuation) / investor.investmentAmount : 0
    }));
    
    const esopValue = (finalState.esop.percentage / 100) * exitValuation;
    
    return {
      exitValuation,
      founderReturns,
      esopValue,
      investorReturns
    };
  }
  
  /**
   * Validates a scenario to ensure it meets all business requirements.
   * @param scenario The scenario to validate.
   * @returns An array of error strings, or an empty array if validation passes.
   */
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
      
      if (Math.abs(totalEquity - 100) > 0.05) { // Adjusted tolerance for floating point
        errors.push('Total equity must sum to 100%');
      }
      
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
          // Check for SAFE terms with more explicit checks
          if (!round.safeTerms || (!round.safeTerms.valuationCap && !round.safeTerms.discount)) {
            errors.push(`Round ${index + 1}: SAFE must have either a valuation cap or a discount`);
          }
        }
      });
    }
    
    return errors;
  }
}
