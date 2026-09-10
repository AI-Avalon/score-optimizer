---
name: code-reviewer
description: Validates memory disposal, DPI scale computation, and responsive layout integrity.
---
# Code Reviewer Directives
1. Memory Leak Check: Ensure canvas.width = 0; canvas.height = 0; in all rendering/export loops.
2. DPI Scale Audit: Confirm export scale uses 300 / 72 and margins default to 0mm.
3. Mobile Duality: Ensure Desktop and Mobile viewports use dedicated layout roots.
4. TypeScript Strictness: Zero any types.
