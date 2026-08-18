import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppHostGate } from './components/brand/AppHostGate';
import { DashboardLayout } from './components/layout/DashboardLayout';
import PortalLayout from './components/portal/PortalLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';

// ── Lazy page imports ────────────────────────────────────────────────────────
// Pages with named exports need the .then(m => ({ default: m.X })) wrapper
// because React.lazy only works with modules that have a default export.

// Public / marketing
const Landing = React.lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = React.lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const FeaturesPage = React.lazy(() => import('./pages/marketing/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const PricingPage = React.lazy(() => import('./pages/marketing/PricingPage').then(m => ({ default: m.PricingPage })));
const UpdatesPage = React.lazy(() => import('./pages/marketing/UpdatesPage').then(m => ({ default: m.UpdatesPage })));

// Company
const About = React.lazy(() => import('./pages/company/About'));
const Careers = React.lazy(() => import('./pages/company/Careers'));
const Blog = React.lazy(() => import('./pages/company/Blog'));
const Contact = React.lazy(() => import('./pages/company/Contact'));

// About / methodology
const Technology = React.lazy(() => import('./pages/about/Technology'));
const Methodology = React.lazy(() => import('./pages/about/Methodology'));

// Legal
const Terms = React.lazy(() => import('./pages/legal/Terms'));
const Privacy = React.lazy(() => import('./pages/legal/Privacy'));
const Disclosures = React.lazy(() => import('./pages/legal/Disclosures'));
const DataRetention = React.lazy(() => import('./pages/legal/DataRetention'));

// Audience
const Investors = React.lazy(() => import('./pages/audience/Investors'));
const Professionals = React.lazy(() => import('./pages/audience/Professionals'));

// Advisor dashboard pages
// Named-export pages need .then(m => ({ default: m.X })) wrapper
const Overview = React.lazy(() => import('./pages/dashboard/Overview').then(m => ({ default: m.Overview })));
const Households = React.lazy(() => import('./pages/dashboard/Households').then(m => ({ default: m.Households })));
const Accounts = React.lazy(() => import('./pages/dashboard/Accounts').then(m => ({ default: m.Accounts })));
const Statements = React.lazy(() => import('./pages/dashboard/Statements').then(m => ({ default: m.Statements })));
const Analysis = React.lazy(() => import('./pages/dashboard/Analysis').then(m => ({ default: m.Analysis })));
const Compliance = React.lazy(() => import('./pages/dashboard/Compliance'));
const Meetings = React.lazy(() => import('./pages/dashboard/Meetings'));
const ComplianceDocs = React.lazy(() => import('./pages/dashboard/ComplianceDocs'));
const Liquidity = React.lazy(() => import('./pages/dashboard/Liquidity'));
const Custodians = React.lazy(() => import('./pages/dashboard/Custodians'));
const TaxHarvest = React.lazy(() => import('./pages/dashboard/TaxHarvest'));
const Prospects = React.lazy(() => import('./pages/dashboard/Prospects'));
const ConnectionRequests = React.lazy(() =>
  import('./pages/dashboard/ConnectionRequests').then((m) => ({ default: m.ConnectionRequests })),
);
const Conversations = React.lazy(() => import('./pages/dashboard/Conversations'));
const ModelPortfolios = React.lazy(() => import('./pages/dashboard/ModelPortfolios'));
const AlternativeAssets = React.lazy(() => import('./pages/dashboard/AlternativeAssets'));
const CRM = React.lazy(() => import('./pages/dashboard/CRM'));
const ReportBuilder = React.lazy(() => import('./pages/dashboard/ReportBuilder'));
const Trading = React.lazy(() => import('./pages/dashboard/Trading'));
const Billing = React.lazy(() => import('./pages/dashboard/Billing'));
const StockScreener = React.lazy(() => import('./pages/dashboard/StockScreener'));
const BulkImport = React.lazy(() => import('./pages/dashboard/BulkImport'));
const Messages = React.lazy(() => import('./pages/dashboard/Messages'));
const BestExecution = React.lazy(() => import('./pages/dashboard/BestExecution'));
const LearningCenter = React.lazy(() => import('./pages/dashboard/LearningCenter'));
const PortfolioReview = React.lazy(() => import('./pages/dashboard/PortfolioReview'));
const ClientPortfolios = React.lazy(() => import('./pages/dashboard/ClientPortfolios').then(m => ({ default: m.ClientPortfolios })));
const CustodianFeeds = React.lazy(() => import('./pages/dashboard/CustodianFeeds'));
const PerformanceAccounting = React.lazy(() => import('./pages/dashboard/PerformanceAccounting'));
const DocumentVault = React.lazy(() => import('./pages/dashboard/DocumentVault'));
const FirmManagement = React.lazy(() => import('./pages/dashboard/FirmManagement'));
const RebalancingEngine = React.lazy(() => import('./pages/dashboard/RebalancingEngine'));
const FinancialPlanning = React.lazy(() => import('./pages/dashboard/FinancialPlanning'));
const CommArchive = React.lazy(() => import('./pages/dashboard/CommArchive'));
const EngagementAnalytics = React.lazy(() => import('./pages/dashboard/EngagementAnalytics'));
const CRMIntegrations = React.lazy(() => import('./pages/dashboard/CRMIntegrations'));
const DirectIndexing = React.lazy(() => import('./pages/dashboard/DirectIndexing'));
const Chat = React.lazy(() => import('./pages/dashboard/Chat').then(m => ({ default: m.Chat })));
const Settings = React.lazy(() => import('./pages/dashboard/Settings').then(m => ({ default: m.Settings })));

// RIA onboarding & help
const RIAOnboarding = React.lazy(() => import('./pages/onboarding/RIAOnboarding'));
const RIAHelpCenter = React.lazy(() => import('./pages/help/RIAHelpCenter'));
const ClientHelpCenter = React.lazy(() => import('./pages/help/ClientHelpCenter'));

// Client self-serve
const ClientRegister = React.lazy(() => import('./pages/client/ClientRegister'));
const ClientOnboardingPage = React.lazy(() => import('./pages/client/ClientOnboardingPage'));
const ClientDIYDashboard = React.lazy(() => import('./pages/client/ClientDIYDashboard'));
const ConnectAdvisor = React.lazy(() => import('./pages/client/ConnectAdvisor'));
const ClientAccountability = React.lazy(() => import('./pages/client/ClientAccountability'));
const ClientStatements = React.lazy(() => import('./pages/client/ClientStatements'));
const ClientUpgrade = React.lazy(() => import('./pages/client/ClientUpgrade'));
const ClientRetirementPlanner = React.lazy(() => import('./pages/client/ClientRetirementPlanner'));

// Client portal
const PortalLogin = React.lazy(() => import('./pages/portal/PortalLogin'));
const ClientOnboarding = React.lazy(() => import('./pages/portal/ClientOnboarding'));
const PortalDashboard = React.lazy(() => import('./pages/portal/PortalDashboard'));
const PortalGoals = React.lazy(() => import('./pages/portal/PortalGoals'));
const PortalDocuments = React.lazy(() => import('./pages/portal/PortalDocuments'));
const PortalNarratives = React.lazy(() => import('./pages/portal/PortalNarratives'));
const PortalRiskProfile = React.lazy(() => import('./pages/portal/PortalRiskProfile'));
const PortalPerformance = React.lazy(() => import('./pages/portal/PortalPerformance'));
const PortalMeetings = React.lazy(() => import('./pages/portal/PortalMeetings'));
const PortalRequests = React.lazy(() => import('./pages/portal/PortalRequests'));
const PortalNotifications = React.lazy(() => import('./pages/portal/PortalNotifications'));
const PortalAssistant = React.lazy(() => import('./pages/portal/PortalAssistant'));
const PortalWhatIf = React.lazy(() => import('./pages/portal/PortalWhatIf'));
const PortalTaxCenter = React.lazy(() => import('./pages/portal/PortalTaxCenter'));
const PortalBeneficiaries = React.lazy(() => import('./pages/portal/PortalBeneficiaries'));
const PortalFamily = React.lazy(() => import('./pages/portal/PortalFamily'));
const PortalSettings = React.lazy(() => import('./pages/portal/PortalSettings'));
const PortalMessages = React.lazy(() => import('./pages/portal/PortalMessages'));
const PortalLearningCenter = React.lazy(() => import('./pages/portal/PortalLearningCenter'));

// ── Auth guard for client portal ────────────────────────────────────────────
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

// Shared fallback shown while any lazy chunk is loading
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/login" element={<AppHostGate><Login /></AppHostGate>} />
          <Route path="/signup" element={<AppHostGate><Signup /></AppHostGate>} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />

          {/* Advisor Dashboard Routes */}
          <Route path="/dashboard" element={<AppHostGate><DashboardLayout /></AppHostGate>}>
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
            <Route path="connections" element={<ErrorBoundary><ConnectionRequests /></ErrorBoundary>} />
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
            <Route path="portfolio-review" element={<ErrorBoundary><PortfolioReview /></ErrorBoundary>} />
            <Route path="client-portfolios" element={<ErrorBoundary><ClientPortfolios /></ErrorBoundary>} />
            <Route path="custodian-feeds" element={<ErrorBoundary><CustodianFeeds /></ErrorBoundary>} />
            <Route path="performance" element={<ErrorBoundary><PerformanceAccounting /></ErrorBoundary>} />
            <Route path="document-vault" element={<ErrorBoundary><DocumentVault /></ErrorBoundary>} />
            <Route path="firm-management" element={<ErrorBoundary><FirmManagement /></ErrorBoundary>} />
            <Route path="rebalancing" element={<ErrorBoundary><RebalancingEngine /></ErrorBoundary>} />
            <Route path="financial-planning" element={<ErrorBoundary><FinancialPlanning /></ErrorBoundary>} />
            <Route path="comm-archive" element={<ErrorBoundary><CommArchive /></ErrorBoundary>} />
            <Route path="engagement" element={<ErrorBoundary><EngagementAnalytics /></ErrorBoundary>} />
            <Route path="crm-integrations" element={<ErrorBoundary><CRMIntegrations /></ErrorBoundary>} />
            <Route path="direct-indexing" element={<ErrorBoundary><DirectIndexing /></ErrorBoundary>} />
            <Route path="learn" element={<ErrorBoundary><LearningCenter /></ErrorBoundary>} />
            <Route path="chat" element={<ErrorBoundary><Chat /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          </Route>

          {/* RIA Onboarding & Help */}
          <Route path="/onboarding" element={<AppHostGate><RIAOnboarding /></AppHostGate>} />
          <Route path="/help" element={<AppHostGate><RIAHelpCenter /></AppHostGate>} />

          {/* About */}
          <Route path="/about/technology" element={<Technology />} />
          <Route path="/about/methodology" element={<Methodology />} />

          {/* Legal */}
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/disclosures" element={<Disclosures />} />
          <Route path="/legal/data-retention" element={<DataRetention />} />

          {/* Audience */}
          <Route path="/audience/investors" element={<Investors />} />
          <Route path="/audience/professionals" element={<Professionals />} />

          {/* Client self-serve */}
          <Route path="/client/signup" element={<AppHostGate><ClientRegister /></AppHostGate>} />
          <Route path="/client/onboarding" element={<AppHostGate><ClientOnboardingPage /></AppHostGate>} />
          <Route path="/client/dashboard" element={<AppHostGate><ClientDIYDashboard /></AppHostGate>} />
          <Route path="/client/connect-advisor" element={<AppHostGate><ConnectAdvisor /></AppHostGate>} />
          <Route path="/client/accountability" element={<AppHostGate><ClientAccountability /></AppHostGate>} />
          <Route path="/client/statements" element={<AppHostGate><ClientStatements /></AppHostGate>} />
          <Route path="/client/upgrade" element={<AppHostGate><ClientUpgrade /></AppHostGate>} />
          <Route path="/client/retirement" element={<AppHostGate><ClientRetirementPlanner /></AppHostGate>} />
          <Route path="/client/planning" element={<AppHostGate><ClientRetirementPlanner /></AppHostGate>} />

          {/* Company */}
          <Route path="/company/about" element={<About />} />
          <Route path="/company/careers" element={<Careers />} />
          <Route path="/company/blog" element={<Blog />} />
          <Route path="/company/contact" element={<Contact />} />

          {/* Client Portal (standalone) */}
          <Route path="/portal/login" element={<AppHostGate><PortalLogin /></AppHostGate>} />
          <Route path="/portal/onboarding" element={<AppHostGate><ClientOnboarding /></AppHostGate>} />
          <Route path="/portal/help" element={<AppHostGate><ClientHelpCenter /></AppHostGate>} />

          {/* Client Portal (with sidebar layout) */}
          <Route path="/portal" element={<AppHostGate><PortalGuard><PortalLayout /></PortalGuard></AppHostGate>}>
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
