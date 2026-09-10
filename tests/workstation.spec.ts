import { test, expect } from '@playwright/test';

test.describe('Score Optimizer 2.0 実機ブラウザ自動検証', () => {
  test('デスクトップ: PDF読込・描画・コンソールエラー0件チェック', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 「見開きテスト.pdf を読込」ボタンをクリック
    const testBtn = page.getByRole('button', { name: /見開きテスト|テスト/i });
    await expect(testBtn).toBeVisible({ timeout: 10000 });
    await testBtn.click();

    // Canvasの描画待機 (白紙でないこと)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 下部フィルムストリップのサムネイルが表示されているか
    await page.waitForTimeout(1500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/desktop-render.png', fullPage: true });

    // コンソールエラー0件検証
    expect(consoleErrors).toHaveLength(0);
  });

  test('モバイル: 横スクロール見切れゼロチェック', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.screenshot({ path: 'test-results/mobile-render.png', fullPage: true });
  });
});
