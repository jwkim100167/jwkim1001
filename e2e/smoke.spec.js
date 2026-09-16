import { test, expect } from '@playwright/test';

test('첫 화면이 열린다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
