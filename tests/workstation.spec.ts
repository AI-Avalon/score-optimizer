import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Score Optimizer 2.0 Workstation Tests', () => {

  test('Mobile: should not crash after 10 page turns and individual page overrides should work', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

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

    await page.goto('http://localhost:5173');

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

    // 3. Page Override Test (Mobile)
    await page.locator('button[aria-label="設定"]').click();
    
    // Switch to 'page' tab (個別・回転)
    await page.locator('button:has-text("個別・回転")').click();
    
    // Create override
    await page.locator('button:has-text("このページだけ個別設定にする")').click();

    // Verify override is active (toast or badge)
    await expect(page.locator('text=[ 個別設定中 ]').first()).toBeVisible();
    
    // Close settings by clicking backdrop
    await page.mouse.click(10, 10);
    
    // Go to previous page
    const prevBtn = page.locator('button[aria-label="前"]');
    await prevBtn.click();
    await page.waitForTimeout(300);
    
    // Badge shouldn't be on the previous page
    await expect(page.locator('text=[ 個別設定中 ]')).toHaveCount(0);
  });

  test('PC: should render ad-block safe crop handles that are always visible', async ({ page }) => {
    // Set PC viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('http://localhost:5173');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(process.cwd(), 'tests', 'fixtures', '見開きテスト.pdf'));

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000); // Wait for render

    // In single_fit mode (or whatever mode), verify the handles exist.
    // The class name MUST NOT be 'crop-handle' or anything suspicious. We expect 'crop-resize-node'.
    // Wait for at least one node to appear
    await expect(page.locator('.crop-resize-node').first()).toBeVisible();
    
    const count = await page.locator('.crop-resize-node').count();
    expect(count).toBeGreaterThanOrEqual(8);

    // Verify that the handles are visible and pointer-events: auto
    const firstHandle = page.locator('.crop-resize-node').first();
    const displayStyle = await firstHandle.evaluate((node) => {
      const style = window.getComputedStyle(node);
      return { opacity: style.opacity, pointerEvents: style.pointerEvents };
    });
    
    expect(parseFloat(displayStyle.opacity)).toBeGreaterThan(0);
    expect(displayStyle.pointerEvents).toBe('auto');

    // Switch touch mode to 'scroll' and verify PC handles are still visible
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setTouchMode('scroll');
    });
    await page.waitForTimeout(100);

    const displayStyleAfter = await firstHandle.evaluate((node) => {
      const style = window.getComputedStyle(node);
      return { opacity: style.opacity, pointerEvents: style.pointerEvents };
    });
    
    expect(parseFloat(displayStyleAfter.opacity)).toBeGreaterThan(0);
    expect(displayStyleAfter.pointerEvents).toBe('auto');
  });

  test('PC: Rotation should apply correctly to the PDF viewport rendering', async ({ page }) => {
    // Set PC viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('http://localhost:5173');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(process.cwd(), 'tests', 'fixtures', '見開きテスト.pdf'));

    const canvasLocator = page.locator('canvas').first();
    await expect(canvasLocator).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500); // Allow render to complete

    // Get initial canvas size
    const initialSize = await canvasLocator.evaluate((node: HTMLCanvasElement) => ({ width: node.width, height: node.height }));
    const initialAspect = initialSize.width / initialSize.height;

    // Desktop Sidebar has no tabs, it just scrolls.
    // Click "現在ページ 90°" button
    await page.locator('button:has-text("現在ページ 90°")').click();
    await page.waitForTimeout(1500); // Allow re-render

    // Use expect.poll to wait for the aspect ratio to change after rotation
    await expect.poll(async () => {
      const size = await canvasLocator.evaluate((node: HTMLCanvasElement) => ({ width: node.width, height: node.height }));
      return size.width / size.height;
    }, { timeout: 10000, message: `Waiting for aspect ratio to change from ${initialAspect}` }).not.toBeCloseTo(initialAspect, 1);
  });

  test('PC: Page Override sizes are correctly preserved when navigating', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(process.cwd(), 'tests', 'fixtures', '見開きテスト.pdf'));
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setCurrentPage(0);
    });
    
    // Desktop Sidebar has no tabs.
    // Create override using the Sidebar button
    await page.locator('button:has-text("このページを保存")').click();
    
    // Click single_fit for page 1
    await page.locator('div.radio-option:has-text("単ページ")').first().click();
    
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setCurrentPage(1);
    });
    await page.waitForTimeout(500);

    // Page 2 should still be spread_split
    const singleOpt = page.locator('div.radio-option:has-text("単ページ")').first();
    const spreadOpt = page.locator('div.radio-option:has-text("見開き分割")').first();
    
    await expect(spreadOpt).toHaveClass(/active/);
    await expect(singleOpt).not.toHaveClass(/active/);
    
    // Back to page 1
    await page.evaluate(() => {
      // @ts-ignore
      window.useScoreStore.getState().setCurrentPage(0);
    });
    await page.waitForTimeout(500);
    
    await expect(singleOpt).toHaveClass(/active/);
    await expect(spreadOpt).not.toHaveClass(/active/);
  });
});
