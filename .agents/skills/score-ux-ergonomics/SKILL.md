---
name: score-ux-ergonomics
description: Ergonomic standards, thumb-zone optimization, and strict icon consistency.
---

# Score UX Ergonomics Directives

## 1. Icon System Directives (Zero Emoji Policy)
- NEVER use emojis (e.g., 🔒, 🔓, ❓, 🗑️, ⚙️) or raw Unicode arrows (↑, ↓, ←, →) in any UI components.
- STRICTLY use lucide-react vector icons:
  - Navigation: ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
  - Operations: Undo2, Redo2, Move, Settings, LayoutGrid, Download, Trash2, RotateCw
  - States: Lock, Unlock, HelpCircle, Check, Sparkles

## 2. Mobile Thumb Zone & Bottom Sheet
- Quick Action Bar: Place at bottom with minimum 44x44pt touch targets. Include:
  [ChevronLeft], [Undo2], [Move], [Settings], [LayoutGrid], [ChevronRight]
- Tabbed Bottom Sheet: Max 75dvh, prevent vertical scrolling fatigue.
- Sticky Footer: The "Apply to All Pages" button must remain visible at all times regardless of active tab.
- Toast placement: top must account for dynamic island/notch: calc(env(safe-area-inset-top, 16px) + 12px).
