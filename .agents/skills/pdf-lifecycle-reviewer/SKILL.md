---
name: pdf-lifecycle-reviewer
description: Reactコンポーネントのコード変更時に呼び出される。PDF.jsの初期化・破棄手順や、メモリリーク (destroy, cancelの欠落)を防ぐためのレビューと修正を自律的に行う。
---
# Goal
React 18のStrict Modeにおけるコンポーネントのマウント/アンマウント時において、PDF.jsの RenderingCancelledException の放置や、Web Workerのメモリリークを完全に防ぐ。

# Instructions
1. 対象のReactコードをスキャンし、pdfjsLib.getDocumentの呼び出し箇所を特定する。
2. useEffectのクリーンアップ関数(return文)において、非同期タスクに対する cancel() および PDFDocumentProxy に対する destroy() が記述されているか確認する。
3. エラーハンドリングにおいて RenderingCancelledException を握り潰すのではなく、明示的に無視するロジック (if (error.name === 'RenderingCancelledException' || error.message?.includes('cancelled'))) を記述すること。

# Constraints
- メインスレッド上で巨大なピクセル配列 (ImageData) を直接ループ処理するコードを生成してはならない。
