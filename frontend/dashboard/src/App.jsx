import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import Households from './pages/Households';
import HouseholdDetail from './pages/HouseholdDetail';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import { Statements } from './pages/Statements';
import { PortfolioAnalysis } from './pages/PortfolioAnalysis';
import FeeAnalysis from './pages/FeeAnalysis';
import TaxOptimization from './pages/TaxOptimization';
import RiskAnalysis from './pages/RiskAnalysis';
import { ETFBuilder } from './pages/ETFBuilder';
import { IPSGenerator } from './pages/IPSGenerator';
import Rebalancing from './pages/Rebalancing';
import FinancialPlan from './pages/FinancialPlan';
import Reports from './pages/Reports';
import ClientPortalDemo from './pages/ClientPortalDemo';
import OnboardingWizard from './pages/OnboardingWizard';
import Billing from './pages/Billing';
import Compliance from './pages/Compliance';
import AIChat from './pages/AIChat';
import { Settings } from './pages/Settings';

function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/households" element={<Layout><Households /></Layout>} />
      <Route path="/households/:id" element={<Layout><HouseholdDetail /></Layout>} />
      <Route path="/accounts" element={<Layout><Accounts /></Layout>} />
      <Route path="/accounts/:id" element={<Layout><AccountDetail /></Layout>} />
      <Route path="/statements" element={<Layout><Statements /></Layout>} />
      <Route path="/reports" element={<Layout><Reports /></Layout>} />
      <Route path="/portal/demo" element={<Layout><ClientPortalDemo /></Layout>} />
      <Route path="/onboarding" element={<Layout><OnboardingWizard /></Layout>} />
      <Route path="/analysis/portfolio" element={<Layout><PortfolioAnalysis /></Layout>} />
      <Route path="/analysis/fees" element={<Layout><FeeAnalysis /></Layout>} />
      <Route path="/analysis/tax" element={<Layout><TaxOptimization /></Layout>} />
      <Route path="/analysis/risk" element={<Layout><RiskAnalysis /></Layout>} />
      <Route path="/planning/etf-builder" element={<Layout><ETFBuilder /></Layout>} />
      <Route path="/planning/ips" element={<Layout><IPSGenerator /></Layout>} />
      <Route path="/planning/rebalance" element={<Layout><Rebalancing /></Layout>} />
      <Route path="/planning/financial-plan" element={<Layout><FinancialPlan /></Layout>} />
      <Route path="/compliance" element={<Layout><Compliance /></Layout>} />
      <Route path="/billing" element={<Layout><Billing /></Layout>} />
      <Route path="/chat" element={<Layout><AIChat /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
