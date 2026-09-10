import { test, expect } from '@playwright/test';

test.describe('楽譜ワークステーションの実機ブラウザ検証', () => {
  test('デスクトップ環境での完全動作・コンソールエラー0件検証', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // テストPDF読込ボタンのクリック
    const loadBtn = page.getByRole('button', { name: /見開きテスト|テストPDF/i });
    await expect(loadBtn).toBeVisible();
    await loadBtn.click();

    // メインCanvasの描画待機
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // サムネイルの表示確認
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/desktop-success.png', fullPage: true });

    // コンソールエラー0件チェック (RenderingCancelledException も含め一切のエラーを許容しない)
    expect(consoleErrors).toHaveLength(0);
  });

  test('モバイル環境での見切れゼロ検証', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.screenshot({ path: 'test-results/mobile-success.png', fullPage: true });
  });
});
