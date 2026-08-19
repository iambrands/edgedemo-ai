import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { b2cApi, type B2CMeResponse } from '../services/b2cApi';

export interface ClientProfileContextValue {
  profile: B2CMeResponse | null;
  isLoading: boolean;
  isAdvisorLinked: boolean;
  refreshProfile: () => Promise<void>;
}

const ClientProfileContext = createContext<ClientProfileContextValue | null>(null);

function isAdvisorLinkedProfile(profile: B2CMeResponse | null): boolean {
  if (!profile) return false;
  return (
    profile.management_mode === 'advisor_linked' ||
    profile.advisor_connection_status === 'active'
  );
}

export function ClientProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<B2CMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await b2cApi.getMe();
      setProfile(me);
      if (me.email) {
        localStorage.setItem('firmum_b2c_email', me.email);
      }
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      isAdvisorLinked: isAdvisorLinkedProfile(profile),
      refreshProfile,
    }),
    [profile, isLoading, refreshProfile],
  );

  return (
    <ClientProfileContext.Provider value={value}>
      {children}
    </ClientProfileContext.Provider>
  );
}

export function useClientProfile(): ClientProfileContextValue {
  const ctx = useContext(ClientProfileContext);
  if (!ctx) {
    throw new Error('useClientProfile must be used within ClientProfileProvider');
  }
  return ctx;
}
