# PDF Lifecycle & Memory Rules
- PDF.js Worker は CDN 安定版を使用すること:
  `pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';`
- 描画処理は `renderRequestId`（世代番号）で排他制御を行い、`RenderingCancelledException` は明示的に catch して無視すること。
- ピクセル走査（黒枠自動検出・大津二値化）は必ず Web Worker (`otsu.worker.ts`) 内で OffscreenCanvas を用いて実行し、メインスレッドをブロックしないこと。
- 画像処理後は必ず `imageBitmap.close()`、PDF書き出し後は `canvas.width = 0; canvas.height = 0;` でメモリを即時解放すること。
