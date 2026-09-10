# AGENT.md - Orchestral Score Optimizer Autonomous Directives

## 1. 言語レギュレーション
- すべてのチャット対話、思考プロセス、タスク計画、エラー解説は日本語で行うこと。
- プログラムコード内のコメント（JSDoc、インライン解説）もすべて日本語で記述すること。
- コード内の変数名・関数名・型名などの識別子のみ国際標準の英語を使用すること。

## 2. 自律実行規範
- 些細な確認で止まらず、Phase 1 から Phase 5 まで自律的にファイルを生成・修正すること。
- エラーが出た場合はログを自己解析して修正パッチを当て、再検証すること。
- 最初に @task-planner で計画を立て、Phase完了ごとに @code-reviewer でメモリ解放と型安全性を自律監査すること。
- 最終的に @deploy-commander に従いローカルで npm run build を通し、GitHub Actions用 deploy.yml を作成すること。

## 3. 楽譜特化コア規約
- 100MB超のPDFに対応するため、描画処理後は即時 canvas.width = 0; canvas.height = 0; でメモリを解放すること。
- プレビューは scale: 0.2 で軽量化し、PDF書き出し時は必ず 300 DPI (scale = 300 / 72) を維持すること。
- PC（3ペイン・DAW風）とスマホ（全画面＋ボトムシート・@use-gesture）でUIを完全分離すること。
- 楽譜の全ページ個別チェック、偶奇回転、色調フィルター、ミリ単位余白調整の遵守項目を追加。
