import { test, expect } from '@playwright/test';
import { loginAsRIA } from '../helpers/auth';
import { navigateAndVerify } from '../helpers/navigation';

test.describe('AI Recommendations (IMM-06)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRIA(page);
    await page.route('**/api/v1/clients/*/recommendations', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            rec_id: 'rec-001',
            advisor_id: 'adv-001',
            client_id: 'cli-001',
            rec_type: 'TLH',
            symbol: 'AAPL',
            quantity: 10,
            target_weight: 0.0,
            rationale: 'Harvest $1,200 short-term loss.',
            confidence: 0.82,
            tax_impact: { estimated_gain_loss: -1200, tax_consequence: 'loss_harvest', estimated_tax_dollars: -336 },
            compliance_status: 'APPROVED',
            compliance_flags: [],
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            order_preview: { class: 'equity', symbol: 'AAPL', side: 'sell', quantity: 10, type: 'market', duration: 'day' },
          },
        ]),
      })
    );
  });

  test('recommendation card renders', async ({ page }) => {
    await navigateAndVerify(page, '/dashboard', { title: 'Dashboard' });
    await expect(page.getByText(/AAPL/).first()).toBeVisible({ timeout: 8000 });
  });

  test('recommendation shows confidence', async ({ page }) => {
    await navigateAndVerify(page, '/dashboard', { title: 'Dashboard' });
    await expect(page.getByText(/82%/).first()).toBeVisible({ timeout: 8000 });
  });
});
