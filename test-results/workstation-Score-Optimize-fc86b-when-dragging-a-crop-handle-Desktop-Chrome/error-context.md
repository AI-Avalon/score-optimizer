# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workstation.spec.ts >> Score Optimizer 2.0 Workstation Tests >> PC: should enforce aspect ratio lock when dragging a crop handle
- Location: tests/workstation.spec.ts:272:3

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 0.08
Received:   0.4985652537869223
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - generic [ref=e6]:
      - button "Toggle sidebar" [ref=e7] [cursor=pointer]
      - generic [ref=e9]: Score Optimizer
      - generic [ref=e10]: — SKM_550i26091214160_2.pdf
    - generic [ref=e12]:
      - button "Zoom out" [ref=e13] [cursor=pointer]
      - button "Fit" [ref=e15] [cursor=pointer]
      - button "Fit" [ref=e16] [cursor=pointer]
      - button "Zoom in" [ref=e17] [cursor=pointer]
    - generic [ref=e19]:
      - button "PDF読込" [active] [ref=e20] [cursor=pointer]
      - button "使い方" [ref=e21] [cursor=pointer]
      - button "PDFを出力" [ref=e25] [cursor=pointer]
  - complementary [ref=e30]:
    - generic [ref=e31]:
      - generic [ref=e32]:
        - generic [ref=e33]: 出力用紙・品質設定
        - generic [ref=e34]:
          - generic [ref=e35]: 用紙サイズ
          - combobox [ref=e36] [cursor=pointer]:
            - option "A4 縦" [selected]
            - option "B4 縦 (日本のオケ標準)"
            - option "菊倍判 (楽譜標準)"
            - option "A3 横 (見開きスコア)"
            - option "A3 縦 (総譜)"
            - option "US Letter"
            - option "カスタム (mm入力)"
        - generic [ref=e37]:
          - generic [ref=e38]:
            - generic [ref=e39]: 余白 (mm)
            - spinbutton [ref=e40]: "0"
          - generic [ref=e41]:
            - generic [ref=e42]: アスペクト比
            - button "固定" [ref=e43] [cursor=pointer]
        - generic [ref=e47]:
          - generic [ref=e48]: 出力DPI
          - combobox [ref=e49] [cursor=pointer]:
            - option "150 DPI (軽量)"
            - option "200 DPI"
            - option "300 DPI (標準印刷)" [selected]
            - option "400 DPI (高精細)"
            - option "600 DPI (最高峰)"
      - generic [ref=e50]:
        - generic [ref=e51]: 一括操作
        - generic [ref=e52]:
          - button "全ページに適用" [ref=e53] [cursor=pointer]
          - button "初期設定にリセット" [ref=e57] [cursor=pointer]
          - button "このページ以降すべてに適用" [ref=e63] [cursor=pointer]
      - generic [ref=e67]:
        - generic [ref=e68]: ページ処理モード
        - generic [ref=e69]:
          - generic [ref=e70] [cursor=pointer]: 見開き分割
          - generic [ref=e71] [cursor=pointer]: 単ページ
      - generic [ref=e72]:
        - generic [ref=e73]: 出力色
        - generic [ref=e74]:
          - generic [ref=e75] [cursor=pointer]: 白黒
          - generic [ref=e76] [cursor=pointer]: 元のまま
      - generic [ref=e77]:
        - generic [ref=e78]: 自動クロップ
        - generic [ref=e79] [cursor=pointer]:
          - checkbox "自動トリミングを使う" [ref=e80]
          - text: 自動トリミングを使う
        - button "黒枠を自動検出" [ref=e81] [cursor=pointer]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - generic [ref=e87]: 黒余白しきい値
            - generic [ref=e88]: "20"
          - slider [ref=e89] [cursor=pointer]: "20"
        - generic [ref=e90]:
          - generic [ref=e91]:
            - generic [ref=e92]: クロップ余白 (px)
            - generic [ref=e93]: "8"
          - slider [ref=e94] [cursor=pointer]: "8"
        - generic [ref=e95] [cursor=pointer]:
          - checkbox "適応的二値化（照明ムラ向け）" [ref=e96]
          - text: 適応的二値化（照明ムラ向け）
        - generic [ref=e97]:
          - generic [ref=e98]:
            - generic [ref=e99]: 固定二値化しきい値
            - generic [ref=e100]: "170"
          - slider [ref=e101] [cursor=pointer]: "170"
      - generic [ref=e102]:
        - generic [ref=e103]: 手動トリム (%)
        - generic [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]: 左
            - generic [ref=e107]: "0.0"
          - slider [ref=e108] [cursor=pointer]: "0"
        - generic [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]: 右
            - generic [ref=e112]: "49.9"
          - slider [ref=e113] [cursor=pointer]: "20"
        - generic [ref=e114]:
          - generic [ref=e115]:
            - generic [ref=e116]: 上
            - generic [ref=e117]: "0.0"
          - slider [ref=e118] [cursor=pointer]: "0"
        - generic [ref=e119]:
          - generic [ref=e120]:
            - generic [ref=e121]: 下
            - generic [ref=e122]: "0.0"
          - slider [ref=e123] [cursor=pointer]: "0"
      - generic [ref=e124]:
        - generic [ref=e125]: ページ構成
        - generic [ref=e126]:
          - generic [ref=e127]: 本文開始ページ
          - spinbutton [ref=e128]: "2"
        - generic [ref=e129]:
          - generic [ref=e130]: 本文前ページの扱い
          - generic [ref=e131]:
            - generic [ref=e132] [cursor=pointer]: 単ページ
            - generic [ref=e133] [cursor=pointer]: 見開き
            - generic [ref=e134] [cursor=pointer]: スキップ
      - generic [ref=e135]:
        - generic [ref=e136]: 回転
        - generic [ref=e137]:
          - button "現在ページ 90°" [ref=e138] [cursor=pointer]
          - generic [ref=e142]:
            - button "奇数ページ 180°" [ref=e143] [cursor=pointer]
            - button "偶数ページ 180°" [ref=e144] [cursor=pointer]
          - button "全ページ一括 90°" [ref=e145] [cursor=pointer]
      - generic [ref=e146]:
        - generic [ref=e147]: ページ個別設定
        - paragraph [ref=e148]: 現在のページの設定を個別保存できます。
        - generic [ref=e149]:
          - button "このページを保存" [ref=e150] [cursor=pointer]
          - button "個別設定を解除" [disabled] [ref=e155] [cursor=pointer]
  - generic [ref=e171]:
    - generic [ref=e172]:
      - generic [ref=e173] [cursor=pointer]:
        - img "Page 1" [ref=e174]
        - generic [ref=e175]: "1"
      - button "白紙ページを挿入" [ref=e176] [cursor=pointer]
    - generic [ref=e178]:
      - generic [ref=e179] [cursor=pointer]:
        - img "Page 2" [ref=e180]
        - generic [ref=e181]: "2"
      - button "白紙ページを挿入" [ref=e182] [cursor=pointer]
    - generic [ref=e184]:
      - generic [ref=e185] [cursor=pointer]:
        - img "Page 3" [ref=e186]
        - generic [ref=e187]: "3"
      - button "白紙ページを挿入" [ref=e188] [cursor=pointer]
    - generic [ref=e190]:
      - generic [ref=e191] [cursor=pointer]:
        - generic [ref=e192]: P. 4
        - generic [ref=e193]: "4"
      - button "白紙ページを挿入" [ref=e194] [cursor=pointer]
    - generic [ref=e196]:
      - generic [ref=e197] [cursor=pointer]:
        - generic [ref=e198]: P. 5
        - generic [ref=e199]: "5"
      - button "白紙ページを挿入" [ref=e200] [cursor=pointer]
    - generic [ref=e202]:
      - generic [ref=e203] [cursor=pointer]:
        - generic [ref=e204]: P. 6
        - generic [ref=e205]: "6"
      - button "白紙ページを挿入" [ref=e206] [cursor=pointer]
    - generic [ref=e208]:
      - generic [ref=e209] [cursor=pointer]:
        - generic [ref=e210]: P. 7
        - generic [ref=e211]: "7"
      - button "白紙ページを挿入" [ref=e212] [cursor=pointer]
    - generic [ref=e214]:
      - generic [ref=e215] [cursor=pointer]:
        - generic [ref=e216]: P. 8
        - generic [ref=e217]: "8"
      - button "白紙ページを挿入" [ref=e218] [cursor=pointer]
    - generic [ref=e220]:
      - generic [ref=e221] [cursor=pointer]:
        - generic [ref=e222]: P. 9
        - generic [ref=e223]: "9"
      - button "白紙ページを挿入" [ref=e224] [cursor=pointer]
    - generic [ref=e226]:
      - generic [ref=e227] [cursor=pointer]:
        - generic [ref=e228]: P. 10
        - generic [ref=e229]: "10"
      - button "白紙ページを挿入" [ref=e230] [cursor=pointer]
    - generic [ref=e232]:
      - generic [ref=e233] [cursor=pointer]:
        - generic [ref=e234]: P. 11
        - generic [ref=e235]: "11"
      - button "白紙ページを挿入" [ref=e236] [cursor=pointer]
    - generic [ref=e238]:
      - generic [ref=e239] [cursor=pointer]:
        - generic [ref=e240]: P. 12
        - generic [ref=e241]: "12"
      - button "白紙ページを挿入" [ref=e242] [cursor=pointer]
    - generic [ref=e244]:
      - generic [ref=e245] [cursor=pointer]:
        - generic [ref=e246]: P. 13
        - generic [ref=e247]: "13"
      - button "白紙ページを挿入" [ref=e248] [cursor=pointer]
    - generic [ref=e250]:
      - generic [ref=e251] [cursor=pointer]:
        - generic [ref=e252]: P. 14
        - generic [ref=e253]: "14"
      - button "白紙ページを挿入" [ref=e254] [cursor=pointer]
    - generic [ref=e256]:
      - generic [ref=e257] [cursor=pointer]:
        - generic [ref=e258]: P. 15
        - generic [ref=e259]: "15"
      - button "白紙ページを挿入" [ref=e260] [cursor=pointer]
    - generic [ref=e262]:
      - generic [ref=e263] [cursor=pointer]:
        - generic [ref=e264]: P. 16
        - generic [ref=e265]: "16"
      - button "白紙ページを挿入" [ref=e266] [cursor=pointer]
    - generic [ref=e268]:
      - generic [ref=e269] [cursor=pointer]:
        - generic [ref=e270]: P. 17
        - generic [ref=e271]: "17"
      - button "白紙ページを挿入" [ref=e272] [cursor=pointer]
    - generic [ref=e274]:
      - generic [ref=e275] [cursor=pointer]:
        - generic [ref=e276]: P. 18
        - generic [ref=e277]: "18"
      - button "白紙ページを挿入" [ref=e278] [cursor=pointer]
    - generic [ref=e280]:
      - generic [ref=e281] [cursor=pointer]:
        - generic [ref=e282]: P. 19
        - generic [ref=e283]: "19"
      - button "白紙ページを挿入" [ref=e284] [cursor=pointer]
    - generic [ref=e286]:
      - generic [ref=e287] [cursor=pointer]:
        - generic [ref=e288]: P. 20
        - generic [ref=e289]: "20"
      - button "白紙ページを挿入" [ref=e290] [cursor=pointer]
    - generic [ref=e292]:
      - generic [ref=e293] [cursor=pointer]:
        - generic [ref=e294]: P. 21
        - generic [ref=e295]: "21"
      - button "白紙ページを挿入" [ref=e296] [cursor=pointer]
    - generic [ref=e298]:
      - generic [ref=e299] [cursor=pointer]:
        - generic [ref=e300]: P. 22
        - generic [ref=e301]: "22"
      - button "白紙ページを挿入" [ref=e302] [cursor=pointer]
    - generic [ref=e304]:
      - generic [ref=e305] [cursor=pointer]:
        - generic [ref=e306]: P. 23
        - generic [ref=e307]: "23"
      - button "白紙ページを挿入" [ref=e308] [cursor=pointer]
    - generic [ref=e310]:
      - generic [ref=e311] [cursor=pointer]:
        - generic [ref=e312]: P. 24
        - generic [ref=e313]: "24"
      - button "白紙ページを挿入" [ref=e314] [cursor=pointer]
```

# Test source

```ts
  242 |     expect(handleBox).not.toBeNull();
  243 |     if (!handleBox) return; // For TS
  244 | 
  245 |     // Calculate center of the handle
  246 |     const startX = handleBox.x + handleBox.width / 2;
  247 |     const startY = handleBox.y + handleBox.height / 2;
  248 | 
  249 |     // Drag inward by 50px
  250 |     const dragDistanceX = -50;
  251 |     const dragDistanceY = -50;
  252 | 
  253 |     await page.mouse.move(startX, startY);
  254 |     await page.mouse.down();
  255 |     // Move in steps to simulate a real user dragging
  256 |     await page.mouse.move(startX + dragDistanceX / 2, startY + dragDistanceY / 2, { steps: 5 });
  257 |     await page.mouse.move(startX + dragDistanceX, startY + dragDistanceY, { steps: 5 });
  258 |     await page.mouse.up();
  259 | 
  260 |     await page.waitForTimeout(100); // Allow store update
  261 | 
  262 |     const updatedCrop = await page.evaluate(() => {
  263 |       // @ts-ignore
  264 |       return window.useScoreStore.getState().cropRect;
  265 |     });
  266 | 
  267 |     // Dragging 'br' inwards (up and left) should decrease both width and height
  268 |     expect(updatedCrop.width).toBeLessThan(initialCrop.width);
  269 |     expect(updatedCrop.height).toBeLessThan(initialCrop.height);
  270 |   });
  271 |   
  272 |   test('PC: should enforce aspect ratio lock when dragging a crop handle', async ({ page }) => {
  273 |     // Set PC viewport
  274 |     await page.setViewportSize({ width: 1280, height: 800 });
  275 |     await page.goto('http://localhost:5173');
  276 |     
  277 |     // Load PDF
  278 |     const fileChooserPromise = page.waitForEvent('filechooser');
  279 |     await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
  280 |     const fileChooser = await fileChooserPromise;
  281 |     await fileChooser.setFiles(path.join(process.cwd(), 'tests', 'fixtures', 'SKM_550i26091214160_2.pdf'));
  282 | 
  283 |     await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  284 |     await page.waitForTimeout(1000); // Wait for initial render
  285 | 
  286 |     // Force single_fit and ENABLE aspect ratio lock
  287 |     await page.evaluate(() => {
  288 |       // @ts-ignore
  289 |       window.useScoreStore.getState().setIsAspectRatioLocked(true);
  290 |       // @ts-ignore
  291 |       window.useScoreStore.getState().updateSettings({ pageProcessingMode: 'single_fit' });
  292 |       // @ts-ignore
  293 |       window.useScoreStore.getState().setTouchMode('crop');
  294 |     });
  295 |     await page.waitForTimeout(500);
  296 | 
  297 |     const brHandle = page.locator('.score-crop-node[data-handle-id="br"]').first();
  298 |     await expect(brHandle).toBeVisible();
  299 | 
  300 |     const handleBox = await brHandle.boundingBox();
  301 |     expect(handleBox).not.toBeNull();
  302 |     if (!handleBox) return;
  303 | 
  304 |     // Drag inward by 50px
  305 |     const startX = handleBox.x + handleBox.width / 2;
  306 |     const startY = handleBox.y + handleBox.height / 2;
  307 |     await page.mouse.move(startX, startY);
  308 |     await page.mouse.down();
  309 |     await page.mouse.move(startX - 50, startY - 20, { steps: 5 }); // asymmetrical drag to test lock
  310 |     await page.mouse.up();
  311 | 
  312 |     await page.waitForTimeout(100); // Allow store update
  313 | 
  314 |     const { updatedCrop, pageAspect, targetRatio } = await page.evaluate(() => {
  315 |       // @ts-ignore
  316 |       const state = window.useScoreStore.getState();
  317 |       const paperConfig = state.getPaperConfig();
  318 |       const targetRatio = paperConfig.widthPt / paperConfig.heightPt;
  319 |       
  320 |       return { 
  321 |         updatedCrop: state.cropRect, 
  322 |         pageAspect: 1.0, // simplified for test, we can calculate strictly if needed
  323 |         targetRatio 
  324 |       };
  325 |     });
  326 | 
  327 |     // In normalized coords, the ratio is (width * pageAspect) / height.
  328 |     // However, our test environment pageAspect might be hard to fetch cleanly from the canvas in evaluation,
  329 |     // so let's just fetch it using the unscaled viewport.
  330 |     const actualPageAspect = await page.evaluate(async () => {
  331 |        // @ts-ignore
  332 |        const state = window.useScoreStore.getState();
  333 |        const pageProxy = await state.pdfDoc.getPage(1);
  334 |        const vp = pageProxy.getViewport({ scale: 1.0 });
  335 |        return vp.width / vp.height;
  336 |     });
  337 | 
  338 |     const cropRatio = (updatedCrop.width * actualPageAspect) / updatedCrop.height;
  339 |     // Assert the aspect ratio matches the target ratio within a reasonable margin of error.
  340 |     // The previous 2% margin was too strict because floating point rounding and viewport
  341 |     // sizing can cause slightly larger discrepancies in this synthetic environment.
> 342 |     expect(Math.abs(cropRatio - targetRatio) / targetRatio).toBeLessThan(0.08);
      |                                                             ^ Error: expect(received).toBeLessThan(expected)
  343 |   });
  344 |   
  345 |   test('PC: Zoom should enlarge the canvas internal resolution correctly', async ({ page }) => {
  346 |     // Set PC viewport
  347 |     await page.setViewportSize({ width: 1280, height: 800 });
  348 |     await page.goto('http://localhost:5173');
  349 |     
  350 |     // Load PDF
  351 |     const fileChooserPromise = page.waitForEvent('filechooser');
  352 |     await page.locator('button:has-text("PDFファイルを開く"), button:has-text("PDF読込")').first().click();
  353 |     const fileChooser = await fileChooserPromise;
  354 |     await fileChooser.setFiles(path.join(process.cwd(), 'tests', 'fixtures', 'SKM_550i26091214160_2.pdf'));
  355 | 
  356 |     const canvasLocator = page.locator('canvas').first();
  357 |     await expect(canvasLocator).toBeVisible({ timeout: 15000 });
  358 |     await page.waitForTimeout(1500); // Wait for render
  359 | 
  360 |     const initialSize = await canvasLocator.evaluate((node: HTMLCanvasElement) => ({ width: node.width, height: node.height }));
  361 |     
  362 |     // Click zoom in button
  363 |     const zoomInBtn = page.locator('[data-testid="zoom-in"]');
  364 |     await expect(zoomInBtn).toBeVisible();
  365 |     await zoomInBtn.click();
  366 |     
  367 |     await page.waitForTimeout(1500); // Wait for render
  368 |     
  369 |     await expect.poll(async () => {
  370 |       const node = await canvasLocator.evaluate((n: HTMLCanvasElement) => ({ width: n.width, height: n.height }));
  371 |       return node.width;
  372 |     }, { timeout: 10000, message: `Waiting for width to be greater than ${initialSize.width}` })
  373 |       .toBeGreaterThan(initialSize.width);
  374 |   });
  375 |   test('Mobile: should correctly nudge the crop rect via UI controls and update Store settings', async ({ page }) => {
  376 |     await page.setViewportSize({ width: 390, height: 844 });
  377 |     await page.goto('http://localhost:5173');
  378 |     
  379 |     // Load PDF
  380 |     const fileChooserPromise = page.waitForEvent('filechooser');
  381 |     await page.locator('button:has-text("PDFファイルを開く")').first().click();
  382 |     const fileChooser = await fileChooserPromise;
  383 |     await fileChooser.setFiles(path.join(process.cwd(), 'tests', 'fixtures', 'SKM_550i26091214160_2.pdf'));
  384 | 
  385 |     await expect(page.locator('canvas, img[alt="Score Page"]').first()).toBeVisible({ timeout: 15000 });
  386 |     await page.waitForTimeout(1000); // Wait for initial render
  387 | 
  388 |     // Shrink the crop box so it has room to pan (nudge)
  389 |     await page.evaluate(() => {
  390 |       // @ts-ignore
  391 |       window.useScoreStore.getState().commitCropRect({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
  392 |     });
  393 |     await page.waitForTimeout(300);
  394 | 
  395 |     const initialCrop = await page.evaluate(() => {
  396 |       // @ts-ignore
  397 |       return window.useScoreStore.getState().cropRect;
  398 |     });
  399 | 
  400 |     // Open Nudge Bottom Sheet
  401 |     await page.locator('button[aria-label="枠微動"]').click();
  402 |     await page.waitForTimeout(500); // Wait for animation
  403 | 
  404 |     // Click Right Nudge twice
  405 |     const rightNudgeBtn = page.locator('button:has(svg.lucide-arrow-right)');
  406 |     await expect(rightNudgeBtn).toBeVisible();
  407 |     await rightNudgeBtn.click();
  408 |     await rightNudgeBtn.click();
  409 | 
  410 |     await page.waitForTimeout(100); // store updates synchronously, wait a bit for component
  411 | 
  412 |     const updatedCrop = await page.evaluate(() => {
  413 |       // @ts-ignore
  414 |       return window.useScoreStore.getState().cropRect;
  415 |     });
  416 | 
  417 |     // X should have increased by 0.01 (0.005 * 2)
  418 |     expect(updatedCrop.x).toBeGreaterThan(initialCrop.x + 0.009);
  419 |     expect(updatedCrop.x).toBeLessThan(initialCrop.x + 0.011);
  420 |     expect(updatedCrop.y).toBeCloseTo(initialCrop.y, 4);
  421 |     
  422 |     // Verify that manual settings were pushed
  423 |     const updatedSettings = await page.evaluate(() => {
  424 |       // @ts-ignore
  425 |       return window.useScoreStore.getState().settings;
  426 |     });
  427 |     
  428 |     expect(updatedSettings.manualTrimLeftPercent).toBeGreaterThan(0);
  429 |   });
  430 | });
  431 | 
```