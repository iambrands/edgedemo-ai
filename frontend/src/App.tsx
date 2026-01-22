import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import OptionsAnalyzer from './pages/OptionsAnalyzer';
import Watchlist from './pages/Watchlist';
import Automations from './pages/Automations';
import History from './pages/History';
import Alerts from './pages/Alerts';
import Trade from './pages/Trade';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Portfolio from './pages/Portfolio';
import More from './pages/More';
import Discover from './pages/Discover';
import Market from './pages/Market';
import Recommendations from './pages/Recommendations';
import Opportunities from './pages/Opportunities';
import OptimizationDashboard from './pages/OptimizationDashboard';
import PerformanceDashboard from './pages/PerformanceDashboard';
import AdminStatus from './pages/AdminStatus';
import TradierSetup from './pages/TradierSetup';
import HealthCheck from './pages/HealthCheck';
import Management from './pages/Management';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TradingModeProvider } from './contexts/TradingModeContext';

// Admin route wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.email !== 'leslie@iabadvisors.com') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  const { isAuthenticated, loading, user } = useAuth();
  
  // Check localStorage directly as primary check (more reliable than state)
  // This ensures that if a token exists, we allow access even if user state hasn't loaded yet
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('access_token') : false;
  // Authenticated if we have a token OR user state is set
  // This handles the case where token exists but getCurrentUser hasn't completed yet
  // But if we have a token but no user after loading, the token might be invalid
  const authenticated = (hasToken && (!!user || !loading)) || (!!user && isAuthenticated);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-right" />
      <Routes>
        <Route 
          path="/" 
          element={
            authenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Landing />
            )
          } 
        />
        <Route 
          path="/login" 
          element={
            authenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          } 
        />
        <Route 
          path="/register" 
          element={
            authenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register />
            )
          } 
        />
        <Route 
          path="/health" 
          element={<HealthCheck />} 
        />
        <Route
          path="/*"
          element={
            authenticated ? (
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/trade" element={<Trade />} />
                  <Route path="/analyzer" element={<OptionsAnalyzer />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/automations" element={<Automations />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/tradier-setup" element={<TradierSetup />} />
                  <Route path="/management" element={<Management />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/more" element={<More />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/positions" element={<Portfolio />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route 
                    path="/admin/optimization" 
                    element={
                      <AdminRoute>
                        <OptimizationDashboard />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/admin/status" 
                    element={
                      <AdminRoute>
                        <AdminStatus />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/admin/performance" 
                    element={
                      <AdminRoute>
                        <PerformanceDashboard />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/performance" 
                    element={
                      <AdminRoute>
                        <PerformanceDashboard />
                      </AdminRoute>
                    } 
                  />
                  {/* Legacy routes - redirect to unified Opportunities page */}
                  <Route path="/discover" element={<Navigate to="/opportunities?tab=signals" replace />} />
                  <Route path="/market" element={<Navigate to="/opportunities?tab=movers" replace />} />
                  <Route path="/recommendations" element={<Navigate to="/opportunities?tab=for-you" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <TradingModeProvider>
        <AppRoutes />
      </TradingModeProvider>
    </AuthProvider>
  );
}

export default App;

