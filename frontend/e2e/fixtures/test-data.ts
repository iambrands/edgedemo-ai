/* ------------------------------------------------------------------ */
/*  Page inventories used by smoke + per-page tests                    */
/* ------------------------------------------------------------------ */

export interface PageEntry {
  path: string;
  title: string;        // substring expected in the first h1/h2
  kind: 'table' | 'cards' | 'form' | 'chat' | 'mixed';
}

export const RIA_PAGES: PageEntry[] = [
  { path: '/dashboard',                   title: 'Dashboard',            kind: 'cards' },
  { path: '/dashboard/households',        title: 'Households',           kind: 'cards' },
  { path: '/dashboard/accounts',          title: 'Accounts',             kind: 'table' },
  { path: '/dashboard/statements',        title: 'Statements',           kind: 'mixed' },
  { path: '/dashboard/analysis',          title: 'Analysis',             kind: 'cards' },
  { path: '/dashboard/compliance',        title: 'Compliance',           kind: 'mixed' },
  { path: '/dashboard/compliance-docs',   title: 'Compliance',           kind: 'mixed' },
  { path: '/dashboard/meetings',          title: 'Meeting',              kind: 'mixed' },
  { path: '/dashboard/liquidity',         title: 'Liquidity',            kind: 'mixed' },
  { path: '/dashboard/custodians',        title: 'Custodian',            kind: 'mixed' },
  { path: '/dashboard/tax-harvest',       title: 'Tax',                  kind: 'mixed' },
  { path: '/dashboard/prospects',         title: 'Prospect',             kind: 'mixed' },
  { path: '/dashboard/conversations',     title: 'Conversation',         kind: 'mixed' },
  { path: '/dashboard/model-portfolios',  title: 'Model',                kind: 'mixed' },
  { path: '/dashboard/alternative-assets',title: 'Alternative',          kind: 'mixed' },
  { path: '/dashboard/crm',             title: 'CRM',                   kind: 'mixed' },
  { path: '/dashboard/report-builder',  title: 'Report',                kind: 'mixed' },
  { path: '/dashboard/trading',         title: 'Trad',                  kind: 'mixed' },
  { path: '/dashboard/billing',         title: 'Billing',               kind: 'mixed' },
  { path: '/dashboard/chat',             title: 'Chat',                  kind: 'chat' },
  { path: '/dashboard/settings',         title: 'Settings',              kind: 'form' },
];

export const PORTAL_PAGES: PageEntry[] = [
  { path: '/portal/dashboard',       title: 'Dashboard',      kind: 'cards' },
  { path: '/portal/goals',           title: 'Goal',           kind: 'cards' },
  { path: '/portal/documents',       title: 'Document',       kind: 'mixed' },
  { path: '/portal/updates',         title: 'Update',         kind: 'cards' },
  { path: '/portal/risk-profile',    title: 'Risk',           kind: 'form' },
  { path: '/portal/performance',     title: 'Performance',    kind: 'cards' },
  { path: '/portal/meetings',        title: 'Meeting',        kind: 'mixed' },
  { path: '/portal/requests',        title: 'Request',        kind: 'mixed' },
  { path: '/portal/notifications',   title: 'Notification',   kind: 'mixed' },
  { path: '/portal/assistant',       title: 'Assistant',      kind: 'chat' },
  { path: '/portal/what-if',         title: 'What',           kind: 'form' },
  { path: '/portal/tax',             title: 'Tax',            kind: 'mixed' },
  { path: '/portal/beneficiaries',   title: 'Beneficiar',     kind: 'mixed' },
  { path: '/portal/family',          title: 'Family',         kind: 'mixed' },
  { path: '/portal/settings',        title: 'Settings',       kind: 'form' },
];

export const PUBLIC_PAGES = [
  { path: '/',        title: 'Edge' },
  { path: '/login',   title: 'Sign' },
  { path: '/signup',  title: 'Create' },
  { path: '/help',    title: 'Help' },
  { path: '/portal/login', title: 'Client' },
  { path: '/portal/help',  title: 'Help' },
  { path: '/about/technology',   title: 'Technology' },
  { path: '/about/methodology',  title: 'Methodology' },
  { path: '/legal/terms',        title: 'Terms' },
  { path: '/legal/privacy',      title: 'Privacy' },
  { path: '/legal/disclosures',  title: 'Disclosures' },
];
