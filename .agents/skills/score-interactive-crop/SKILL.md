---
name: score-interactive-crop
description: Normalized coordinate management, 8-point resize handles, and spread split synchronization.
---
# Interactive Crop Directives
1. Normalized Coordinates:
   - Store all crop rects as 0.0 to 1.0 relative values: `{ x0, y0, x1, y1 }`.
   - Clamping: Math.max(0, Math.min(1, val)), enforce min dimensions (0.05).
2. Split Execution Pipeline:
   - Step 1: Detect/trim content crop box (excluding scanner black bars).
   - Step 2: Split spread WITHIN the content crop box using `split_offset_percent`.
   - Step 3: Fit resulting left/right pages into target sheet preserving aspect ratio.
