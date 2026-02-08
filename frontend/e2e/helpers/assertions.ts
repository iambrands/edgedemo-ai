import { Page, expect } from '@playwright/test';

/** Verify the page has at least one table with at least one data row. */
export async function verifyTableHasData(page: Page) {
  const table = page.locator('table, [role="table"]').first();
  await expect(table).toBeVisible({ timeout: 8_000 });
  const rows = table.locator('tbody tr, [role="row"]');
  const count = await rows.count();
  expect(count, 'Table should have data rows').toBeGreaterThan(0);
  return count;
}

/** Verify the page has at least one card with non-empty content. */
export async function verifyCardsRendered(page: Page, minCount = 1) {
  const cards = page.locator(
    '[class*="rounded-xl"][class*="border"][class*="shadow"], [class*="Card"]',
  );
  const count = await cards.count();
  expect(count, `Expected at least ${minCount} card(s)`).toBeGreaterThanOrEqual(minCount);
  return count;
}

/** Verify no uncaught JS errors have fired. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Wait for at least one API response matching the pattern, assert it's 2xx/3xx. */
export async function verifyApiCall(page: Page, urlPattern: string | RegExp) {
  const resp = await page.waitForResponse(
    (r) =>
      typeof urlPattern === 'string'
        ? r.url().includes(urlPattern)
        : urlPattern.test(r.url()),
    { timeout: 10_000 },
  );
  expect(resp.status(), `API ${resp.url()} returned ${resp.status()}`).toBeLessThan(400);
  return resp;
}
