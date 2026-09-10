---
name: score-e2e-verifier
description: Playwright E2E verification enforcing 0 console errors and visual render validation.
---
# E2E Verifier Directives
- Run `npx playwright test` against `http://localhost:5173`.
- Tests must assert:
  1. Zero uncaught errors or unhandled promise rejections in the browser console.
  2. Canvas renders non-blank content upon loading `/見開きテスト.pdf`.
  3. Bottom filmstrip renders thumbnail elements.
  4. Both desktop (1440x900) and mobile (390x844) viewports have zero overflow-x.
