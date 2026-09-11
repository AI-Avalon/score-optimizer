---
name: code-reviewer
description: Validates memory disposal, DPI scale computation, design token audit, and responsive integrity.
---

# Code Reviewer Directives

## Mandatory Verification Points
1. Memory Leak Check: Ensure canvas.width = 0; canvas.height = 0; in all rendering/export loops.
2. DPI Scale Audit: Confirm export scale uses 300 / 72 and margins default to 0mm.
3. Mobile Duality & Undo: Ensure mobile has a dedicated root with an explicit on-screen Undo button.
4. TypeScript Strictness: Zero any types.
5. Design Token & Consistency Audit:
   - Run grep check to ensure no raw hex colors or rgba() are hardcoded in inline style attributes.
   - Verify that .btn-accent or equivalent primary buttons have identical text color (#ffffff) on both desktop and mobile.
   - Verify zero emojis or raw Unicode arrows exist in JSX.
