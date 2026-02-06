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
} from './pages/dashboard';
import { DashboardLayout } from './components/layout/DashboardLayout';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Dashboard Routes (Protected) */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="households" element={<Households />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="statements" element={<Statements />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="chat" element={<Chat />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
