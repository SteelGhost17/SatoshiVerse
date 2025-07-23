import { test, expect } from '@playwright/test';

test('index loads and canvas visible', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  await expect(page.locator('#universe')).toBeVisible();
  await expect(page.locator('#ui')).toBeVisible();
});
