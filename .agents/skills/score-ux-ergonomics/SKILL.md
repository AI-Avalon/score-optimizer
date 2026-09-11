---
name: score-ux-ergonomics
description: Ergonomics for high-density DAW-style desktop workspace and gesture-driven mobile layout. Includes Photos-style UI, haptic feedback, and snap guides.
---

# Score UX Ergonomics

This skill defines the UI/UX interaction standards for the Score Optimizer 2.0 application.

## Desktop Workspace (DAW-style)
- Maximize canvas area.
- Dense, highly informative sidebar with sliders.
- Provide quick keyboard shortcuts for nudging (Arrow keys).

## Mobile Workstation (iOS Photos / Lightroom style)
- **Zero-chrome approach**: The score preview MUST occupy the top 85% of the screen at all times.
- **Bottom Action Bar**: The bottom 15% contains a Lightroom-style quick action bar with segmented controls or iconic buttons (`[◀]`, `[▶]`, `[枠移動]`, `[⚙️調整]`, `[📄一括]`, `[💾出力]`).
- **Gestures**:
  - **Swipe Left/Right**: Change pages intuitively.
  - **Pinch-to-Zoom & Pan**: Smooth hardware-accelerated zoom and pan.
  - **1-Finger Drag**: When a crop box is active, touching inside it translates the entire box, keeping its dimensions intact.
- **Haptics & Snapping**:
  - Implement a magnetic snap guide when the manual crop box approaches the auto-detected staff boundaries (`detectedCropRect`).
  - Trigger haptic feedback (`navigator.vibrate(10)`) when a snap occurs to provide tactile confirmation to the user.
- **Bottom Sheet**:
  - Detailed adjustments (sliders, dropdowns) must open in a Bottom Sheet that slides up over the action bar.
  - The sheet must be usable with one hand (thumb zone).

## Page Override Visualization
- Clearly indicate when a page has custom settings (e.g., a "個別カスタム中" pill badge).
- Always provide a 1-tap way to revert to global settings `[全体設定に戻す]`.
- Provide a way to "Apply to this and all remaining pages" for bulk workflows.
