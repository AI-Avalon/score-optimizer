---
name: ui-ux-pro-workstation
description: Ergonomics for high-density DAW-style desktop workspace and gesture-driven mobile layout.
---

# UI/UX Pro Workstation Directives

## 1. Aesthetic Guidelines
- Theme: Deep Slate / Zinc-950 (#0B0D13 base, #161922 panels, #272B35 borders).
- Design System: All colors MUST use CSS variables (--color-*) or standard Tailwind classes. Zero raw hex/rgba in inline styles.
- Accent button text color MUST strictly be #ffffff across BOTH desktop and mobile.

## 2. PC Desktop Workspace (Width >= 768px)
- Slim Header: Keep minimal (Title, Zoom HUD, Help, Export). Move Paper/Custom-mm settings into the left sidebar.
- 3-pane layout: Settings Inspector (with scroll gradient cue), Interactive Canvas, Filmstrip drawer.
- Shortcuts: [ / ] (rotate), Backspace/Delete (delete page), Ctrl+Z (undo), Space+Drag (pan).

## 3. Mobile Workspace (Width < 768px)
- Fullscreen score viewer (100dvh, zero overflow-x, Safe Area padding via env(safe-area-inset-*)).
- Floating Thumb Action Bar MUST include an explicit "Undo" action (Undo2 icon). NEVER rely on keyboard Ctrl+Z for mobile.
- Settings Bottom Sheet: Group into Tabs ([Paper/Mode], [Crop], [Filter/DPI]) instead of a single long scroll.
- The "Apply to All Pages" primary button MUST be sticky-fixed at the bottom of the sheet.
