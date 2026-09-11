---
name: code-reviewer
description: Validates memory disposal, DPI scale computation, design token audit, responsive integrity, async cleanup safety, cross-platform regressions, and concurrency/parity.
---

# Code Reviewer Directives

## Mandatory Verification Points
1. Memory Leak Check: Ensure canvas.width = 0; canvas.height = 0; in all rendering/export loops.
2. DPI Scale Audit: Confirm export scale uses 300 / 72 and margins default to 0mm.
3. Mobile Duality & Undo: Ensure mobile has a dedicated root with an explicit on-screen Undo button.
4. TypeScript Strictness: Zero any types.
5. Design Token & Consistency: Verify no raw hex/rgba, consistent accent text color, zero emojis.
6. Canvas Fit Audit: PDF rendering canvas occupies container properly.
7. Async Cleanup Safety: Try/catch around page.cleanup() after cancel().
8. Cross-Platform Regression: Mobile states must not break PC interactions.
9. Cross-Component Concurrency Audit (Crucial): 複数コンポーネントが同一の pdfDoc 等の共有リソースに対して非同期処理を競合させていないか確認する。文書全体を破棄する pdfDoc.cleanup() は他コンポーネントの処理中に呼ばないこと。
10. Store Action Parity Audit (Crucial): savePageOverride などの store アクションや、DPI・カスタム用紙設定・回転などの機能が、PC（Sidebar）とモバイル（MobileLayout）の両方で等しく提供されているか確認し、機能格差をなくすこと。
