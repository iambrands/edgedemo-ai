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
  ClientOnboarding,
} from './pages/portal';
import { RIAOnboarding } from './pages/onboarding';
import { RIAHelpCenter, ClientHelpCenter } from './pages/help';
import { Technology, Methodology } from './pages/about';
import { Terms, Privacy, Disclosures } from './pages/legal';
import { About, Careers, Blog, Contact } from './pages/company';
import { Investors, Professionals } from './pages/audience';
import { DashboardLayout } from './components/layout/DashboardLayout';
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

      {/* Client Portal Routes */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/onboarding" element={<ClientOnboarding />} />
      <Route path="/portal/help" element={<ClientHelpCenter />} />
      <Route
        path="/portal/dashboard"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalDashboard /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/goals"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalGoals /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/documents"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalDocuments /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/updates"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalNarratives /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/risk-profile"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalRiskProfile /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/performance"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalPerformance /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/meetings"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalMeetings /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/requests"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalRequests /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/notifications"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalNotifications /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/assistant"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalAssistant /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/what-if"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalWhatIf /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/tax"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalTaxCenter /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/beneficiaries"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalBeneficiaries /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/family"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalFamily /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/settings"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalSettings /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route
        path="/portal/messages"
        element={
          <PortalGuard>
            <ErrorBoundary><PortalMessages /></ErrorBoundary>
          </PortalGuard>
        }
      />
      <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
