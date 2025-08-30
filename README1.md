# Startup Value Simulator - User Guide

Welcome to the Startup Value Simulator! This tool helps startup founders model their cap table across multiple funding rounds and calculate potential returns at exit. Whether you're planning your first funding round or modeling a path to IPO, this simulator provides professional-grade financial calculations in an easy-to-use interface.

## What is a Cap Table?

A **capitalization table (cap table)** shows who owns what percentage of your company. It tracks:
- **Founders**: The people who started the company and their equity stakes
- **Employees**: Staff who receive stock options through an ESOP (Employee Stock Ownership Plan)
- **Investors**: People or firms who invested money in exchange for equity

As you raise funding, new investors get shares, which **dilutes** (reduces) everyone else's ownership percentage. This tool helps you understand how much dilution to expect and what your equity will be worth at exit.

## Getting Started

### 1. Create Your First Scenario

Click **"Create New Scenario"** to start modeling your startup:

**Scenario Name**: Give your scenario a descriptive name like "Conservative Growth" or "Aggressive Expansion"

**Add Founders**: 
- Enter each founder's name and their initial equity percentage
- The total must equal 100% (including any ESOP pool)
- Most startups start with 2-4 founders

**ESOP Pool (Optional)**:
- Set aside equity for future employees (typically 10-20%)
- This dilutes founders upfront but attracts better talent later

### 2. Add Funding Rounds

Once your scenario is created, start adding funding rounds:

#### Round Types

**SAFE Notes** (Simple Agreement for Future Equity):
- Popular for early-stage funding (pre-seed, seed)
- Converts to equity in your next priced round
- **Valuation Cap**: Maximum company value for conversion (protects investors)
- **Discount**: Percentage discount on next round price (typically 10-25%)

**Priced Rounds** (Equity Rounds):
- Direct equity sale with a specific share price
- **Pre-Money Valuation**: Company value before new investment
- **Post-Money Valuation**: Company value after new investment (pre-money + investment)

#### Advanced Options

**ESOP Pool Adjustments**:
- **Pre-Money**: New pool dilutes existing shareholders before the round
- **Post-Money**: New pool comes from the new investment

**Founder Secondary Sales**:
- Founders sell some existing shares for personal liquidity
- No new shares created, just ownership transfer

### 3. Understanding Your Results

#### Cap Table View
Shows current ownership after all rounds:
- **Shares**: Actual number of shares owned
- **Ownership %**: Percentage of the company owned
- **Type**: Whether stakeholder is founder, employee, or investor

#### Exit Simulator
Model what happens when you sell the company:
- Enter a potential exit valuation
- See cash returns for each stakeholder
- Understand how much money you'd make as a founder

#### Ownership Chart
Visual representation of:
- Current ownership distribution (pie chart)
- How ownership changed over time
- Impact of each funding round

#### Audit Trail
Detailed calculations showing:
- Before and after ownership for each round
- Share prices and valuations used
- How ESOP pools and secondary sales affected ownership

## Key Financial Concepts

### Dilution
When new shares are issued, existing shareholders own a smaller percentage of the company. For example:
- You start with 100% of 10M shares
- Investor buys 2.5M new shares for $1M
- You now own 10M out of 12.5M shares = 80%
- You've been diluted by 20%

### Valuation
- **Pre-Money**: Company value before investment
- **Post-Money**: Company value after investment
- **Share Price**: Pre-money valuation ÷ existing shares

### SAFE Conversion
SAFE notes convert to equity using the better price for investors:
- **Cap Price**: Valuation cap ÷ existing shares
- **Discount Price**: Next round price × (1 - discount%)
- **Conversion Price**: Lower of cap price or discount price

### ESOP Timing
- **Pre-Money Pool**: Dilutes founders before investment (founders pay for employee equity)
- **Post-Money Pool**: Comes from investment (investors pay for employee equity)

## Example Scenarios

The tool includes three example scenarios to help you understand different funding paths:

### SaaS Startup Journey
- 2 founders (50%/40%) + 10% ESOP
- Pre-seed SAFE → Seed round → Series A
- Shows typical SaaS funding progression

### FinTech Unicorn Path
- 3 founders with aggressive growth funding
- Multiple rounds leading to large exit
- Demonstrates high-growth, high-dilution scenario

### Simple Two-Founder Setup
- Basic scenario with friends & family + pre-seed
- Good starting point for first-time founders

## Saving and Sharing

### Account Benefits
Create an account to:
- Save unlimited scenarios
- Access scenarios from any device
- Share scenarios with co-founders or advisors
- Export professional reports

### Sharing Scenarios
- Generate shareable links for team collaboration
- Export cap tables and exit analysis to CSV/PDF
- Compare multiple scenarios side-by-side

## Tips for Founders

### Planning Your Funding Strategy
1. **Start Conservative**: Model realistic funding amounts and valuations
2. **Plan for Dilution**: Expect 15-25% dilution per major round
3. **ESOP Timing Matters**: Pre-money pools dilute founders more than post-money
4. **Secondary Opportunities**: Plan for founder liquidity in later rounds

### Using the Tool Effectively
1. **Create Multiple Scenarios**: Model optimistic, realistic, and conservative cases
2. **Test Different Exit Values**: See how sensitive your returns are to exit valuation
3. **Compare Funding Paths**: Use scenario comparison to evaluate trade-offs
4. **Share with Advisors**: Get feedback on your funding strategy

### Common Mistakes to Avoid
- **Over-optimistic valuations**: Use market comparables for realistic modeling
- **Ignoring ESOP dilution**: Factor in employee equity from the start
- **Not planning for multiple rounds**: Most startups need 3-5 rounds to exit
- **Forgetting about liquidation preferences**: Higher valuations aren't always better

## Understanding Your Reports

### Cap Table Export
- Current ownership breakdown
- Share counts and percentages
- Investment amounts by round
- Funding timeline summary

### Exit Analysis Export
- Cash returns for each stakeholder
- Return multiples for investors
- ESOP pool value for employees
- Total return analysis

## Frequently Asked Questions

**Q: How accurate are these calculations?**
A: The financial engine uses standard VC math and has been tested against real-world scenarios. However, always consult with legal and financial professionals for actual transactions.

**Q: Can I model liquidation preferences?**
A: The current version assumes simple 1x non-participating preferences. Advanced preference modeling is planned for future releases.

**Q: What if I have convertible debt instead of SAFEs?**
A: The SAFE modeling can approximate convertible notes. For complex debt structures, consult with your attorney.

**Q: How do I handle employee option grants?**
A: The ESOP pool represents reserved equity for employees. Individual grants would come from this pool and don't need separate modeling.

**Q: Can I model acquisition vs IPO scenarios?**
A: Yes, the exit simulator works for any exit type. Just enter the appropriate exit valuation.

## Technical Details

### Calculation Methodology
- All percentages rounded to 2 decimal places for display
- Share counts maintained as integers to prevent fractional shares
- Dilution calculated based on new shares issued vs total outstanding
- SAFE conversion uses the better price for investors (lower of cap or discount price)

### Data Security
- All scenario data is encrypted and stored securely in Supabase
- User authentication required for saving scenarios
- Row-level security ensures you only see your own data

### Performance
- Real-time calculations optimized for sub-200ms response times
- Supports scenarios with up to 15 funding rounds
- Mobile-optimized for use on any device

## Support

This tool is designed to be intuitive, but cap table modeling can be complex. If you have questions about:
- **Using the tool**: Check this guide or explore the example scenarios
- **Financial concepts**: Consult with startup advisors or financial professionals
- **Legal implications**: Always work with qualified attorneys for actual funding rounds

Remember: This tool is for planning and educational purposes. All financial decisions should be reviewed by qualified professionals.

---

**Built with ❤️ for founders modeling their future**

*Financial calculations for educational purposes. Consult professionals for legal advice.*