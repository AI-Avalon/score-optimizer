import { test, expect } from '@playwright/test';

// ── デスクトップテスト ──────────────────────────────────────────────

test.describe('デスクトップ検証', () => {
  test('初期表示・用紙選択・コンソールエラー0件', async ({ page }, testInfo) => {
    // モバイルプロジェクトではスキップ
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

    // ドロップゾーンの空状態が表示
    const emptyState = page.getByText('PDF をドラッグ＆ドロップ');
    await expect(emptyState).toBeVisible({ timeout: 10000 });

    // 用紙選択ドロップダウン
    const paperSelect = page.locator('[data-testid="paper-select"]');
    await expect(paperSelect).toBeVisible({ timeout: 5000 });

    // 全7種用紙プリセット
    const options = await paperSelect.locator('option').allTextContents();
    expect(options).toContain('A4 縦');
    expect(options).toContain('B4 縦 (日本のオケ標準)');
    expect(options).toContain('菊倍判 (楽譜標準)');
    expect(options).toContain('A3 横 (見開きスコア)');
    expect(options).toContain('A3 縦 (総譜)');
    expect(options).toContain('US Letter');
    expect(options).toContain('カスタム (mm入力)');

    // 横スクロールなし
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.screenshot({ path: 'test-results/desktop-initial.png', fullPage: true });
    expect(consoleErrors).toHaveLength(0);
  });

  test('Sidebar に回転・一括操作ボタンが存在', async ({ page }, testInfo) => {
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
    await expect(page.getByRole('button', { name: /全ページに適用/i })).toBeVisible({ timeout: 5000 });

    // 初期設定にリセットボタン
    await expect(page.getByRole('button', { name: /初期設定にリセット/i })).toBeVisible({ timeout: 5000 });

    // 回転コントロール
    await expect(page.getByRole('button', { name: /現在ページ 90°/i })).toBeVisible({ timeout: 5000 });

    expect(consoleErrors).toHaveLength(0);
  });
});

// ── モバイルテスト ──────────────────────────────────────────────────

test.describe('モバイル検証', () => {
  test('横スクロール見切れゼロ + 専用レイアウト', async ({ page }, testInfo) => {
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

    await page.screenshot({ path: 'test-results/mobile-initial.png', fullPage: true });
    expect(consoleErrors).toHaveLength(0);
  });
});
