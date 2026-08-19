import { Navigate } from 'react-router-dom';
import { useClientProfile } from '../../contexts/ClientProfileContext';

/**
 * Restricts advisor-only /client/* routes to users with an active advisor connection.
 * DIY users are redirected to the dashboard (no 403 — avoids feature enumeration).
 */
export default function ClientAdvisorGuard({ children }: { children: React.ReactNode }) {
  const { isAdvisorLinked, isLoading } = useClientProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdvisorLinked) {
    return <Navigate to="/client/dashboard" replace />;
  }

  return <>{children}</>;
}
