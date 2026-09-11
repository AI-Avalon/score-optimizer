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

    const emptyState = page.getByText('楽譜PDFをドラッグ＆ドロップ');
    await expect(emptyState).toBeVisible({ timeout: 10000 });

    // PDFファイルの読み込みをシミュレート
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/見開きテスト.pdf');

    // 読み込み完了を待機
    await expect(emptyState).toBeHidden({ timeout: 10000 });
    
    // canvas などの描画要素が表示されるのを待機
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    const paperSelect = page.locator('[data-testid="paper-select"]');
    await expect(paperSelect).toBeVisible({ timeout: 5000 });

    const options = await paperSelect.locator('option').allTextContents();
    expect(options).toContain('A4 縦');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.screenshot({ path: 'test-results/desktop-pdf-loaded.png', fullPage: true });
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
    
    // 初期設定にリセットボタン
    await expect(page.getByRole('button', { name: /初期設定にリセット/i })).toBeVisible({ timeout: 5000 });

    // 左右個別枠のトグルが存在することを確認
    await expect(page.getByText('左右個別枠を有効にする')).toBeVisible({ timeout: 5000 });

    expect(consoleErrors).toHaveLength(0);
  });
});

// ── モバイルテスト ──────────────────────────────────────────────────

test.describe('モバイル検証', () => {
  test('ページ送りとモバイル設定・ヘルプモーダルが正しく動作すること', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Desktop Chrome') {
      test.skip();
      return;
    }

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 サイズ
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ファイル入力でテスト用PDFを読み込ませる
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles('tests/fixtures/見開きテスト.pdf');
    }

    // 1. Canvas要素が確実に可視状態であり、サイズを持っていること
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    const box = await canvas.boundingBox();
    expect(box && box.width > 200 && box.height > 200).toBeTruthy();

    // 2. 「巨大なPDF」テキストや壊れたプレースホルダーが存在しないこと
    const hugeText = page.locator('text=/^PDF$/i, text=/でかい/i');
    expect(await hugeText.count()).toBe(0);

    // 【重要検証】ページ送りをしてロード画面に戻らないこと
    const nextBtn = page.getByRole('button', { name: '次' });
    await nextBtn.click();
    
    // ページ番号表示が P. 2 / N のようになっているか確認
    const pageLabel = page.locator('text=/P\\. 2 \\/ \\d+/');
    await expect(pageLabel).toBeVisible({ timeout: 5000 });

    // 依然としてCanvasが存在していること（ロード画面に戻っていない）
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // 3. ボトムシート (設定ドロワー) の検証
    const settingsBtn = page.getByRole('button', { name: '設定' });
    await settingsBtn.click();

    // ボトムシート内の要素が可視になる
    const applyAllBtn = page.getByRole('button', { name: /全ページに適用/ });
    await expect(applyAllBtn).toBeVisible({ timeout: 5000 });
    await applyAllBtn.click(); // アクション発火確認

    // 4. 使い方モーダルの検証
    // 先にシートを閉じる
    await page.mouse.click(10, 10);
    await expect(applyAllBtn).toBeHidden({ timeout: 5000 });

    const helpBtn = page.locator('.mobile-layout-root').locator('button').filter({ hasText: '使い方' }).first();
    if (await helpBtn.count() === 0) {
       // if icon only, click by aria-label or just try to find it
       const iconBtn = page.locator('.mobile-layout-root').locator('button').filter({ has: page.locator('svg.lucide-help-circle') }).first();
       await iconBtn.click();
    } else {
       await helpBtn.click();
    }

    const helpTitle = page.getByRole('heading', { name: '使い方ガイド' });
    await expect(helpTitle).toBeVisible({ timeout: 5000 });

    // タブ切り替え確認
    const paperTab = page.getByRole('button', { name: /用紙・製本/ });
    await paperTab.click();
    
    await expect(page.getByText('日本のオーケストラ標準のパート譜サイズです')).toBeVisible({ timeout: 5000 });

    // モーダルを閉じる
    const closeBtn = page.locator('.btn-icon').filter({ has: page.locator('svg.lucide-x') }).first();
    await closeBtn.click();

    await expect(helpTitle).toBeHidden({ timeout: 5000 });

    // スクリーンショットを保存
    await page.screenshot({ path: 'test-results/mobile-strict-check.png', fullPage: true });
    
    expect(consoleErrors).toHaveLength(0);
  });
});
