# Geometry & Coordinate System Rules
- クロップ枠、分割位置などの幾何状態はすべて 0.0 〜 1.0 の NormalizedCoordinates として保存すること。
- Screen座標 (CSS Pixels) や Source座標 (物理Pixels) をStateに保存してはならない。末端の描画時・エクスポート時に純粋関数で都度計算すること。
- 見開き分割は、必ず「確定したクロップ枠の幅」を基準として左右に2分割すること。
- 用紙（A4）マージンの初期値は厳格に 0mm（余白なし最大化配置）とすること。
