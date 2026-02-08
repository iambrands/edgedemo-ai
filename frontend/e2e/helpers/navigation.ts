import { Page, expect } from '@playwright/test';

/* ------------------------------------------------------------------ */
/*  Page verification                                                  */
/* ------------------------------------------------------------------ */

export async function navigateAndVerify(
  page: Page,
  path: string,
  opts: { title?: string; timeout?: number } = {},
) {
  const { title, timeout = 10_000 } = opts;

  await page.goto(path, { waitUntil: 'domcontentloaded', timeout });

  // Allow React to hydrate
  await page.waitForTimeout(800);

  // Page should not be blank
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length, `Page ${path} rendered empty`).toBeGreaterThan(0);

  // Optional: verify a visible heading contains expected text
  if (title) {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toContainText(title, { timeout: 5_000 });
  }
}

/* ------------------------------------------------------------------ */
/*  Button auditor                                                     */
/* ------------------------------------------------------------------ */

export interface ButtonTestResult {
  text: string;
  index: number;
  status: 'clicked' | 'disabled' | 'skipped' | 'error';
  navigated: boolean;
  modalOpened: boolean;
  notes: string;
}

/**
 * Click every visible, enabled button on the page and record what happened.
 * Modals are closed, navigations are reversed so the page is left in its
 * original state.
 *
 * The function re-queries the DOM after each click to handle pages where
 * clicking a button changes which buttons are visible (e.g. chat pages,
 * tabbed interfaces).
 */
export async function clickAllButtons(page: Page): Promise<ButtonTestResult[]> {
  const results: ButtonTestResult[] = [];
  const clickedTexts = new Set<string>();
  const MAX_CLICKS = 15; // Safety limit to prevent infinite loops on dynamic pages
  let totalClicks = 0;

  // We re-query buttons each iteration to handle dynamic DOM changes
  for (let pass = 0; pass < MAX_CLICKS; pass++) {
    const buttons = page.locator(
      'button:visible:not([disabled]), a[role="button"]:visible',
    );
    const count = await buttons.count();

    let foundNewButton = false;

    for (let i = 0; i < count && totalClicks < MAX_CLICKS; i++) {
      const btn = buttons.nth(i);
      const text = ((await btn.innerText().catch(() => '')) || '').trim().slice(0, 60);

      // Skip tiny icon-only buttons (close icons, etc.)
      if (text.length === 0) {
        continue;
      }

      // Skip dangerous actions in tests
      if (/delete|remove|logout|sign out/i.test(text)) {
        if (!clickedTexts.has(`__skip__${text}`)) {
          clickedTexts.add(`__skip__${text}`);
          results.push({ text, index: i, status: 'skipped', navigated: false, modalOpened: false, notes: 'Destructive action skipped' });
        }
        continue;
      }

      // Skip buttons we've already clicked (by text label)
      if (clickedTexts.has(text)) {
        continue;
      }

      foundNewButton = true;
      clickedTexts.add(text);
      totalClicks++;

      const urlBefore = page.url();

      try {
        // Quick check that button is still actionable
        const isVisible = await btn.isVisible().catch(() => false);
        if (!isVisible) {
          results.push({ text, index: i, status: 'skipped', navigated: false, modalOpened: false, notes: 'Button no longer visible' });
          break; // DOM changed, restart scan
        }

        await btn.click({ timeout: 3_000 });
        await page.waitForTimeout(500);

        const urlAfter = page.url();
        const navigated = urlAfter !== urlBefore;
        const modalOpened =
          (await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').count()) > 0;

        let notes = '';
        if (navigated) notes = `→ ${urlAfter}`;
        else if (modalOpened) notes = 'Opened modal/dialog';
        else notes = 'No visible navigation or modal';

        results.push({ text, index: i, status: 'clicked', navigated, modalOpened, notes });

        // Cleanup: close modal or go back
        if (modalOpened) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
        if (navigated) {
          await page.goto(urlBefore, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
        }

        // After a click that might mutate the DOM, break inner loop and re-query
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ text, index: i, status: 'error', navigated: false, modalOpened: false, notes: msg.slice(0, 120) });
        break; // DOM probably changed, restart scan
      }
    }

    // If we scanned all buttons without finding a new one to click, we're done
    if (!foundNewButton) break;
  }

  return results;
}
