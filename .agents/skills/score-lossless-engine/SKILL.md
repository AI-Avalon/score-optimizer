---
name: score-lossless-engine
description: Rules for 300DPI lossless score processing, spread splitting, and memory disposal.
---
# Score Lossless Engine Directives
- Export scale MUST be 300 / 72 (~4.167) to guarantee 300 DPI print quality.
- High-DPI canvas memory must be freed immediately: canvas.width = 0; canvas.height = 0;.
- Presets: A4 Portrait, B4 Portrait (Orchestra), A3 Landscape/Portrait, 菊倍判 (218x304mm), US Letter, Custom(mm).
- Split 2-page landscape scans into Left (Even) and Right (Odd) pages with draggable magnetic spine guide and gutter shadow masking (0-30mm).
- Support whiteout mask rectangles (#FFFFFF) and stamp overlays (Part Name, Page Num, Rehearsal Letter).
