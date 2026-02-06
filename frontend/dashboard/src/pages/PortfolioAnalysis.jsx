import { PageContainer } from '../components/layout/PageContainer';

export function PortfolioAnalysis() {
  return (
    <PageContainer title="Portfolio Analysis">
      <div className="bg-white rounded-lg border border-[var(--border)] p-8 text-center">
        <p className="text-[var(--text-secondary)] mb-4">
          Portfolio analysis runs via the legacy wizard. Use the Dashboard or upload statements to trigger analysis.
        </p>
        <a
          href="/portfolio-report-legacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          Open Portfolio Analysis Wizard
        </a>
      </div>
    </PageContainer>
  );
}
