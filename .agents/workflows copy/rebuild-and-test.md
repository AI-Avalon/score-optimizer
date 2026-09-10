# Rebuild and Test Workflow
1. 型定義 (`src/types.ts`) の作成: app.py の全パラメータと技術書仕様を網羅。
2. Web Worker (`src/workers/otsu.worker.ts`) の作成: 大津二値化と黒枠自動検出。
3. 純粋幾何エンジン (`src/engine/geometry.ts`) の作成: 座標変換と見開き2分割。
4. PDFエンジン (`src/engine/pdfEngine.ts`) の作成: キャンセル安全レンダリングと300DPI出力。
5. Zustandストア (`src/store/useScoreStore.ts`) の作成: Normalized座標のみ保存。
6. UIコンポーネント (`src/components/`, `src/App.tsx`) の作成: Apple HIG準拠ダークUI。
7. ビルド検証: `npm run build` を実行しエラー0件を確認。
8. 実機E2Eテスト: `npx playwright test` を実行し、ブラウザ上でコンソールエラー0件・描画成功を確認。
