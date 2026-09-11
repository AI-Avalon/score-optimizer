---
name: code-reviewer
description: Validates memory disposal, DPI scale computation, design token audit, responsive integrity, async cleanup safety, and cross-platform regressions.
---

# Code Reviewer Directives

## Mandatory Verification Points
1. Memory Leak Check: Ensure canvas.width = 0; canvas.height = 0; in all rendering/export loops.
2. DPI Scale Audit: Confirm export scale uses 300 / 72 and margins default to 0mm.
3. Mobile Duality & Undo: Ensure mobile has a dedicated root with an explicit on-screen Undo button.
4. TypeScript Strictness: Zero any types.
5. Design Token & Consistency Audit:
   - Verify no raw hex colors or rgba() are hardcoded in inline style attributes.
   - Verify that accent buttons have identical text color (#ffffff) on both desktop and mobile.
   - Verify zero emojis or raw Unicode arrows exist in JSX.
6. Canvas Fit Audit:
   - PDF描画canvasが親コンテナを適切に専有しているか確認する。
7. Async Cleanup Safety (Crucial):
   - PDF.js の `renderTask.cancel()` 直後に同期で `page.cleanup()` を呼んでいないか確認する。呼ぶ場合は必ず try/catch で競合例外を無視すること。
   - `ErrorBoundary` が PC・モバイル両方のルートに漏れなく適用されているか確認する。
8. Cross-Platform Regression Audit (Crucial):
   - モバイル向けに追加したステート（`touchMode` 等）が、PC側のインタラクションや視認性を無条件に遮断していないか確認する。
   - 共有コンポーネント（`ScoreCanvas` 等）のリファクタ時に、store の既存値（`zoom`, `zoomMode` 等）への参照が消失していないか確認する。
