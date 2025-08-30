import { describe, it, expect } from 'vitest';
import { FinancialEngine } from '../financial-engine';
import { Scenario, Founder, FundingRound, ESOPPool } from '../../types/financial';

const createTestScenario = (
  founders: Partial<Founder>[],
  rounds: Partial<FundingRound>[] = [],
  esopPools: Partial<ESOPPool>[] = []
): Scenario => ({
  id: 'test-scenario',
  name: 'Test Scenario',
  founders: founders.map((f, i) => ({
    id: f.id || `founder-${i}`,
    name: f.name || `Founder ${i + 1}`,
    initialEquity: f.initialEquity || 0,
    currentEquity: f.currentEquity || f.initialEquity || 0,
    shares: f.shares || 0,
    ...f
  })),
  rounds: rounds.map((r, i) => ({
    id: r.id || `round-${i}`,
    name: r.name || `Round ${i + 1}`,
    type: r.type || 'PRICED',
    capitalRaised: r.capitalRaised || 0,
    timestamp: r.timestamp || new Date(),
    ...r
  })),
  esopPools: esopPools.map((e, i) => ({
    id: e.id || `esop-${i}`,
    percentage: e.percentage || 0,
    shares: e.shares || 0,
    isPreMoney: e.isPreMoney !== undefined ? e.isPreMoney : true,
    ...e
  })),
  totalShares: 10_000_000,
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('FinancialEngine - Required Test Cases', () => {
  
  describe('1. Single priced round, no ESOP', () => {
    it('should correctly calculate single priced round with no ESOP', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{
          type: 'PRICED',
          capitalRaised: 1_000_000,
          pricedTerms: { preMoneyValuation: 4_000_000, sharePrice: 0 }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      expect(states).toHaveLength(2);
      
      const postRound = states[1];
      
      // Share price: $4M / 10M shares = $0.40
      // New shares: $1M / $0.40 = 2.5M shares
      // Total shares: 10M + 2.5M = 12.5M
      // Founder: 10M / 12.5M = 80%
      // Investor: 2.5M / 12.5M = 20%
      
      expect(postRound.totalShares).toBe(12_500_000);
      expect(postRound.founders[0].percentage).toBeCloseTo(80, 1);
      expect(postRound.investors[0].percentage).toBeCloseTo(20, 1);
      expect(postRound.esop.shares).toBe(0);
    });
  });

  describe('2. Priced round with pre-money ESOP top-up', () => {
    it('should handle priced round with pre-money ESOP top-up correctly', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 90 }, { initialEquity: 10 }],
        [{
          type: 'PRICED',
          capitalRaised: 2_000_000,
          pricedTerms: { preMoneyValuation: 8_000_000, sharePrice: 0 },
          esopAdjustment: { newPoolPercentage: 15, isPreMoney: true }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const postRound = states[1];
      
      // Pre-money ESOP dilutes founders before investment
      expect(postRound.esop.percentage).toBeCloseTo(15, 1);
      expect(postRound.founders[0].percentage).toBeLessThan(90);
      expect(postRound.founders[1].percentage).toBeLessThan(10);
      
      // Total should still equal 100%
      const totalPercentage = postRound.founders.reduce((sum, f) => sum + f.percentage, 0) +
                             postRound.esop.percentage +
                             postRound.investors.reduce((sum, i) => sum + i.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0.1);
    });
  });

  describe('3. SAFE (cap only), then priced round', () => {
    it('should handle SAFE with valuation cap only', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{
          type: 'SAFE',
          capitalRaised: 500_000,
          safeTerms: { valuationCap: 5_000_000 }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const postRound = states[1];
      
      // Share price at cap: $5M / 10M shares = $0.50
      // New shares: $500K / $0.50 = 1M shares
      // Total shares: 10M + 1M = 11M
      // Founder: 10M / 11M = ~90.9%
      // Investor: 1M / 11M = ~9.1%
      
      expect(postRound.totalShares).toBe(11_000_000);
      expect(postRound.founders[0].percentage).toBeCloseTo(90.9, 1);
      expect(postRound.investors[0].percentage).toBeCloseTo(9.1, 1);
    });
  });

  describe('4. SAFE (discount only), then priced round', () => {
    it('should handle SAFE with discount only', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{
          type: 'SAFE',
          capitalRaised: 250_000,
          safeTerms: { discount: 20 }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const postRound = states[1];
      
      // With discount only, uses assumed price with discount
      // Assumed price: $1.00, discount price: $1.00 * (1 - 0.20) = $0.80
      // New shares: $250K / $0.80 = 312,500 shares
      
      expect(postRound.totalShares).toBe(10_312_500);
      expect(postRound.founders[0].percentage).toBeCloseTo(97.0, 1);
      expect(postRound.investors[0].percentage).toBeCloseTo(3.0, 1);
    });
  });

  describe('5. Mixed SAFEs (cap+discount), then priced round', () => {
    it('should handle SAFE with both cap and discount', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{
          type: 'SAFE',
          capitalRaised: 300_000,
          safeTerms: { valuationCap: 6_000_000, discount: 25 }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const postRound = states[1];
      
      // Cap price: $6M / 10M = $0.60
      // Discount price: $0.60 * (1 - 0.25) = $0.45
      // Uses discount price (better for investor)
      // New shares: $300K / $0.45 = 666,667 shares
      
      expect(postRound.totalShares).toBe(10_666_667);
      expect(postRound.founders[0].percentage).toBeCloseTo(93.75, 1);
      expect(postRound.investors[0].percentage).toBeCloseTo(6.25, 1);
    });
  });

  describe('6. Round with founder secondary', () => {
    it('should handle founder secondary sale correctly', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{
          type: 'PRICED',
          capitalRaised: 1_000_000,
          pricedTerms: { preMoneyValuation: 9_000_000, sharePrice: 0 },
          founderSecondary: {
            founderId: 'founder-0',
            sharesSold: 1_000_000,
            salePrice: 0.90
          }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const postRound = states[1];
      
      // Founder sells 1M shares, keeps 9M shares
      // Share price: $9M / 10M = $0.90
      // New shares from investment: $1M / $0.90 = 1,111,111 shares
      // Total shares: 10M + 1,111,111 = 11,111,111
      // Founder: 9M / 11,111,111 = ~81%
      
      expect(postRound.founders[0].shares).toBe(9_000_000);
      expect(postRound.founders[0].percentage).toBeCloseTo(81, 1);
      expect(postRound.totalShares).toBe(11_111_111);
    });
  });

  describe('7. Multi-round scenario with ESOP top-ups pre and post', () => {
    it('should handle multiple rounds with both pre and post money ESOP adjustments', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 80 }, { initialEquity: 20 }],
        [
          {
            type: 'SAFE',
            capitalRaised: 500_000,
            safeTerms: { valuationCap: 5_000_000 },
            esopAdjustment: { newPoolPercentage: 10, isPreMoney: true }
          },
          {
            type: 'PRICED',
            capitalRaised: 3_000_000,
            pricedTerms: { preMoneyValuation: 15_000_000, sharePrice: 0 },
            esopAdjustment: { newPoolPercentage: 15, isPreMoney: false }
          }
        ]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      expect(states).toHaveLength(3);
      
      const afterSafe = states[1];
      const finalState = states[2];
      
      // After SAFE: should have 10% ESOP (pre-money)
      expect(afterSafe.esop.percentage).toBeCloseTo(10, 1);
      
      // After priced round: should have 15% ESOP (post-money)
      expect(finalState.esop.percentage).toBeCloseTo(15, 1);
      
      // Should have 2 founders and 2 investors
      expect(finalState.founders.length).toBe(2);
      expect(finalState.investors.length).toBe(2);
      
      // Total should equal 100%
      const totalPercentage = finalState.founders.reduce((sum, f) => sum + f.percentage, 0) +
                             finalState.esop.percentage +
                             finalState.investors.reduce((sum, i) => sum + i.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0.1);
    });
  });

  describe('Additional Edge Cases and Validation', () => {
    it('should validate equity allocation', () => {
      const scenario = createTestScenario([
        { initialEquity: 60 },
        { initialEquity: 50 } // Totals to 110%
      ]);
      
      const errors = FinancialEngine.validateScenario(scenario);
      expect(errors).toContain('Total equity must sum to 100%');
    });
    
    it('should require at least one founder', () => {
      const scenario = createTestScenario([]);
      
      const errors = FinancialEngine.validateScenario(scenario);
      expect(errors).toContain('At least one founder is required');
    });
    
    it('should limit founders to maximum 6', () => {
      const scenario = createTestScenario(Array(7).fill({ initialEquity: 14.3 }));
      
      const errors = FinancialEngine.validateScenario(scenario);
      expect(errors).toContain('Maximum 6 founders allowed');
    });
    
    it('should validate positive capital raised', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{ capitalRaised: -1000 }]
      );
      
      const errors = FinancialEngine.validateScenario(scenario);
      expect(errors).toContain('Round 1: Capital raised must be positive');
    });
    
    it('should validate SAFE terms', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{
          type: 'SAFE',
          capitalRaised: 500_000,
          safeTerms: {} // No cap or discount
        }]
      );
      
      const errors = FinancialEngine.validateScenario(scenario);
      expect(errors).toContain('Round 1: SAFE must have either valuation cap or discount');
    });

    it('should maintain share count integrity across rounds', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 50 }, { initialEquity: 50 }],
        [
          {
            type: 'PRICED',
            capitalRaised: 1_000_000,
            pricedTerms: { preMoneyValuation: 5_000_000, sharePrice: 0 }
          },
          {
            type: 'PRICED',
            capitalRaised: 5_000_000,
            pricedTerms: { preMoneyValuation: 20_000_000, sharePrice: 0 }
          }
        ]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      
      // Check that share counts are consistent
      states.forEach(state => {
        const totalCalculated = state.founders.reduce((sum, f) => sum + f.shares, 0) +
                               state.esop.shares +
                               state.investors.reduce((sum, i) => sum + i.shares, 0);
        expect(totalCalculated).toBe(state.totalShares);
      });
    });

    it('should handle exit simulation correctly', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 60 }, { initialEquity: 40 }],
        [{
          type: 'PRICED',
          capitalRaised: 2_000_000,
          pricedTerms: { preMoneyValuation: 8_000_000, sharePrice: 0 }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const finalState = states[states.length - 1];
      const simulation = FinancialEngine.simulateExit(finalState, 100_000_000);
      
      expect(simulation.exitValuation).toBe(100_000_000);
      expect(simulation.founderReturns).toHaveLength(2);
      
      // Check that founder returns match their equity percentages
      const founder1Return = simulation.founderReturns[0];
      const expectedReturn = (founder1Return.finalEquity / 100) * 100_000_000;
      expect(founder1Return.cashReturn).toBeCloseTo(expectedReturn, 0);
    });

    it('should handle performance requirements', () => {
      const scenario = createTestScenario(
        Array(6).fill(null).map((_, i) => ({ initialEquity: 16.67 })),
        Array(8).fill(null).map((_, i) => ({
          type: 'PRICED' as const,
          capitalRaised: (i + 1) * 1_000_000,
          pricedTerms: { preMoneyValuation: (i + 1) * 10_000_000, sharePrice: 0 }
        }))
      );
      
      const startTime = performance.now();
      const states = FinancialEngine.calculateCapTable(scenario);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // Under 200ms
      expect(states).toHaveLength(9); // Initial + 8 rounds
    });
  });
});
