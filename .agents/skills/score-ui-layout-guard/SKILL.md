---
name: score-ui-layout-guard
description: High-DPI canvas synchronization, overflow protection, and Apple HIG aesthetic adherence.
---
# UI Layout Guard Directives
1. Canvas Pixel Ratio:
   - Coordinate Canvas CSS size with client bounding rect.
   - Render using `devicePixelRatio` scaling while keeping CSS display responsive (`width: 100%`, `height: 100%`).
2. Mobile & Desktop Zero-Overflow:
   - PC: 3-pane workstation with flex flex-row overflow-hidden h-screen.
   - Mobile: 100dvh, min-w-0, zero horizontal scroll, bottom dock sheet.
3. HUD & Controls:
   - Floating zoom capsule: `[ - ] [ 100% ] [ Fit ] [ + ]` with backdrop-blur.
   - 0mm initial margin default (never hardcode 5mm).
