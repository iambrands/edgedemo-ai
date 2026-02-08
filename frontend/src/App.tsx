import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
  PortalSettings,
  ClientOnboarding,
} from './pages/portal';
import { RIAOnboarding } from './pages/onboarding';
import { RIAHelpCenter, ClientHelpCenter } from './pages/help';
import { DashboardLayout } from './components/layout/DashboardLayout';

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

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Dashboard Routes (Protected - Advisor) */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="households" element={<Households />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="statements" element={<Statements />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="compliance-docs" element={<ComplianceDocs />} />
        <Route path="liquidity" element={<Liquidity />} />
        <Route path="custodians" element={<Custodians />} />
        <Route path="tax-harvest" element={<TaxHarvest />} />
        <Route path="prospects" element={<Prospects />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="model-portfolios" element={<ModelPortfolios />} />
        <Route path="alternative-assets" element={<AlternativeAssets />} />
        <Route path="chat" element={<Chat />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* RIA Onboarding & Help (standalone, no sidebar layout) */}
      <Route path="/onboarding" element={<RIAOnboarding />} />
      <Route path="/help" element={<RIAHelpCenter />} />

      {/* Client Portal Routes */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/onboarding" element={<ClientOnboarding />} />
      <Route path="/portal/help" element={<ClientHelpCenter />} />
      <Route
        path="/portal/dashboard"
        element={
          <PortalGuard>
            <PortalDashboard />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/goals"
        element={
          <PortalGuard>
            <PortalGoals />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/documents"
        element={
          <PortalGuard>
            <PortalDocuments />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/updates"
        element={
          <PortalGuard>
            <PortalNarratives />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/risk-profile"
        element={
          <PortalGuard>
            <PortalRiskProfile />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/performance"
        element={
          <PortalGuard>
            <PortalPerformance />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/meetings"
        element={
          <PortalGuard>
            <PortalMeetings />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/requests"
        element={
          <PortalGuard>
            <PortalRequests />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/notifications"
        element={
          <PortalGuard>
            <PortalNotifications />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/assistant"
        element={
          <PortalGuard>
            <PortalAssistant />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/what-if"
        element={
          <PortalGuard>
            <PortalWhatIf />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/tax"
        element={
          <PortalGuard>
            <PortalTaxCenter />
          </PortalGuard>
        }
      />
      <Route
        path="/portal/settings"
        element={
          <PortalGuard>
            <PortalSettings />
          </PortalGuard>
        }
      />
      <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
