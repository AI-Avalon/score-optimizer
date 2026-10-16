import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLE_PDF = path.join(process.cwd(), 'tests', 'fixtures', 'SKM_550i26091214160_2.pdf');

test.describe('Score Optimizer Comprehensive QA Suite', () => {
  // 1. 初期状態＆ファイル読込
  test('TC01: 空状態UIが正常であり、PDF読み込み後にCanvasが描画されること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('RenderingCancelledException') && !text.includes('cancelled')) {
          errors.push(text);
        }
      }
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('http://localhost:5173');

    // 空状態ではファイルを開くボタンが表示され、PDF出力ボタンやズームHUDは非表示であること
    await expect(page.locator('button:has-text("PDFファイルを開く")')).toBeVisible();
    await expect(page.locator('button:has-text("PDFを出力")')).toHaveCount(0);
    await expect(page.locator('[data-testid="zoom-in"]')).toHaveCount(0);

    // PDF読み込み
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    // Canvas描画と複数ページ読み込みの確認
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await expect.poll(async () => {
      return await canvas.evaluate((el: HTMLCanvasElement) => el.width > 0 && el.height > 0);
    }, { timeout: 10000 }).toBe(true);

    const totalPages = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().totalPages;
    });
    expect(totalPages).toBeGreaterThan(1);
    expect(errors).toEqual([]);
  });

  // 2. PC版 クロップ＆幾何拘束テスト
  test('TC02: PC環境でクロップハンドル[data-handle-id="br"]をドラッグして枠が縮小し、Store値が更新されること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    // 単ページ・アスペクト比ロックOFFに設定
    await page.evaluate(() => {
      // @ts-ignore
      const store = window.useScoreStore.getState();
      store.setIsAspectRatioLocked(false);
      store.updateSettings({ pageProcessingMode: 'single_fit' });
    });
    await page.waitForTimeout(300);

    // 8点ハンドル (data-crop-target / data-handle-id) の存在確認
    const handleCount = await page.locator('.score-crop-node[data-crop-target]').count();
    expect(handleCount).toBeGreaterThanOrEqual(8);

    const initialCrop = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().cropRect;
    });
    const cropBoxLocator = page.locator('[data-handle-id="pan"][data-frame-id="main"]').first();
    const initialDomBox = await cropBoxLocator.boundingBox();
    expect(initialDomBox).not.toBeNull();

    const brHandle = page.locator('.score-crop-node[data-handle-id="br"]').first();
    await expect(brHandle).toBeVisible();
    const handleBox = await brHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    if (!handleBox || !initialDomBox) return;

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 30, startY - 30, { steps: 5 });
    await page.mouse.move(startX - 60, startY - 60, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    const updatedCrop = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().cropRect;
    });
    const updatedDomBox = await cropBoxLocator.boundingBox();
    expect(updatedDomBox).not.toBeNull();
    if (!updatedDomBox) return;

    // BoundingBox と Store 内の crop 値が縮小し、境界 [0, 1] 内にクランプされていること
    expect(updatedDomBox.width).toBeLessThan(initialDomBox.width - 20);
    expect(updatedDomBox.height).toBeLessThan(initialDomBox.height - 20);
    expect(updatedCrop.width).toBeLessThan(initialCrop.width);
    expect(updatedCrop.height).toBeLessThan(initialCrop.height);
    expect(updatedCrop.x).toBeGreaterThanOrEqual(0);
    expect(updatedCrop.y).toBeGreaterThanOrEqual(0);
    expect(updatedCrop.x + updatedCrop.width).toBeLessThanOrEqual(1);
    expect(updatedCrop.y + updatedCrop.height).toBeLessThanOrEqual(1);
  });

  test('TC03: アスペクト比ロックON時、ドラッグ後の枠の横縦比率が指定用紙比率と誤差1%以内で一致すること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    // B4縦・単ページ・アスペクト比ロックON
    await page.evaluate(() => {
      // @ts-ignore
      const store = window.useScoreStore.getState();
      store.setSelectedPaper('b4_portrait');
      store.setIsAspectRatioLocked(true);
      store.updateSettings({ pageProcessingMode: 'single_fit' });
    });
    await page.waitForTimeout(300);

    const brHandle = page.locator('.score-crop-node[data-handle-id="br"]').first();
    await expect(brHandle).toBeVisible();
    const handleBox = await brHandle.boundingBox();
    expect(handleBox).not.toBeNull();
    if (!handleBox) return;

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // 非対称なドラッグを行ってアスペクト比拘束を検証
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 70, startY - 25, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    const { updatedCrop, targetRatio, actualPageAspect } = await page.evaluate(async () => {
      // @ts-ignore
      const state = window.useScoreStore.getState();
      const paperConfig = state.getPaperConfig();
      const targetRatio = paperConfig.widthPt / paperConfig.heightPt;
      const pageProxy = await state.pdfDoc.getPage(1);
      const rotation = state.pages[0]?.rotation || 0;
      const vp = pageProxy.getViewport({ scale: 1.0, rotation });
      return {
        updatedCrop: state.cropRect,
        targetRatio,
        actualPageAspect: vp.width / vp.height,
      };
    });

    const cropRatio = (updatedCrop.width * actualPageAspect) / updatedCrop.height;
    const relativeError = Math.abs(cropRatio - targetRatio) / targetRatio;

    // 誤差1% (0.01) 以内で一致すること
    expect(relativeError).toBeLessThan(0.01);
  });

  test('TC04: 微動(Nudge)ボタンをクリックした際、枠の座標が正確に加算・減算されること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    // 初期枠を (0.1, 0.1, 0.8, 0.8) に設定
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().commitCropRect({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
    });

    // 右へ2回 (+0.01)、下へ1回 (+0.005)
    await page.locator('[data-testid="nudge-right"]').click();
    await page.locator('[data-testid="nudge-right"]').click();
    await page.locator('[data-testid="nudge-down"]').click();

    const afterAdd = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().cropRect;
    });
    expect(afterAdd.x).toBeCloseTo(0.11, 4);
    expect(afterAdd.y).toBeCloseTo(0.105, 4);

    // 左へ1回 (-0.005)、上へ1回 (-0.005)
    await page.locator('[data-testid="nudge-left"]').click();
    await page.locator('[data-testid="nudge-up"]').click();

    const afterSub = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().cropRect;
    });
    expect(afterSub.x).toBeCloseTo(0.105, 4);
    expect(afterSub.y).toBeCloseTo(0.1, 4);
  });

  test('TC05: クロップ枠の中央ドラッグ(Pan)で枠サイズを維持したまま平行移動できること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);

    await page.evaluate(() => {
      // @ts-ignore
      const store = window.useScoreStore.getState();
      store.updateSettings({ pageProcessingMode: 'single_fit' });
      store.commitCropRect({ x: 0.15, y: 0.15, width: 0.6, height: 0.6 });
    });
    await page.waitForTimeout(200);

    const panArea = page.locator('[data-handle-id="pan"][data-frame-id="main"]').first();
    const box = await panArea.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 45, centerY + 35, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    const movedCrop = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().cropRect;
    });

    // 位置(x, y)が移動し、サイズ(width, height)が完全維持されていること
    expect(movedCrop.x).toBeGreaterThan(0.16);
    expect(movedCrop.y).toBeGreaterThan(0.16);
    expect(movedCrop.width).toBeCloseTo(0.6, 4);
    expect(movedCrop.height).toBeCloseTo(0.6, 4);
  });

  // 3. ズーム＆回転テスト
  test('TC06: ズームHUDの[+]および[-]クリックでCanvasの表示スケールが拡大・縮小すること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    const initialWidth = await canvas.evaluate((el: HTMLCanvasElement) => el.width);

    // [+] クリックで拡大
    await page.locator('[data-testid="zoom-in"]').click();
    await expect.poll(async () => {
      return await canvas.evaluate((el: HTMLCanvasElement) => el.width);
    }, { timeout: 10000 }).toBeGreaterThan(initialWidth);

    const zoomedInWidth = await canvas.evaluate((el: HTMLCanvasElement) => el.width);

    // [-] クリックで縮小
    await page.locator('[data-testid="zoom-out"]').click();
    await expect.poll(async () => {
      return await canvas.evaluate((el: HTMLCanvasElement) => el.width);
    }, { timeout: 10000 }).toBeLessThan(zoomedInWidth);
  });

  test('TC07: 回転ボタン押下でStoreのrotationが更新され、Canvasの縦横寸法比率が入れ替わること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    const initialAspect = await canvas.evaluate((el: HTMLCanvasElement) => el.width / el.height);

    // 90° 回転ボタン押下
    await page.locator('button:has-text("現在ページ 90°")').click();

    const storeRotation = await page.evaluate(() => {
      // @ts-ignore
      const state = window.useScoreStore.getState();
      return state.pages[state.currentPage].rotation;
    });
    expect(storeRotation).toBe(90);

    // Canvasの縦横比が逆転すること
    await expect.poll(async () => {
      return await canvas.evaluate((el: HTMLCanvasElement) => el.width / el.height);
    }, { timeout: 10000 }).toBeCloseTo(1 / initialAspect, 1);
  });

  // 4. 個別設定(PageOverride)の完全性テスト
  test('TC08: 1ページ目をB4・余白5mm、2ページ目をA4・余白10mmに設定し、ページを行き来しても設定が100%保持されていること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    const paperSelect = page.locator('aside select').first();
    const marginInput = page.locator('[data-testid="margin-input"]');

    // 1ページ目 (index 0): B4・余白5mm
    await paperSelect.selectOption('b4_portrait');
    await marginInput.fill('5');
    await marginInput.dispatchEvent('change');

    // 2ページ目 (index 1) へ移動: A4・余白10mm
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setCurrentPage(1);
    });
    await page.waitForTimeout(200);

    await paperSelect.selectOption('a4_portrait');
    await marginInput.fill('10');
    await marginInput.dispatchEvent('change');

    // 1ページ目へ戻って検証
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setCurrentPage(0);
    });
    await page.waitForTimeout(200);

    await expect(paperSelect).toHaveValue('b4_portrait');
    await expect(marginInput).toHaveValue('5');
    const p1State = await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      return { selectedPaper: s.selectedPaper, marginMm: s.marginMm };
    });
    expect(p1State).toEqual({ selectedPaper: 'b4_portrait', marginMm: 5 });

    // 2ページ目へ再度移動して検証
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setCurrentPage(1);
    });
    await page.waitForTimeout(200);

    await expect(paperSelect).toHaveValue('a4_portrait');
    await expect(marginInput).toHaveValue('10');
    const p2State = await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      return { selectedPaper: s.selectedPaper, marginMm: s.marginMm };
    });
    expect(p2State).toEqual({ selectedPaper: 'a4_portrait', marginMm: 10 });
  });

  test('TC09: 2ページ目で[全ページに適用]を押した際、1ページ目の設定が2ページ目と同一に更新されること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    // 1ページ目を B4・余白5mm に設定
    await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      s.setCurrentPage(0);
      s.setSelectedPaper('b4_portrait');
      s.setMarginMm(5);
    });

    // 2ページ目を A4・余白12mm・単ページ に設定
    await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      s.setCurrentPage(1);
      s.setSelectedPaper('a4_portrait');
      s.setMarginMm(12);
      s.savePageOverride();
      s.updateSettings({ pageProcessingMode: 'single_fit', manualTrimLeftPercent: 6 });
    });
    await page.waitForTimeout(200);

    // 2ページ目で「全ページに適用」ボタンをクリック
    await page.locator('aside button:has-text("全ページに適用")').click();
    await page.waitForTimeout(200);

    // 1ページ目へ移動し、2ページ目の設定と完全一致していることを確認
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setCurrentPage(0);
    });
    await page.waitForTimeout(200);

    const stateAfterApply = await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      return {
        selectedPaper: s.selectedPaper,
        marginMm: s.marginMm,
        mode: s.settings.pageProcessingMode,
        trimLeft: s.settings.manualTrimLeftPercent,
        overridesCount: Object.keys(s.pageOverrides).length,
      };
    });

    expect(stateAfterApply).toEqual({
      selectedPaper: 'a4_portrait',
      marginMm: 12,
      mode: 'single_fit',
      trimLeft: 6,
      overridesCount: 0,
    });
  });

  test('TC10: 個別設定中のページで[全体設定に戻す]を押した際、全体設定の値にリセットされること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    // 全体設定を B4・余白0mm・見開き分割 に確定
    await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      s.resetToDefaults();
      s.setSelectedPaper('b4_portrait');
      s.applySettingsToAllPages();
      s.setCurrentPage(1);
    });
    await page.waitForTimeout(200);

    // 2ページ目を個別設定化し、A4・余白15mm・単ページ に変更
    await page.locator('button:has-text("このページを保存")').click();
    await page.locator('aside select').first().selectOption('a4_portrait');
    const marginInput = page.locator('[data-testid="margin-input"]');
    await marginInput.fill('15');
    await marginInput.dispatchEvent('change');
    await page.locator('div.radio-option:has-text("単ページ")').first().click();

    // [全体設定に戻す] をクリック
    const resetOverrideBtn = page.locator('[data-testid="remove-page-override"]');
    await expect(resetOverrideBtn).toBeVisible();
    await resetOverrideBtn.click();
    await page.waitForTimeout(200);

    // 全体設定 (b4_portrait, marginMm: 0, spread_split) に戻っていること
    const restoredState = await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      return {
        hasOverride: !!s.pageOverrides[1],
        selectedPaper: s.selectedPaper,
        marginMm: s.marginMm,
        mode: s. getEffectiveSettings(1).pageProcessingMode,
      };
    });

    expect(restoredState).toEqual({
      hasOverride: false,
      selectedPaper: 'b4_portrait',
      marginMm: 0,
      mode: 'spread_split',
    });
  });

  // 5. モバイル環境テスト (390x844 / iPhone)
  test('TC11: モバイル表示で楽譜Canvasがコンテナの60%以上の領域を専有していること', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    const viewer = page.locator('[data-testid="mobile-score-viewer"]');
    const scoreImg = page.locator('[data-testid="mobile-score-canvas"]');
    await expect(viewer).toBeVisible({ timeout: 15000 });
    await expect(scoreImg).toBeVisible({ timeout: 15000 });

    const rootBox = await page.locator('.mobile-layout-root').boundingBox();
    const viewerBox = await viewer.boundingBox();
    expect(rootBox).not.toBeNull();
    expect(viewerBox).not.toBeNull();
    if (!rootBox || !viewerBox) return;

    const areaRatio = (viewerBox.width * viewerBox.height) / (rootBox.width * rootBox.height);
    expect(areaRatio).toBeGreaterThanOrEqual(0.6);
  });

  test('TC12: モバイル親指バーで[✋ スクロール]と[✂️ 枠調整]のモード切り替えが正常に機能すること', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('[data-testid="mobile-score-canvas"]')).toBeVisible({ timeout: 15000 });

    const cropModeBtn = page.locator('[data-testid="mode-crop"]');
    const scrollModeBtn = page.locator('[data-testid="mode-scroll"]');

    await cropModeBtn.click();
    const modeAfterCrop = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().touchMode;
    });
    expect(modeAfterCrop).toBe('crop');

    await scrollModeBtn.click();
    const modeAfterScroll = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().touchMode;
    });
    expect(modeAfterScroll).toBe('scroll');
  });

  test('TC13: モバイルボトムシートのタブ切り替えと、最下部固定の[全ページに適用]ボタンが動作すること', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('[data-testid="mobile-score-canvas"]')).toBeVisible({ timeout: 15000 });

    // ボトムシートを開く
    await page.locator('button[aria-label="設定"]').click();
    const applyAllBtn = page.locator('button:has-text("全ページに適用")');
    await expect(applyAllBtn).toBeVisible();

    // 各タブを切り替えても「全ページに適用」ボタンが常時表示されていること
    await page.locator('[data-testid="tab-crop"]').click();
    await expect(applyAllBtn).toBeVisible();

    await page.locator('[data-testid="tab-filter"]').click();
    await expect(applyAllBtn).toBeVisible();
    // 白黒二値化をONにする
    await page.locator('label:has-text("白黒二値化") input[type="checkbox"]').check();

    await page.locator('[data-testid="tab-page"]').click();
    await expect(applyAllBtn).toBeVisible();

    await page.locator('[data-testid="tab-paper"]').click();
    await expect(applyAllBtn).toBeVisible();
    await page.locator('[data-testid="paper-select"]').selectOption('a4_portrait');

    // [全ページに適用] をクリックして反映＆シートが閉じること
    await applyAllBtn.click();
    await expect(page.locator('[data-testid="mobile-bottom-sheet"]')).toHaveCount(0);

    const appliedState = await page.evaluate(() => {
      // @ts-ignore
      const s = window.useScoreStore.getState();
      return {
        paper: s.selectedPaper,
        colorMode: s.settings.outputColorMode,
      };
    });
    expect(appliedState).toEqual({ paper: 'a4_portrait', colorMode: 'monochrome' });
  });

  test('TC14: 画面上のUndoボタンがクリック可能であり、直前の操作が取り消されること', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('[data-testid="mobile-score-canvas"]')).toBeVisible({ timeout: 15000 });

    // 初期枠を (0.1, 0.1, 0.8, 0.8) にセット
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().commitCropRect({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
    });

    // 枠微動シートから右へ1回 (+0.005) 移動
    await page.locator('button[aria-label="枠微動"]').click();
    await page.locator('[data-testid="nudge-right"]').click();
    // 背景タップでシートを閉じる
    await page.mouse.click(10, 10);

    const nudgedX = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().cropRect.x;
    });
    expect(nudgedX).toBeCloseTo(0.105, 4);

    // 画面上の Undo ボタンをクリックして直前の操作を取り消す
    const undoBtn = page.locator('[data-testid="undo-btn"]');
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    const undoneX = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().cropRect.x;
    });
    expect(undoneX).toBeCloseTo(0.1, 4);
  });

  // 6. 連続耐久・メモリリークテスト
  test('TC15: モバイル環境で次ページボタンを素早く10回連続クリックしても、エラーダイアログやクラッシュ、初期画面巻き戻りが発生しないこと', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('RenderingCancelledException') && !text.includes('cancelled')) {
          errors.push(text);
        }
      }
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('http://localhost:5173');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(SAMPLE_PDF);

    await expect(page.locator('[data-testid="mobile-score-canvas"]')).toBeVisible({ timeout: 15000 });

    const nextBtn = page.locator('button[aria-label="次"]');
    for (let i = 0; i < 10; i++) {
      if (await nextBtn.isDisabled()) break;
      await nextBtn.click();
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(800);

    // エラー0件、ErrorBoundary非表示、初期画面への巻き戻りなし、キャンバス表示維持
    expect(errors).toEqual([]);
    await expect(page.locator('text=描画エラーが発生しました')).toHaveCount(0);
    await expect(page.locator('text=楽譜PDFを選択')).toHaveCount(0);
    await expect(page.locator('[data-testid="mobile-score-canvas"]')).toBeVisible();

    const currentPage = await page.evaluate(() => {
      // @ts-ignore
      return window.useScoreStore.getState().currentPage;
    });
    expect(currentPage).toBe(10);
  });
});
