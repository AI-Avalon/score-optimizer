---
name: geometry-guard
description: クロップやUI操作に関するロジックを実装する際、AIに対して「状態管理は必ずNormalized座標(0.0-1.0)で行う」という本プロジェクトのアーキテクチャルールを強制する。
---
# Goal
解像度やウィンドウサイズの違いによるクロップ境界のズレを根絶する。

# Instructions
1. クロップ枠、分割位置などの幾何状態はすべて 0.0 〜 1.0 の NormalizedCoordinates として保存すること。
2. Screen座標 (CSS Pixels) や Source座標 (物理Pixels) をStateに保存してはならない。末端の描画時・エクスポート時に純粋関数で都度計算すること。
3. 見開き分割は、確定したクロップ枠の幅を基準として左右に2分割すること。
