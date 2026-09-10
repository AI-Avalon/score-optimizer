---
name: score-python-parity
description: Exact porting of app.py algorithms to TypeScript.
---
# Python Parity Directives
- Directly inspect and port from `app.py`:
  - `detect_content_bbox(gray, black_threshold, padding)`
  - `compute_crop_rect(gray, settings)`
  - `split_spread_page(gray, settings)`
  - `binarize(gray, use_adaptive, threshold)`
  - `body_start_page` & `front_matter_mode` ('single' | 'split' | 'skip')
  - `page_overrides`: Save, Remove, Jump by index
- Strict parameter bounds and default values matching `app.py`.
