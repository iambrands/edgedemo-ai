import { test as base, APIRequestContext, request } from '@playwright/test';

const API_URL = process.env.TEST_URL || 'https://web-production-8b7ae.up.railway.app';

type APIFixtures = {
  apiContext: APIRequestContext;
  authToken: string;
};

export const test = base.extend<APIFixtures>({
  apiContext: async ({}, use) => {
    const context = await request.newContext({ baseURL: API_URL });
    await use(context);
    await context.dispose();
  },

  authToken: async ({ apiContext }, use) => {
    const response = await apiContext.post('/api/auth/login', {
      data: {
        email: process.env.E2E_TEST_EMAIL || 'e2e-test@optionsedge.ai',
        password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
      },
    });
    const data = await response.json();
    await use(data.access_token || '');
  },
});

export { expect } from '@playwright/test';
