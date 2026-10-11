import { test, expect } from '@playwright/test';

// Exercise the browser with the published API envelope; no Pixiv login or
// production scheduler is needed to verify presentation of a healthy empty DB.
for (const scenario of [
  { enabled: false, configuredCount: 0, text: 'No schedule configured yet' },
  { enabled: true, configuredCount: 1, text: 'No execution records yet' },
  { enabled: false, configuredCount: 1, text: 'Schedules are configured but disabled' },
]) {
  test(`scheduler: ${scenario.text}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en-US'));
    await page.route(/^http:\/\/localhost:5173\/api\//, async (route) => {
      const endpoint = new URL(route.request().url()).pathname;
      const data = endpoint.endsWith('/scheduler')
        ? { slots: [], scheduler: scenario }
        : endpoint.endsWith('/scheduler/executions')
          ? { executions: [] }
          : { authenticated: false };
      await route.fulfill({ json: { data } });
    });
    await page.goto('/scheduler');
    await expect(page.getByText(scenario.text, { exact: false })).toBeVisible();
    await expect(page.getByText('Failed to load scheduler status')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('scheduler preserves a real API failure', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en-US'));
  await page.route(/^http:\/\/localhost:5173\/api\//, async (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/scheduler')) {
      await route.fulfill({
        status: 500,
        json: { errorCode: 'SCHEDULER_LIST_FAILED', message: 'Database unavailable' },
      });
    } else {
      await route.fulfill({ json: { data: { authenticated: false, executions: [] } } });
    }
  });
  await page.goto('/scheduler');
  await expect(page.getByText('Failed to load scheduler status')).toBeVisible();
  await expect(page.getByText('No schedule configured yet')).toHaveCount(0);
});
