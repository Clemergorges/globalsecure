import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test('should load login page', async ({ page }) => {
    // Use relative URL so it uses baseURL from config
    await page.goto('/en/login');
    
    // Check for "Sign In" button or Email label which might be more stable
    await expect(page.getByText('Sign In', { exact: false })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should block unauthorized dashboard access', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });
});
