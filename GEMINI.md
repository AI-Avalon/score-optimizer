# GEMINI.md - Orchestral Score Optimizer Master Directives

## 1. 開発原則
- ツギハギのパッチ当てを禁止し、責務ごとに独立したクリーンアーキテクチャで構築すること。
- プロジェクト直下にある `app.py` の全機能・アルゴリズム・パラメータを 100% 漏れなく再現すること。
- 単なるビルド成功で終わらせず、Playwright による実機ブラウザテストで「コンソールエラー 0件」「描画確認」をパスして完了とすること。

## 2. フリーズ・クラッシュ絶対抑止規約
- PDFレンダリング時は `renderRequestId`（世代番号）で排他制御を行い、`RenderingCancelledException` は正常スキップすること。
- プレビュー時の二値化や黒枠検出は長辺1200px以下の縮小Canvasで処理し、メインスレッドをブロックしないこと。
- 書き出し処理後は必ず `canvas.width = 0; canvas.height = 0;` でメモリを即時解放すること。
