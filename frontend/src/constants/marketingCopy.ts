/**
 * Marketing copy updated per Orie's feedback.
 * Key changes:
 * - Replace "AI native" with "designed to enhance efficiency"
 * - Replace "tax savings" with "enhanced tax efficiency"
 * - Compliance: "identifies requirements, flags issues, generates audit trail"
 * - Behavioral: "auto-generates personalized narratives and coaching"
 */

export const MARKETING_COPY = {
  elevatorPitch: {
    short:
      'Edge is a data and information aggregation platform designed to enhance efficiency and streamline advisor workflows.',
    medium:
      'Edge aggregates held-away assets, automates statement parsing, and streamlines compliance documentation -- reducing operational overhead so advisors can focus on client relationships.',
    full:
      'Edge is a wealth management platform designed to enhance efficiency through intelligent data aggregation. We automatically parse statements from 17+ custodians, aggregate held-away assets into a unified household view, identify compliance requirements, and generate audit-ready documentation -- all while reducing the operational overhead that keeps advisors from focusing on what matters most: their clients.',
  },

  features: {
    statementParsing: {
      headline: 'Automated Statement Parsing',
      description:
        'Extract positions, fees, and holdings from 17+ brokerage formats with 94%+ accuracy. Reduce client onboarding from hours to minutes.',
      benefit: 'Streamlined data aggregation',
    },
    compliance: {
      headline: 'Compliance Monitoring',
      description:
        'Identifies FINRA and SEC compliance requirements, flags potential issues for review, and generates timestamped audit trails for documentation.',
      benefit: 'Proactive issue identification',
      disclaimer:
        'Edge assists with compliance documentation but is not a substitute for compliance review by qualified professionals.',
    },
    behavioralIntelligence: {
      headline: 'Behavioral Intelligence',
      description:
        'Auto-generates personalized client narratives, meeting preparation materials, and coaching messages based on behavioral finance principles. These can be further tailored to specific client scenarios.',
      benefit: 'Enhanced client communication',
    },
    taxAnalysis: {
      headline: 'Tax-Aware Analysis',
      description:
        'Identifies opportunities for enhanced tax efficiency including tax-loss harvesting candidates, asset location optimization, and more favorable tax outcomes.',
      benefit: 'Enhanced tax efficiency',
      disclaimer:
        'Tax analysis is for informational purposes. Consult a qualified tax professional for specific advice.',
    },
    feeAnalysis: {
      headline: 'Fee Transparency',
      description:
        'Uncover total cost of ownership across all accounts including expense ratios, M&E charges, surrender fees, and advisory fees.',
      benefit: 'Complete fee visibility',
    },
    householdView: {
      headline: 'Household-Level Intelligence',
      description:
        'Aggregate all client accounts -- including held-away assets -- into a unified household view for comprehensive analysis and planning.',
      benefit: 'Complete client picture',
    },
  },

  valueProps: {
    efficiency: {
      headline: 'Reduce Operational Overhead',
      stat: '75%',
      description: 'reduction in time spent on statement processing and data entry',
    },
    onboarding: {
      headline: 'Faster Client Onboarding',
      stat: '15 min',
      description: 'average onboarding time vs. 2+ hours with manual processes',
    },
    compliance: {
      headline: 'Audit-Ready Documentation',
      stat: '100%',
      description: 'of client interactions documented with timestamped audit trail',
    },
  },

  disclaimers: {
    compliance:
      'Edge compliance features assist with documentation and issue identification. They do not replace the judgment of qualified compliance professionals.',
    tax:
      'Tax analysis features identify opportunities for enhanced tax efficiency. Always consult a qualified tax professional before making tax-related decisions.',
    investment:
      'Edge provides analysis and insights to support advisor decision-making. All investment decisions remain the responsibility of the advisor and client.',
  },
};

export const AVOID_PHRASES = [
  'AI native',
  'tax savings',
  'guaranteed',
  'ensures compliance',
  'full compliance solution',
  'eliminate risk',
];

export const PREFERRED_PHRASES: Record<string, string> = {
  'AI native': 'designed to enhance efficiency',
  'tax savings': 'enhanced tax efficiency',
  'ensures compliance': 'supports compliance documentation',
  'full compliance solution': 'compliance monitoring and documentation',
  'eliminate risk': 'help identify and mitigate risks',
};
