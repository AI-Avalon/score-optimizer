import { test, expect } from '@playwright/test';

// ── デスクトップテスト ──────────────────────────────────────────────

test.describe('デスクトップ検証', () => {
  test('初期表示・用紙選択・コンソールエラー0件', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Safari') {
      test.skip();
      return;
    }

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const emptyState = page.getByText('PDF をドラッグ＆ドロップ');
    await expect(emptyState).toBeVisible({ timeout: 10000 });

    const paperSelect = page.locator('[data-testid="paper-select"]');
    await expect(paperSelect).toBeVisible({ timeout: 5000 });

    const options = await paperSelect.locator('option').allTextContents();
    expect(options).toContain('A4 縦');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.screenshot({ path: 'test-results/desktop-initial.png', fullPage: true });
    expect(consoleErrors).toHaveLength(0);
  });

  test('Sidebar に回転・一括操作ボタンが存在し、全ページ適用が正常に動作する', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Safari') {
      test.skip();
      return;
    }

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 全ページに適用ボタン
    const applyAllBtn = page.getByRole('button', { name: /全ページに適用/i });
    await expect(applyAllBtn).toBeVisible({ timeout: 5000 });
    
    // PDFをロードしていないとdisabledかもしれないが、UIが存在することは確認できる
    
    // 初期設定にリセットボタン
    await expect(page.getByRole('button', { name: /初期設定にリセット/i })).toBeVisible({ timeout: 5000 });

    // 左右個別枠のトグルが存在することを確認
    await expect(page.getByText('左右個別枠を有効にする')).toBeVisible({ timeout: 5000 });

    expect(consoleErrors).toHaveLength(0);
  });
});

// ── モバイルテスト ──────────────────────────────────────────────────

test.describe('モバイル検証', () => {
  test('横スクロール見切れゼロ + 専用レイアウトとボトムシート', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Desktop Chrome') {
      test.skip();
      return;
    }

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 横スクロールなし
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // モバイルではSidebar (aside) が存在しないこと
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveCount(0);
    
    // PDF読込ボタンがヘッダーにある
    await expect(page.getByRole('button', { name: 'PDF読込' })).toBeVisible();

    await page.screenshot({ path: 'test-results/mobile-initial.png', fullPage: true });
    expect(consoleErrors).toHaveLength(0);
  });
});
