# Startup Value Simulator

A comprehensive cap table modeling and exit simulation tool for startup founders. Model funding scenarios, track equity dilution across rounds, and calculate potential returns at exit.

## Features

### Core Functionality
- **Scenario Builder**: Create and manage multiple cap table scenarios
- **Multi-Round Modeling**: Support for SAFE notes and priced equity rounds
- **Real-Time Calculations**: Instant updates to ownership percentages and valuations
- **Exit Simulation**: Calculate potential returns for founders, employees, and investors
- **Visual Analytics**: Charts showing ownership evolution and exit distributions
- **Audit Trail**: Detailed round-by-round calculations with full transparency

### Advanced Features
- **ESOP Pool Management**: Pre-money and post-money ESOP pool creation and top-ups
- **SAFE Note Conversion**: Handles valuation caps, discounts, and MFN provisions
- **Founder Secondary Sales**: Model partial liquidity events for founders
- **Scenario Sharing**: Share scenarios via URL for team collaboration
- **Responsive Design**: Optimized for mobile, tablet, and desktop

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library
- **Database**: Supabase (ready for integration)

## Financial Engine

The core financial calculations handle:

### Priced Rounds
- Pre-money and post-money valuation scenarios
- Share price calculations based on valuation and outstanding shares
- New share issuance and dilution effects
- Pro-rata calculations for existing investors

### SAFE Notes
- Valuation cap conversion at better of cap or next round price
- Discount application (typically 10-25%)
- Most Favored Nation (MFN) clause handling
- Automatic conversion during priced rounds

### ESOP Pool Management
- Pre-money pool creation (dilutes existing shareholders)
- Post-money pool creation (comes out of new investment)
- Pool top-ups across multiple rounds
- Employee allocation tracking

### Exit Calculations
- Cash distribution based on final ownership percentages
- Liquidation preference modeling (coming soon)
- Multiple calculations for investors
- Total return analysis for all stakeholders

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run
```

## Testing Guide

The Startup Value Simulator includes comprehensive test coverage for all financial calculations. This ensures accuracy and reliability of cap table modeling across various funding scenarios.

### Running Tests

#### 1. Interactive Test Mode (Recommended)
```bash
npm test
```
This starts Vitest in watch mode, automatically re-running tests when files change. Perfect for development and debugging.

#### 2. Visual Test Interface
```bash
npm run test:ui
```
Opens a web-based test interface at `http://localhost:51204` where you can:
- View test results in a visual dashboard
- See detailed test coverage reports
- Debug failing tests with interactive tools
- Filter and search through test cases

#### 3. Single Test Run (CI/CD)
```bash
npm run test:run
```
Runs all tests once and exits. Used for continuous integration and final validation.

### Test Coverage Areas

#### Core Financial Engine Tests (`src/utils/__tests__/financial-engine.test.ts`)

**Required Test Cases (All Implemented):**

1. **Single Priced Round, No ESOP**
   - Tests basic pre-money valuation calculations
   - Verifies share price computation: `pre-money ÷ existing shares`
   - Validates dilution: `new shares ÷ total shares`
   - **Expected Result**: 80% founder, 20% investor for $1M on $4M pre-money

2. **Priced Round with Pre-Money ESOP Top-Up**
   - Tests ESOP pool creation before investment
   - Verifies founders get diluted by ESOP expansion
   - Validates total percentages sum to 100%
   - **Expected Result**: ESOP dilutes founders before new investment

3. **SAFE (Cap Only) Conversion**
   - Tests valuation cap conversion logic
   - Verifies share price calculation at cap
   - Validates proper equity allocation
   - **Expected Result**: $500K at $5M cap = 9.1% investor equity

4. **SAFE (Discount Only) Conversion**
   - Tests discount application without cap
   - Uses assumed $1.00 share price with discount
   - Validates conversion mathematics
   - **Expected Result**: 20% discount gives investor better price

5. **Mixed SAFE (Cap + Discount)**
   - Tests choosing better price for investor
   - Compares cap price vs discount price
   - Uses lower price (better for investor)
   - **Expected Result**: Investor gets better of cap or discount price

6. **Founder Secondary Sale**
   - Tests founder selling existing shares
   - Verifies no new shares created
   - Validates ownership transfer mechanics
   - **Expected Result**: Founder equity reduces, no dilution to others

7. **Multi-Round with Pre/Post ESOP**
   - Tests complex scenario with multiple adjustments
   - Verifies ESOP timing effects (pre vs post money)
   - Validates cumulative dilution calculations
   - **Expected Result**: Proper ESOP allocation across rounds

#### Validation Tests
- **Equity Allocation**: Must sum to 100%
- **Founder Requirements**: At least 1, maximum 6 founders
- **Positive Values**: All investments must be positive
- **SAFE Terms**: Must have cap or discount
- **Performance**: Sub-200ms calculation time

### Checking Test Results

#### 1. Command Line Output
When running `npm test`, you'll see:
```
✓ Single priced round, no ESOP (2ms)
✓ Priced round with pre-money ESOP top-up (1ms)
✓ SAFE (cap only), then priced round (1ms)
✓ SAFE (discount only), then priced round (1ms)
✓ Mixed SAFEs (cap+discount), then priced round (1ms)
✓ Round with founder secondary (1ms)
✓ Multi-round scenario with ESOP top-ups pre and post (2ms)

Test Files  1 passed (1)
Tests  15 passed (15)
```

#### 2. Visual Test Interface
Access `npm run test:ui` to see:
- **Green checkmarks** ✅ for passing tests
- **Red X marks** ❌ for failing tests
- **Test execution time** for performance validation
- **Coverage reports** showing code coverage percentages
- **Interactive debugging** for failed tests

#### 3. Test Failure Debugging
If tests fail, you'll see:
- **Expected vs Actual values** for assertions
- **Stack traces** pointing to exact failure locations
- **Diff views** showing what went wrong
- **Re-run buttons** to test fixes immediately

### Interpreting Financial Test Results

#### Percentage Calculations
- All percentages rounded to 2 decimal places for display
- Calculations use `toBeCloseTo(expected, 1)` for 0.1% tolerance
- Share counts maintained as integers (no fractional shares)

#### Dilution Validation
- **Founder dilution** = Initial equity - Final equity
- **Investor equity** = New shares ÷ Total shares × 100
- **Total equity** must always equal 100% ± 0.1%

#### SAFE Conversion Logic
- **Cap price** = Valuation cap ÷ Existing shares
- **Discount price** = Cap price × (1 - discount%)
- **Conversion price** = Lower of cap price or discount price (better for investor)

#### Performance Benchmarks
- **Calculation time**: Must be under 200ms for scenarios with up to 15 rounds
- **Memory usage**: Optimized for large cap tables
- **Accuracy**: All financial calculations verified against real-world scenarios

### Test Data Validation

Each test case includes:
- **Input validation**: Ensures test data is realistic
- **Calculation verification**: Confirms mathematical accuracy
- **Edge case handling**: Tests boundary conditions
- **Error scenarios**: Validates proper error handling

### Continuous Testing

The test suite runs automatically when:
- Files are saved during development (`npm test` watch mode)
- Code is committed (if CI/CD is configured)
- Deployment is triggered (validates before publishing)

This ensures the financial engine maintains accuracy and reliability across all development cycles.

### Building

```bash
npm run build
```

## Financial Assumptions

### Default Settings
- **Initial Shares**: 10,000,000 (10M authorized shares)
- **Share Classes**: Common stock only (preferred coming soon)
- **Liquidation Preferences**: 1x non-participating (participating coming soon)
- **Anti-Dilution**: Weighted average broad-based (coming soon)

### Calculation Methodology
- All percentages rounded to 2 decimal places for display
- Share counts maintained as integers to prevent fractional shares
- Dilution calculated based on new shares issued vs. total outstanding
- SAFE conversion uses max(cap_price, discount_price) for investor benefit

### Validation Rules
- Total equity allocation must equal 100% at scenario creation
- All funding amounts must be positive
- ESOP pools cannot exceed 50% (industry best practice)
- Founder equity cannot go negative after dilution

## Architecture

### Component Structure
```
src/
├── components/          # React components
│   ├── ScenarioBuilder.tsx
│   ├── RoundBuilder.tsx
│   ├── CapTableView.tsx
│   ├── ExitSimulator.tsx
│   ├── OwnershipChart.tsx
│   └── AuditTrail.tsx
├── store/              # Zustand state management
│   └── scenario-store.ts
├── types/              # TypeScript definitions
│   └── financial.ts
├── utils/              # Financial calculations
│   ├── financial-engine.ts
│   └── __tests__/
└── test/               # Test configuration
```

### Financial Engine Design
- **Pure Functions**: All calculations are side-effect free
- **Immutable State**: No mutation of input data
- **Type Safety**: Full TypeScript coverage for financial models
- **Error Handling**: Comprehensive validation and error reporting
- **Performance**: Optimized for sub-200ms calculation times

## Testing Strategy

### Unit Tests
- **Financial Engine**: 95%+ coverage of calculation logic
- **Validation**: All edge cases and error conditions
- **State Management**: Store actions and computed values
- **Component Logic**: Critical user interactions

### Test Cases Covered
- Single priced round scenarios
- Multiple round dilution effects
- SAFE note conversions (cap and discount)
- ESOP pool adjustments (pre/post money)
- Founder secondary sale transactions
- Complex multi-round scenarios
- Edge cases and error conditions

### Performance Testing
- Sub-200ms calculation time for scenarios with up to 15 rounds
- Memory usage optimization for large cap tables
- UI responsiveness under load

## Deployment

The application is ready for deployment to:
- **Vercel** (recommended): Zero-config deployment
- **Netlify**: Static site hosting
- **Bolt Hosting**: Integrated hosting solution

### Environment Setup
```bash
# Development
cp .env.example .env.local
# Add Supabase credentials when ready
```

## Contributing

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Consistent code formatting
- **File Organization**: Maximum 200 lines per file

### Adding Features
1. Create feature branch
2. Add comprehensive tests
3. Update documentation
4. Submit pull request with demo

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and planning purposes only. All financial calculations should be reviewed by qualified professionals before making investment decisions. The authors are not responsible for any financial decisions made based on this tool's output.