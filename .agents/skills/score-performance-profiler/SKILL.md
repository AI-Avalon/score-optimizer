---
name: score-performance-profiler
description: Rules for decoupled rendering to ensure 60fps animations and drag interactions.
---

# Score Performance Profiler

This skill enforces strict performance requirements for the Score Optimizer 2.0 application.

## 60fps Requirement (Decoupled Rendering)
- **Problem**: Updating global state (e.g., Zustand `cropRect` or `settings`) on every pointer move (60 times a second) causes massive React re-renders and potential re-evaluations of expensive logic, leading to UI jank and freezing.
- **Solution (Decoupled Dragging/Sliding)**:
  - **Crop Box Dragging**: During `onPointerMove`, only update local React state or directly manipulate the DOM (e.g., CSS `transform`, `left`/`top`/`width`/`height`) of an absolute-positioned, lightweight overlay. Do NOT dispatch to the global store.
  - **Commit on Release**: Only update the global Zustand state (`setCropRect`) in the `onPointerUp` event.
  - **Range Sliders**: For settings sliders (e.g., threshold, trim margins), maintain a local state during `onChange` (sliding) to update the number instantly. Commit to the global store only on `onMouseUp`, `onTouchEnd`, or `onChangeEnd`.

## Delayed Heavy Processing
- The actual heavy PDF rendering or binarization logic must only be triggered when the pointer is released. 
- While interacting (dragging/sliding), the user sees a fast, lightweight approximation (e.g., just the crop box overlay moving, or just the number changing).

## Memory Management
- After heavy processing (e.g., Otsu binarization or PDF export), immediately free memory by setting canvas dimensions to 0. (Already covered by `pdf-lifecycle-reviewer`, but enforced here for UI interactions).
