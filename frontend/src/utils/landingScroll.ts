/** Fixed marketing nav height — keep in sync with MarketingNav h-16 */
export const LANDING_NAV_OFFSET = 80;

export function scrollToLandingSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - LANDING_NAV_OFFSET;
  window.scrollTo({ top, behavior: 'smooth' });
}
