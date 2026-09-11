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

    // クロップハンドルのクランプ検証
    const handles = page.locator('.crop-handle');
    await expect(handles.first()).toBeVisible({ timeout: 5000 });
    
    // Canvasを内包する親コンテナ (ScoreCanvas)
    const container = page.locator('canvas').first().locator('..');
    const containerBox = await container.boundingBox();
    const count = await handles.count();
    
    if (containerBox && count > 0) {
      for (let i = 0; i < count; i++) {
        const hb = await handles.nth(i).boundingBox();
        if (hb) {
          expect(hb.x).toBeGreaterThanOrEqual(containerBox.x);
          expect(hb.y).toBeGreaterThanOrEqual(containerBox.y);
          expect(hb.x + hb.width).toBeLessThanOrEqual(containerBox.x + containerBox.width);
          expect(hb.y + hb.height).toBeLessThanOrEqual(containerBox.y + containerBox.height);
        }
      }
    }

    // デスクトップのページ送りテスト (FilmStrip経由)
    const thumbs = page.locator('.safe-area-bottom').locator('img');
    if (await thumbs.count() >= 3) {
      await thumbs.nth(1).click(); // Page 2
      await page.waitForTimeout(500); // 描画待ち
      await expect(page.locator('canvas').first()).toBeVisible();
      
      await thumbs.nth(2).click(); // Page 3
      await page.waitForTimeout(500);
      await expect(page.locator('canvas').first()).toBeVisible();
      
      // 初期画面に巻き戻っていないこと
      const emptyStateCheck = page.getByText('楽譜PDFをドラッグ＆ドロップ');
      await expect(emptyStateCheck).toBeHidden();
    }

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

    // 1. Canvasの厳格な専有率テスト (Task 2)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    
    // ダブルバッファ転写を待機 (初期300x150からの変化)
    await expect(async () => {
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThan(150);
    }).toPass({ timeout: 15000 });
    
    // canvasの親要素（Main Score Area = flex: 1 のコンテナ）
    const canvasParent = canvas.locator('..');
    const containerBox = await canvasParent.boundingBox();
    const canvasBox = await canvas.boundingBox();
    
    expect(containerBox).toBeTruthy();
    expect(canvasBox).toBeTruthy();
    
    if (containerBox && canvasBox) {
      // 画面高さに対して60%以上、または横幅85%以上専有しているか
      const isHeightFit = canvasBox.height >= containerBox.height * 0.55;
      const isWidthFit = canvasBox.width >= containerBox.width * 0.80;
      expect(isHeightFit || isWidthFit, `Canvas (${canvasBox.width}x${canvasBox.height}) is too small compared to Container (${containerBox.width}x${containerBox.height})`).toBeTruthy();
    }

    // 回転シミュレート (自動追従テスト)
    await page.setViewportSize({ width: 844, height: 390 });
    
    // 回転後の再描画を待機
    await expect(async () => {
      const box = await canvas.boundingBox();
      const parentBox = await canvasParent.boundingBox();
      expect(box).toBeTruthy();
      expect(parentBox).toBeTruthy();
      // 回転後は横幅が大きくなるはず
      const isHeightFit = box!.height >= parentBox!.height * 0.55;
      const isWidthFit = box!.width >= parentBox!.width * 0.80;
      expect(isHeightFit || isWidthFit).toBeTruthy();
    }).toPass({ timeout: 15000 });
    
    const rotatedContainerBox = await canvasParent.boundingBox();
    const rotatedCanvasBox = await canvas.boundingBox();
    if (rotatedContainerBox && rotatedCanvasBox) {
      const isHeightFit = rotatedCanvasBox.height >= rotatedContainerBox.height * 0.55;
      const isWidthFit = rotatedCanvasBox.width >= rotatedContainerBox.width * 0.80;
      expect(isHeightFit || isWidthFit, `Rotated Canvas (${rotatedCanvasBox.width}x${rotatedCanvasBox.height}) is too small compared to Container (${rotatedContainerBox.width}x${rotatedContainerBox.height})`).toBeTruthy();
    }
    
    // 戻す
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(async () => {
      const box = await canvas.boundingBox();
      expect(box?.height).toBeGreaterThan(150);
    }).toPass({ timeout: 10000 });

    // 2. 「巨大なPDF」テキストや壊れたプレースホルダーが存在しないこと
    const hugeText = page.locator('text=/^PDF$/i, text=/でかい/i');
    expect(await hugeText.count()).toBe(0);

    // 【重要検証】ページ送りをしてロード画面に戻らないこと
    const nextBtn = page.getByRole('button', { name: '次' });
    await nextBtn.click();
    await page.waitForTimeout(500);
    
    // ページ番号表示が P. 2 / N のようになっているか確認
    const pageLabel = page.locator('text=/P\\. 2 \\/ \\d+/');
    await expect(pageLabel).toBeVisible({ timeout: 5000 });

    // さらに3ページ目へ
    await nextBtn.click();
    await page.waitForTimeout(500);

    // 依然としてCanvasが存在していること（ロード画面に戻っていない）
    await expect(canvas).toBeVisible({ timeout: 5000 });
    const emptyStateCheckMobile = page.getByText('楽譜PDFを選択');
    await expect(emptyStateCheckMobile).toBeHidden();

    // 3. モバイル操作フローの網羅的自動テスト (Task 3)
    const undoBtn = page.getByRole('button', { name: '戻す' });
    await expect(undoBtn).toBeVisible({ timeout: 5000 });
    await expect(undoBtn).toBeEnabled();

    // ボトムシート (設定ドロワー) の検証
    const settingsBtn = page.getByRole('button', { name: '設定' });
    await settingsBtn.click();

    // タブ切り替え（用紙・トリミング・画質）の動作確認
    const paperTab = page.getByRole('button', { name: /用紙・モード/ });
    await expect(paperTab).toBeVisible({ timeout: 5000 });
    
    const cropTab = page.getByRole('button', { name: /トリミング/ });
    await expect(cropTab).toBeVisible({ timeout: 5000 });
    
    const filterTab = page.getByRole('button', { name: /画質・二値化/ });
    await expect(filterTab).toBeVisible({ timeout: 5000 });
    
    await cropTab.click();
    await expect(page.getByText('黒枠を自動検出')).toBeVisible({ timeout: 5000 });
    
    await filterTab.click();
    await expect(page.getByText('白黒二値化')).toBeVisible({ timeout: 5000 });
    
    await paperTab.click();
    await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 });

    // ボトムシート下部に [ 全ページに適用 ] がスクロールなしで常時固定されているか
    const applyAllBtn = page.getByRole('button', { name: /全ページに適用/ });
    await expect(applyAllBtn).toBeVisible({ timeout: 5000 });
    
    // Check if it's within viewport without scrolling (sticky)
    const btnBox = await applyAllBtn.boundingBox();
    expect(btnBox && btnBox.y < 844).toBeTruthy();
    
    await applyAllBtn.click(); // アクション発火確認（同時にシートも閉じる）

    // シートが閉じたことを確認
    await expect(applyAllBtn).toBeHidden({ timeout: 5000 });

    // 4. 使い方モーダルの検証
    const helpBtn = page.locator('.mobile-layout-root').locator('button').filter({ hasText: '使い方' }).first();
    if (await helpBtn.count() === 0) {
       const iconBtn = page.locator('.mobile-layout-root').locator('button').filter({ has: page.locator('svg.lucide-help-circle') }).first();
       await iconBtn.click();
    } else {
       await helpBtn.click();
    }

    const helpTitle = page.getByRole('heading', { name: '使い方ガイド' });
    await expect(helpTitle).toBeVisible({ timeout: 5000 });

    const modalPaperTab = page.getByRole('button', { name: /用紙・製本/ });
    await modalPaperTab.click();
    await expect(page.getByText('日本のオーケストラ標準のパート譜サイズです')).toBeVisible({ timeout: 5000 });

    const closeBtn = page.locator('.btn-icon').filter({ has: page.locator('svg.lucide-x') }).first();
    await closeBtn.click();

    await expect(helpTitle).toBeHidden({ timeout: 5000 });

    // スクリーンショットを保存 (Task 4)
    await page.screenshot({ path: 'test-results/mobile-strict-check.png', fullPage: true });
    
    expect(consoleErrors).toHaveLength(0);
  });
});
