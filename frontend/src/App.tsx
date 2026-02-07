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
} from './pages/dashboard';
import { PortalLogin, PortalDashboard, PortalGoals } from './pages/portal';
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
        <Route path="chat" element={<Chat />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Client Portal Routes */}
      <Route path="/portal/login" element={<PortalLogin />} />
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
      <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
