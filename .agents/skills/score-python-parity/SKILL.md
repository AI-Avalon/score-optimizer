---
name: score-python-parity
description: Exact mathematical and behavioral porting of app.py to TypeScript.
---
# Python Parity Directives
- Directly inspect and port every algorithm from `app.py`:
  1. `detect_content_bbox`: Detect non-black content bounding box with `black_margin_threshold` and `crop_padding_px`.
  2. `compute_crop_rect`: Apply `manual_trim_left/right/top/bottom_percent` to the detected content box.
  3. `split_spread_page`: Split WITHIN the cropped rectangle using `split_offset_percent` and `page_order`.
  4. `binarize`: Support both fixed threshold and adaptive threshold (Gaussian).
  5. `body_start_page` & `front_matter_mode`: Handle front matter as single_fit, spread_split, or skip.
  6. `page_overrides`: Save, remove, and list page-specific settings.
