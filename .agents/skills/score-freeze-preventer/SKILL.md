---
name: score-freeze-preventer
description: Prevents UI freezes, infinite loops, and PDF.js render collisions.
---
# Freeze Preventer Directives
- Wrap all PDF rendering inside an AbortController / cancellation token.
- Offload image binarization or downscale preview images before pixel processing.
- Guaranteed `try-finally` blocks to reset `isLoading`.
- Debounce setting changes (150ms) to prevent rapid multi-render thrashing.
