import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Mobile Workstation Tests', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone viewport
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });

  test('should not crash after 10 page turns and individual page overrides should work', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('RenderingCancelledException') && !text.includes('cancelled')) {
          errors.push(text);
        }
      }
    });

    page.on('pageerror', exception => {
      errors.push(exception.message);
    });

    await page.goto('http://localhost:5173'); // Assuming standard Vite port

    // 1. Load PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(process.cwd(), 'tests', 'fixtures', '見開きテスト.pdf'));

    // Wait for the score canvas to load
    await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Continuous Page Turn Test
    for (let i = 0; i < 10; i++) {
      const nextBtn = page.locator('button[aria-label="次"]');
      if (await nextBtn.isDisabled()) {
        break; // Reached end of PDF
      }
      await nextBtn.click();
      await page.waitForTimeout(300); // Simulate realistic mobile page turn timing
    }

    // Verify 0 console errors (other than expected cancellations)
    expect(errors.length).toBe(0);

    // 3. Page Override Test
    await page.locator('button[aria-label="設定"]').click();
    
    // Switch to 'page' tab (個別・回転)
    await page.locator('button:has-text("個別・回転")').click();
    
    // Create override
    await page.locator('button:has-text("このページだけ個別設定にする")').click();

    // Verify override is active (toast or badge)
    await expect(page.locator('text=[ 個別設定中 ]').first()).toBeVisible();
    
    // Verify override list is shown
    await expect(page.locator('text=個別設定一覧:')).toBeVisible();

    // Close settings by clicking backdrop
    await page.mouse.click(10, 10);
    
    // Go to previous page
    const prevBtn = page.locator('button[aria-label="前"]');
    await prevBtn.click();
    await page.waitForTimeout(300);
    
    // Badge shouldn't be on the previous page
    await expect(page.locator('text=[ 個別設定中 ]')).toHaveCount(0);
  });
});
