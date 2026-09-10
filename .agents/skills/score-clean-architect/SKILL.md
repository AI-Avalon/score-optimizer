---
name: score-clean-architect
description: Modular, clean React architecture with Apple HIG aesthetic and zero UI overflow.
---
# Clean Architect Directives
- Separation of Concerns:
  - `src/engine/`: Pure functions, zero React dependencies.
  - `src/store/`: Single Zustand store managing state and history.
  - `src/components/`: Modular presentation components with Tailwind CSS.
- Aesthetics & Ergonomics:
  - Apple HIG dark graphite styling (`#0D0F12` background, `#161922` sidebar, `#272B35` borders).
  - Margin default is strictly `0mm` (maximize fit to A4). Never inject arbitrary margins.
  - Responsive: `100dvh`, `overflow-hidden`, zero horizontal scrollbars.
  - Top Zoom HUD: `[-] [ 100% ] [ Fit ] [+]`.
