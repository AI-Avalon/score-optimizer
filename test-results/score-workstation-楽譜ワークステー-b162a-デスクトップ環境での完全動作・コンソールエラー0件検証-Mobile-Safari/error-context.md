# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: score-workstation.spec.ts >> 楽譜ワークステーションの実機ブラウザ検証 >> デスクトップ環境での完全動作・コンソールエラー0件検証
- Location: tests/score-workstation.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('canvas').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('canvas').first() with timeout 15000ms
  - waiting for locator('canvas').first()

```

```yaml
- banner:
  - button "PDF読込" [disabled]
  - button "テストPDFを読込" [disabled]
  - button "300DPI 書き出し" [disabled]
- heading "ページ処理" [level=3]
- radio "見開き分割" [checked]
- text: 見開き分割
- radio "単ページ幅統一"
- text: 単ページ幅統一
- heading "出力色" [level=3]
- radio "白黒" [checked]
- text: 白黒
- radio "元のまま"
- text: 元のまま
- checkbox "適応的二値化 (照明ムラ向け)"
- text: 適応的二値化 (照明ムラ向け) 固定しきい値 170
- slider: "170"
- heading "自動クロップ" [level=3]
- checkbox "自動トリミングを有効化" [checked]
- text: 自動トリミングを有効化 黒余白しきい値 20
- slider: "20"
- text: クロップ余白 (px) 8
- slider: "8"
- heading "手動トリム (%)" [level=3]
- text: top 0.0%
- slider: "0"
- text: bottom 0.0%
- slider: "0"
- text: left 0.0%
- slider: "0"
- text: right 0.0%
- slider: "0"
- heading "分割設定" [level=3]
- text: 分割位置補正 (%) 0.0%
- slider: "0"
- text: ページ順
- radio "左→右" [checked]
- text: 左→右
- radio "右→左"
- text: 右→左
- heading "ページ個別設定" [level=3]
- text: 現在表示中のページだけを個別設定として保存できます。 ページが選択されていません PDFを読み込んでください
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('楽譜ワークステーションの実機ブラウザ検証', () => {
  4  |   test('デスクトップ環境での完全動作・コンソールエラー0件検証', async ({ page }) => {
  5  |     const consoleErrors: string[] = [];
  6  |     page.on('console', (msg) => {
  7  |       if (msg.type() === 'error') consoleErrors.push(msg.text());
  8  |     });
  9  |     page.on('pageerror', (err) => consoleErrors.push(err.message));
  10 | 
  11 |     await page.goto('/');
  12 |     await page.waitForLoadState('networkidle');
  13 | 
  14 |     // テストPDF読込ボタンのクリック
  15 |     const loadBtn = page.getByRole('button', { name: /見開きテスト|テストPDF/i });
  16 |     await expect(loadBtn).toBeVisible();
  17 |     await loadBtn.click();
  18 | 
  19 |     // メインCanvasの描画待機
  20 |     const canvas = page.locator('canvas').first();
> 21 |     await expect(canvas).toBeVisible({ timeout: 15000 });
     |                          ^ Error: expect(locator).toBeVisible() failed
  22 | 
  23 |     // サムネイルの表示確認
  24 |     await page.waitForTimeout(1000);
  25 |     const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  26 |     const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  27 |     expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  28 | 
  29 |     // スクリーンショット保存
  30 |     await page.screenshot({ path: 'test-results/desktop-success.png', fullPage: true });
  31 | 
  32 |     // コンソールエラー0件チェック (RenderingCancelledException も含め一切のエラーを許容しない)
  33 |     expect(consoleErrors).toHaveLength(0);
  34 |   });
  35 | 
  36 |   test('モバイル環境での見切れゼロ検証', async ({ page }) => {
  37 |     await page.goto('/');
  38 |     await page.waitForLoadState('networkidle');
  39 | 
  40 |     const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  41 |     const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  42 |     expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  43 | 
  44 |     await page.screenshot({ path: 'test-results/mobile-success.png', fullPage: true });
  45 |   });
  46 | });
  47 | 
```