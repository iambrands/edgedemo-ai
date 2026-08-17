/** Central product brand — update here when marketing/legal copy changes. */
export const PRODUCT_NAME = 'Firmum';
export const PRODUCT_TAGLINE = 'The steady layer for modern advisory firms';
export const PRODUCT_DOMAIN = 'firmum.ai';
export const PRODUCT_APP_URL = `https://app.${PRODUCT_DOMAIN}`;
export const MARKETING_SITE_URL = `https://${PRODUCT_DOMAIN}`;

export const LEGAL_ENTITY = 'IAB Advisors, Inc.';
export const LEGAL_DBA = `${PRODUCT_NAME} by ${LEGAL_ENTITY}`;

/** Legacy domains — keep for redirects and email migration */
export const LEGACY_DOMAINS = ['edgeadvisors.ai', 'edgeria.ai'] as const;

export const PRODUCT_DESCRIPTION =
  'AI-powered practice management platform for registered investment advisors.';

export const COMPLIANCE_FOOTER =
  `${PRODUCT_NAME} is a technology platform, not a registered investment adviser, broker-dealer, or custodian. ` +
  'Investment advice is provided by independent RIAs using the platform.';
