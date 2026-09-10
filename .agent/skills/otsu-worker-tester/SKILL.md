---
name: otsu-worker-tester
description: メインスレッドの凍結を防ぐため、OffscreenCanvasとWeb Workerを用いた大津の二値化・黒枠検出処理とメモリ解放を検証する。
---
# Goal
A3スキャンの巨大画像でもUIスレッドが一切フリーズせず、60fpsを維持する。

# Instructions
1. ピクセル走査、黒枠検出、大津の二値化処理は必ず Web Worker (otsu.worker.ts) 内で実行すること。
2. メインスレッドから Worker へは createImageBitmap() による Transferable Objects でゼロコピー転送すること。
3. 処理完了後は ImageBitmap.close() を直ちに呼び出し、GPUバッファを強制解放すること。
