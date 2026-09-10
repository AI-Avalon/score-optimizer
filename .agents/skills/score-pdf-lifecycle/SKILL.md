---
name: score-pdf-lifecycle
description: Robust PDF.js rendering lifecycle, StrictMode cancellation handling, and task synchronization.
---
# PDF Lifecycle Directives
1. StrictMode & Cancellation:
   - Always catch errors from `renderTask.promise`.
   - If `error.name === 'RenderingCancelledException'` or `error.message.includes('cancelled')`, silently return and DO NOT treat as a fatal error.
2. Render Generation Locking:
   - Track an atomic `renderRequestId` sequence counter.
   - Cancel any running `currentRenderTask` before starting a new one.
   - Discard results if the task completes but `renderRequestId` has changed.
3. Cleanup & Memory:
   - Always reset loading flags inside `finally`.
   - Cancel running tasks during component unmount without logging uncaught rejection.
