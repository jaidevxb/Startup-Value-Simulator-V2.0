import jsPDF from 'jspdf';
import { Scenario, CapTableState, ExitSimulation } from '../types/financial';

export class PDFExporter {
  static async exportCapTable(scenario: Scenario, capTableState: CapTableState) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cap Table Report', margin, yPosition);
    yPosition += 15;

    // Scenario info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Scenario: ${scenario.name}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Total Shares: ${capTableState.totalShares.toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    // Summary stats
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const totalRaised = scenario.rounds.reduce((sum, r) => sum + r.capitalRaised, 0);
    pdf.text(`• Founders: ${scenario.founders.length}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`• Funding Rounds: ${scenario.rounds.length}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`• Total Capital Raised: $${(totalRaised / 1_000_000).toFixed(1)}M`, margin, yPosition);
    yPosition += 15;

    // Cap table header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Current Ownership Distribution', margin, yPosition);
    yPosition += 10;

    // Table headers
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const colWidths = [60, 40, 30, 40];
    const headers = ['Stakeholder', 'Shares', 'Ownership %', 'Type'];
    
    let xPosition = margin;
    headers.forEach((header, i) => {
      pdf.text(header, xPosition, yPosition);
      xPosition += colWidths[i];
    });
    yPosition += 8;

    // Draw header line
    pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 2;

    // Table data
    pdf.setFont('helvetica', 'normal');
    
    // Founders
    capTableState.founders.forEach(founder => {
      xPosition = margin;
      pdf.text(founder.name, xPosition, yPosition);
      xPosition += colWidths[0];
      pdf.text(this.formatNumber(founder.shares), xPosition, yPosition);
      xPosition += colWidths[1];
      pdf.text(`${founder.percentage.toFixed(2)}%`, xPosition, yPosition);
      xPosition += colWidths[2];
      pdf.text('Founder', xPosition, yPosition);
      yPosition += 6;
    });

    // ESOP
    if (capTableState.esop.shares > 0) {
      xPosition = margin;
      pdf.text('ESOP Pool', xPosition, yPosition);
      xPosition += colWidths[0];
      pdf.text(this.formatNumber(capTableState.esop.shares), xPosition, yPosition);
      xPosition += colWidths[1];
      pdf.text(`${capTableState.esop.percentage.toFixed(2)}%`, xPosition, yPosition);
      xPosition += colWidths[2];
      pdf.text('ESOP', xPosition, yPosition);
      yPosition += 6;
    }

    // Investors
    capTableState.investors.forEach(investor => {
      xPosition = margin;
      pdf.text(investor.name, xPosition, yPosition);
      xPosition += colWidths[0];
      pdf.text(this.formatNumber(investor.shares), xPosition, yPosition);
      xPosition += colWidths[1];
      pdf.text(`${investor.percentage.toFixed(2)}%`, xPosition, yPosition);
      xPosition += colWidths[2];
      pdf.text('Investor', xPosition, yPosition);
      yPosition += 6;
    });

    // Funding timeline
    if (scenario.rounds.length > 0) {
      yPosition += 10;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Funding Timeline', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      scenario.rounds.forEach((round, index) => {
        pdf.text(
          `${index + 1}. ${round.name} - ${round.type} - $${(round.capitalRaised / 1_000_000).toFixed(1)}M`,
          margin,
          yPosition
        );
        yPosition += 6;
      });
    }

    // Save PDF
    pdf.save(`${scenario.name.replace(/\s+/g, '_')}_cap_table.pdf`);
  }

  static async exportExitAnalysis(scenario: Scenario, exitSimulation: ExitSimulation) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Exit Analysis Report', margin, yPosition);
    yPosition += 15;

    // Scenario info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Scenario: ${scenario.name}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Exit Valuation: ${this.formatCurrency(exitSimulation.exitValuation)}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;

    // Founder returns
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Founder Returns', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    exitSimulation.founderReturns.forEach(founder => {
      pdf.text(
        `• ${founder.name}: ${this.formatCurrency(founder.cashReturn)} (${founder.finalEquity.toFixed(2)}% equity)`,
        margin,
        yPosition
      );
      yPosition += 6;
    });

    // ESOP value
    if (exitSimulation.esopValue > 0) {
      yPosition += 8;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESOP Pool Value', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Employee Option Pool: ${this.formatCurrency(exitSimulation.esopValue)}`, margin, yPosition);
      yPosition += 10;
    }

    // Investor returns
    if (exitSimulation.investorReturns.length > 0) {
      yPosition += 8;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Investor Returns', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      exitSimulation.investorReturns.forEach(investor => {
        pdf.text(
          `• ${investor.name}: ${this.formatCurrency(investor.cashReturn)} (${investor.multiple.toFixed(2)}x multiple)`,
          margin,
          yPosition
        );
        yPosition += 6;
      });
    }

    // Summary
    yPosition += 10;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPosition);
    yPosition += 10;

    const totalFounderReturns = exitSimulation.founderReturns.reduce((sum, f) => sum + f.cashReturn, 0);
    const totalInvestorReturns = exitSimulation.investorReturns.reduce((sum, i) => sum + i.cashReturn, 0);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Founder Returns: ${this.formatCurrency(totalFounderReturns)}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Total Investor Returns: ${this.formatCurrency(totalInvestorReturns)}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`ESOP Pool Value: ${this.formatCurrency(exitSimulation.esopValue)}`, margin, yPosition);

    // Save PDF
    pdf.save(`${scenario.name.replace(/\s+/g, '_')}_exit_analysis.pdf`);
  }

  private static formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  }

  private static formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  }
}