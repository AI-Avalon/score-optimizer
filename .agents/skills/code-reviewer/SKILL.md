---
name: code-reviewer
description: Validates memory disposal, DPI scale computation, design token audit, responsive integrity, and canvas fitting.
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
6. Canvas Fit Audit (Crucial):
   - PDF描画canvasの実測高さ・幅が、親コンテナの表示可能領域（アスペクト比維持の最大領域）を適切に専有しているか確認する。
   - ResizeObserver のコールバックが canvas.width/height の単なる再読込で済まされておらず、親コンテナの最新 contentRect に基づくスケール再計算と再描画（render）を正しく実行しているか厳格に検査する。
