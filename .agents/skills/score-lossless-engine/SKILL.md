---
name: score-lossless-engine
description: Rules for 300DPI lossless orchestral score rendering, spread splitting, aspect-ratio preservation, and memory disposal.
---
# Score Lossless Engine Directives

## 1. Zero-Quality-Loss Resolution Math
- Previews must be rendered at scale: 0.2 (or max 1200px) to ensure 60fps interaction.
- PDF export MUST render using scale = 300 / 72 (approx 4.166667) to guarantee 300 DPI print quality.
- Never downscale or blur staff lines, slurs, hairpin dynamics, or small footnote text.

## 2. Memory Disposal Contract (Zero-Leak)
- In every page-processing loop, execute canvas.width = 0; canvas.height = 0; immediately after pushing to pdf-lib.
- Yield to the main thread between iterations: await new Promise(r => setTimeout(r, 0));.

## 3. Paper Geometry & Presets (Target mm)
- A4 Portrait: 210 x 297 mm (widthPt: 595.28, heightPt: 841.89)
- B4 Portrait: 257 x 364 mm (Japanese Orchestra standard, widthPt: 728.50, heightPt: 1031.81)
- Music Score (菊倍判): 218 x 304 mm (widthPt: 617.95, heightPt: 861.73)
- A3 Landscape: 420 x 297 mm (Conductor Study Spread, widthPt: 1190.55, heightPt: 841.89)
- A3 Portrait: 297 x 420 mm (Full Score, widthPt: 841.89, heightPt: 1190.55)
- US Letter: 215.9 x 279.4 mm (widthPt: 612.00, heightPt: 792.00)
- Custom: Dynamic width & height in mm
- S = min(SafeW / CropW, SafeH / CropH) strictly preserves aspect ratio. Default margin is strictly 0mm (maximize fit).

## 4. Spread Splitting & Order
- Step 1: Detect/trim content crop box (excluding scanner black borders).
- Step 2: Split spread WITHIN the crop box using split_offset_percent and page_order (L-to-R / R-to-L).
