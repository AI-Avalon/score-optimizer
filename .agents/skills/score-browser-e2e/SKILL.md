---
name: score-browser-e2e
description: Automated real-browser verification using Playwright. Inspects console errors, canvas renders, screenshots, and UI layout.
---
# Browser E2E Testing Directives
1. Real Browser Execution:
   - Run `npx playwright test` against `http://localhost:5173`.
   - Never consider a task done without verifying 0 console errors in a real browser session.
2. Mandatory Verification Scenarios:
   - Scenario A: Load `/見開きテスト.pdf` and verify canvas is not blank.
   - Scenario B: Verify bottom filmstrip has thumbnail elements with width > 0.
   - Scenario C: Verify PC viewport (1440x900) has zero overflow-x.
   - Scenario D: Verify Mobile viewport (390x844) has zero overflow-x and bottom drawer renders.
   - Scenario E: Drag crop handle and verify split line coordinates update.
3. Zero Tolerance for Console Warnings/Errors:
   - Any `RenderingCancelledException` or uncaught promise rejection fails the test.
