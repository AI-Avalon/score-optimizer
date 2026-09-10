---
name: ui-ux-pro-workstation
description: Ergonomics for high-density DAW-style desktop workspace and gesture-driven mobile layout.
---
# UI/UX Pro Workstation Directives

## 1. Aesthetic Guidelines
- Theme: Deep Slate / Zinc-950 (#0B0D13 base, #161922 panels, #272B35 borders).
- High-density workstation inspired by Steinberg Dorico and Apple HIG.

## 2. PC Desktop Workspace (Width >= 768px)
- 3-pane layout: Settings Inspector, Interactive Canvas (Space+Drag pan, wheel zoom), Filmstrip drawer.
- Shortcuts: [ / ] (rotate), Backspace/Delete (delete page), Ctrl+Z (undo), Space+Drag (pan).
- Global Actions: [全ページに適用], [初期設定にリセット], [白紙挿入].

## 3. Mobile Workspace (Width < 768px) - 完全専用設計
- 共通レスポンシブではなく、専用の MobileRoot コンポーネントを使用すること。
- Fullscreen score viewer (100dvh, zero overflow-x, Safe Area padding).
- Bottom Sheet Drawer: 下部からスワイプ展開するハーフモーダルで設定操作。
- Floating Thumb Action Bar: 画面下部に [◀] [ページ番号] [▶] [削除] [メニュー] を親指配置。
- @use-gesture/react: 2本指ピンチズーム、1本指スワイプページ送り。

## 4. Visual Progress & Loading Modal
- インポート時、ページ解析時、PDF書き出し時にフルスクリーンまたはモーダルオーバーレイを表示。
- プログレスバー + 「処理中: 12 / 48 ページ (25%)」+ 現在の処理内容のテキスト。
