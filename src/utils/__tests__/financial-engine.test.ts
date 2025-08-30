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

describe('FinancialEngine', () => {
  describe('Initial State Creation', () => {
    it('should create correct initial state for two founders', () => {
      const scenario = createTestScenario([
        { initialEquity: 60 },
        { initialEquity: 40 }
      ]);
      
      const states = FinancialEngine.calculateCapTable(scenario);
      expect(states).toHaveLength(1);
      
      const initial = states[0];
      expect(initial.totalShares).toBe(10_000_000);
      expect(initial.founders[0].percentage).toBe(60);
      expect(initial.founders[1].percentage).toBe(40);
      expect(initial.founders[0].shares).toBe(6_000_000);
      expect(initial.founders[1].shares).toBe(4_000_000);
    });
    
    it('should handle ESOP pool at incorporation', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 70 }, { initialEquity: 20 }],
        [],
        [{ percentage: 10, isPreMoney: true }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const initial = states[0];
      
      expect(initial.founders[0].percentage).toBe(70);
      expect(initial.founders[1].percentage).toBe(20);
      expect(initial.esop.percentage).toBe(10);
      expect(initial.esop.shares).toBe(1_000_000);
    });
  });
  
  describe('Single Priced Round, No ESOP', () => {
    it('should handle single priced round correctly', () => {
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
      
      // Share price should be $0.40 (4M pre-money / 10M shares)
      // New shares: 1M / $0.40 = 2.5M shares
      // Total shares: 10M + 2.5M = 12.5M
      // Founder: 10M / 12.5M = 80%
      // Investor: 2.5M / 12.5M = 20%
      
      expect(postRound.founders[0].percentage).toBeCloseTo(80, 1);
      expect(postRound.investors[0].percentage).toBeCloseTo(20, 1);
      expect(postRound.totalShares).toBe(12_500_000);
    });
  });
  
  describe('Priced Round with Pre-Money ESOP Top-up', () => {
    it('should handle priced round with pre-money ESOP top-up', () => {
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
      
      // Should have ESOP pool and diluted founders
      expect(postRound.esop.percentage).toBeCloseTo(15, 1);
      expect(postRound.founders[0].percentage).toBeLessThan(90);
      expect(postRound.founders[1].percentage).toBeLessThan(10);
    });
  });
  
  describe('SAFE (Cap Only), Then Priced Round', () => {
    it('should handle SAFE with valuation cap', () => {
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
      
      // Share price at cap: 5M / 10M = $0.50
      // New shares: 500K / $0.50 = 1M shares
      // Total: 11M shares
      // Founder: 10M / 11M = ~90.9%
      // Investor: 1M / 11M = ~9.1%
      
      expect(postRound.founders[0].percentage).toBeCloseTo(90.9, 1);
      expect(postRound.investors[0].percentage).toBeCloseTo(9.1, 1);
    });
  });
  
  describe('SAFE (Discount Only), Then Priced Round', () => {
    it('should handle SAFE with discount only', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [{
          type: 'SAFE',
          capitalRaised: 250_000,
          safeTerms: { discount: 20, valuationCap: 10_000_000 }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const postRound = states[1];
      
      // Cap price: 10M / 10M = $1.00
      // Discount price: $1.00 * (1 - 0.20) = $0.80
      // Uses discount price since it's better for investor
      // New shares: 250K / $0.80 = 312,500 shares
      
      expect(postRound.totalShares).toBe(10_312_500);
      expect(postRound.founders[0].percentage).toBeCloseTo(97.0, 1);
    });
  });
  
  describe('Mixed SAFEs (Cap + Discount), Then Priced Round', () => {
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
      
      // Cap price: 6M / 10M = $0.60
      // Discount price: $0.60 * (1 - 0.25) = $0.45
      // Uses discount price (better for investor)
      // New shares: 300K / $0.45 = 666,667 shares
      
      expect(postRound.totalShares).toBe(10_666_667);
      expect(postRound.founders[0].percentage).toBeCloseTo(93.75, 1);
    });
  });
  
  describe('Round with Founder Secondary', () => {
    it('should handle founder secondary sale', () => {
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
      
      // Founder should have fewer shares due to secondary sale
      expect(postRound.founders[0].shares).toBe(9_000_000); // 10M - 1M sold
      expect(postRound.founders[0].percentage).toBeCloseTo(81.8, 1); // 9M / 11M
    });
  });
  
  describe('Multi-Round Scenario with ESOP Top-ups', () => {
    it('should handle multiple rounds with pre and post money ESOP adjustments', () => {
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
      
      const finalState = states[2];
      
      // Should have ESOP pool from both adjustments
      expect(finalState.esop.percentage).toBeCloseTo(15, 1);
      expect(finalState.founders.length).toBe(2);
      expect(finalState.investors.length).toBe(2);
    });
  });
  
  describe('Exit Simulation', () => {
    it('should calculate correct exit returns', () => {
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
  });
  
  describe('Validation', () => {
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
  });
  
  describe('Edge Cases', () => {
    it('should handle zero ESOP pool', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 100 }],
        [],
        []
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const initial = states[0];
      
      expect(initial.esop.shares).toBe(0);
      expect(initial.esop.percentage).toBe(0);
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
    
    it('should handle rounding correctly', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 33.33 }, { initialEquity: 33.33 }, { initialEquity: 33.34 }],
        [{
          type: 'PRICED',
          capitalRaised: 333_333,
          pricedTerms: { preMoneyValuation: 3_333_333, sharePrice: 0 }
        }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      const postRound = states[1];
      
      // Should handle fractional shares by rounding
      expect(Number.isInteger(postRound.totalShares)).toBe(true);
      postRound.founders.forEach(founder => {
        expect(Number.isInteger(founder.shares)).toBe(true);
      });
    });
  });
  
  describe('Complex Multi-Round Scenarios', () => {
    it('should handle complex scenario with all features', () => {
      const scenario = createTestScenario(
        [{ initialEquity: 60 }, { initialEquity: 30 }],
        [
          {
            type: 'SAFE',
            capitalRaised: 250_000,
            safeTerms: { valuationCap: 3_000_000, discount: 20 }
          },
          {
            type: 'SAFE',
            capitalRaised: 500_000,
            safeTerms: { valuationCap: 8_000_000 }
          },
          {
            type: 'PRICED',
            capitalRaised: 5_000_000,
            pricedTerms: { preMoneyValuation: 25_000_000, sharePrice: 0 },
            esopAdjustment: { newPoolPercentage: 12, isPreMoney: true },
            founderSecondary: {
              founderId: 'founder-0',
              sharesSold: 500_000,
              salePrice: 2.50
            }
          }
        ],
        [{ percentage: 10, isPreMoney: true }]
      );
      
      const states = FinancialEngine.calculateCapTable(scenario);
      expect(states).toHaveLength(4);
      
      const finalState = states[3];
      
      // Should have all stakeholders
      expect(finalState.founders.length).toBe(2);
      expect(finalState.investors.length).toBe(3); // 2 SAFEs + 1 priced
      expect(finalState.esop.percentage).toBeCloseTo(12, 1);
      
      // Total should equal 100%
      const totalPercentage = finalState.founders.reduce((sum, f) => sum + f.percentage, 0) +
                             finalState.esop.percentage +
                             finalState.investors.reduce((sum, i) => sum + i.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0.1);
    });
  });
  
  describe('Performance Tests', () => {
    it('should calculate large scenarios quickly', () => {
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