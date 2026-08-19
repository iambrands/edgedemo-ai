/** IAB sibling trading platforms — deep-link URLs used in the Investments hub. */

export const THETARA_URL =
  import.meta.env.VITE_THETARA_URL ||
  (import.meta.env.DEV ? 'https://staging.thetara.ai' : 'https://thetara.ai');

export const BULLARA_URL =
  import.meta.env.VITE_BULLARA_URL ||
  (import.meta.env.DEV ? 'https://staging.bullara.ai' : 'https://bullara.ai');
