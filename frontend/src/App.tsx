import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Landing, Login, Signup } from './pages';
import {
  Overview,
  Households,
  Accounts,
  Statements,
  Analysis,
  Compliance,
  Chat,
  Settings,
  Meetings,
  ComplianceDocs,
  Liquidity,
  Custodians,
  TaxHarvest,
  Prospects,
  Conversations,
  ModelPortfolios,
  AlternativeAssets,
  CRM,
  ReportBuilder,
  Trading,
  Billing,
  StockScreener,
  BulkImport,
  Messages,
  BestExecution,
  LearningCenter,
} from './pages/dashboard';
import {
  PortalLogin,
  PortalDashboard,
  PortalGoals,
  PortalDocuments,
  PortalNarratives,
  PortalRiskProfile,
  PortalPerformance,
  PortalMeetings,
  PortalRequests,
  PortalNotifications,
  PortalAssistant,
  PortalWhatIf,
  PortalTaxCenter,
  PortalBeneficiaries,
  PortalFamily,
  PortalSettings,
  PortalMessages,
  PortalLearningCenter,
  ClientOnboarding,
} from './pages/portal';
import { RIAOnboarding } from './pages/onboarding';
import { RIAHelpCenter, ClientHelpCenter } from './pages/help';
import { Technology, Methodology } from './pages/about';
import { Terms, Privacy, Disclosures } from './pages/legal';
import { About, Careers, Blog, Contact } from './pages/company';
import { Investors, Professionals } from './pages/audience';
import { DashboardLayout } from './components/layout/DashboardLayout';
import PortalLayout from './components/portal/PortalLayout';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Auth guard for client portal routes.
 * Redirects to portal login if no token is present.
 */
const PortalGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasToken = localStorage.getItem('portal_token');
  if (!hasToken) {
    return <Navigate to="/portal/login" replace />;
  }
  return <>{children}</>;
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Dashboard Routes (Protected - Advisor) */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<ErrorBoundary><Overview /></ErrorBoundary>} />
        <Route path="households" element={<ErrorBoundary><Households /></ErrorBoundary>} />
        <Route path="accounts" element={<ErrorBoundary><Accounts /></ErrorBoundary>} />
        <Route path="statements" element={<ErrorBoundary><Statements /></ErrorBoundary>} />
        <Route path="analysis" element={<ErrorBoundary><Analysis /></ErrorBoundary>} />
        <Route path="compliance" element={<ErrorBoundary><Compliance /></ErrorBoundary>} />
        <Route path="meetings" element={<ErrorBoundary><Meetings /></ErrorBoundary>} />
        <Route path="compliance-docs" element={<ErrorBoundary><ComplianceDocs /></ErrorBoundary>} />
        <Route path="liquidity" element={<ErrorBoundary><Liquidity /></ErrorBoundary>} />
        <Route path="custodians" element={<ErrorBoundary><Custodians /></ErrorBoundary>} />
        <Route path="tax-harvest" element={<ErrorBoundary><TaxHarvest /></ErrorBoundary>} />
        <Route path="prospects" element={<ErrorBoundary><Prospects /></ErrorBoundary>} />
        <Route path="conversations" element={<ErrorBoundary><Conversations /></ErrorBoundary>} />
        <Route path="model-portfolios" element={<ErrorBoundary><ModelPortfolios /></ErrorBoundary>} />
        <Route path="alternative-assets" element={<ErrorBoundary><AlternativeAssets /></ErrorBoundary>} />
        <Route path="crm" element={<ErrorBoundary><CRM /></ErrorBoundary>} />
        <Route path="report-builder" element={<ErrorBoundary><ReportBuilder /></ErrorBoundary>} />
        <Route path="trading" element={<ErrorBoundary><Trading /></ErrorBoundary>} />
        <Route path="billing" element={<ErrorBoundary><Billing /></ErrorBoundary>} />
        <Route path="screener" element={<ErrorBoundary><StockScreener /></ErrorBoundary>} />
        <Route path="bulk-import" element={<ErrorBoundary><BulkImport /></ErrorBoundary>} />
        <Route path="messages" element={<ErrorBoundary><Messages /></ErrorBoundary>} />
        <Route path="best-execution" element={<ErrorBoundary><BestExecution /></ErrorBoundary>} />
        <Route path="learn" element={<ErrorBoundary><LearningCenter /></ErrorBoundary>} />
        <Route path="chat" element={<ErrorBoundary><Chat /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
      </Route>

      {/* RIA Onboarding & Help (standalone, no sidebar layout) */}
      <Route path="/onboarding" element={<RIAOnboarding />} />
      <Route path="/help" element={<RIAHelpCenter />} />

      {/* About (AI Transparency) */}
      <Route path="/about/technology" element={<Technology />} />
      <Route path="/about/methodology" element={<Methodology />} />

      {/* Legal */}
      <Route path="/legal/terms" element={<Terms />} />
      <Route path="/legal/privacy" element={<Privacy />} />
      <Route path="/legal/disclosures" element={<Disclosures />} />

      {/* Company */}
      <Route path="/company/about" element={<About />} />
      <Route path="/company/careers" element={<Careers />} />
      <Route path="/company/blog" element={<Blog />} />
      <Route path="/company/contact" element={<Contact />} />

      {/* Audience */}
      <Route path="/investors" element={<Investors />} />
      <Route path="/professionals" element={<Professionals />} />

      {/* Client Portal Routes (standalone — no sidebar) */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/onboarding" element={<ClientOnboarding />} />
      <Route path="/portal/help" element={<ClientHelpCenter />} />

      {/* Client Portal Routes (with sidebar layout) */}
      <Route path="/portal" element={<PortalGuard><PortalLayout /></PortalGuard>}>
        <Route index element={<Navigate to="/portal/dashboard" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><PortalDashboard /></ErrorBoundary>} />
        <Route path="performance" element={<ErrorBoundary><PortalPerformance /></ErrorBoundary>} />
        <Route path="goals" element={<ErrorBoundary><PortalGoals /></ErrorBoundary>} />
        <Route path="what-if" element={<ErrorBoundary><PortalWhatIf /></ErrorBoundary>} />
        <Route path="tax" element={<ErrorBoundary><PortalTaxCenter /></ErrorBoundary>} />
        <Route path="beneficiaries" element={<ErrorBoundary><PortalBeneficiaries /></ErrorBoundary>} />
        <Route path="family" element={<ErrorBoundary><PortalFamily /></ErrorBoundary>} />
        <Route path="documents" element={<ErrorBoundary><PortalDocuments /></ErrorBoundary>} />
        <Route path="updates" element={<ErrorBoundary><PortalNarratives /></ErrorBoundary>} />
        <Route path="meetings" element={<ErrorBoundary><PortalMeetings /></ErrorBoundary>} />
        <Route path="messages" element={<ErrorBoundary><PortalMessages /></ErrorBoundary>} />
        <Route path="requests" element={<ErrorBoundary><PortalRequests /></ErrorBoundary>} />
        <Route path="learn" element={<ErrorBoundary><PortalLearningCenter /></ErrorBoundary>} />
        <Route path="notifications" element={<ErrorBoundary><PortalNotifications /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><PortalSettings /></ErrorBoundary>} />
        <Route path="risk-profile" element={<ErrorBoundary><PortalRiskProfile /></ErrorBoundary>} />
        <Route path="assistant" element={<ErrorBoundary><PortalAssistant /></ErrorBoundary>} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
