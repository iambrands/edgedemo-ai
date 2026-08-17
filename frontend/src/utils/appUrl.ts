import { PRODUCT_APP_URL, PRODUCT_DOMAIN } from '../constants/brand';

const MARKETING_HOSTS = new Set([PRODUCT_DOMAIN, `www.${PRODUCT_DOMAIN}`]);

/** True when the site is served from firmum.ai / www (marketing), not app.firmum.ai */
export function isMarketingHost(hostname?: string): boolean {
  const h = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!h || h === 'localhost' || h === '127.0.0.1') return false;
  return MARKETING_HOSTS.has(h);
}

/** Resolve an app path — absolute on marketing host, relative on app / localhost */
export function appUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (typeof window === 'undefined') return `${PRODUCT_APP_URL}${normalized}`;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return normalized;
  if (host.startsWith('app.')) return normalized;
  if (isMarketingHost(host)) return `${PRODUCT_APP_URL}${normalized}`;
  return normalized;
}

/** Navigate to an app route (full page load when crossing to app.firmum.ai) */
export function goToApp(path: string): void {
  const url = appUrl(path);
  if (url.startsWith('http')) {
    window.location.assign(url);
  } else {
    window.location.assign(url);
  }
}

export const APP_ROUTES = {
  login: '/login',
  signup: '/signup',
  register: '/signup',
  onboarding: '/onboarding',
  portalLogin: '/portal/login',
  dashboard: '/dashboard',
  clientSignup: '/client/signup',
  clientOnboarding: '/client/onboarding',
  clientDashboard: '/client/dashboard',
  clientConnectAdvisor: '/client/connect-advisor',
  clientAccountability: '/client/accountability',
} as const;

/** Self-serve client paths (always on app host) */
export const CLIENT_ROUTES = {
  signup: APP_ROUTES.clientSignup,
  onboarding: APP_ROUTES.clientOnboarding,
  dashboard: APP_ROUTES.clientDashboard,
  connectAdvisor: APP_ROUTES.clientConnectAdvisor,
  accountability: APP_ROUTES.clientAccountability,
} as const;
