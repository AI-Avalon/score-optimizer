/** 矩形マスク（ホワイト修正テープ用） */
export type WhiteoutRect = {
  /** 一意識別子 */
  id: string;
  /** 元画像上のX座標（px） */
  x: number;
  /** 元画像上のY座標（px） */
  y: number;
  /** 幅（px） */
  w: number;
  /** 高さ（px） */
  h: number;
};

/** スタンプオーバーレイ（パート名・ページ番号・リハーサル記号） */
export type StampOverlay = {
  id: string;
  text: string;
  /** 用紙上のX位置（mm） */
  xMm: number;
  /** 用紙上のY位置（mm） */
  yMm: number;
  /** フォントサイズ（pt） */
  sizePt: number;
};

/** 傾き補正データ */
export type DeskewData = {
  /** 補正角度（ラジアン） */
  angleRad: number;
  /** 補正角度（度） */
  angleDeg: number;
};

/** 1ページ分のデータモデル */
export type ScorePage = {
  /** 一意識別子 */
  id: string;
  /** 元画像のdata URL（300DPIレンダリング済み） */
  imageUrl: string | null;
  /** 元画像の幅（px） */
  originalWidth: number;
  /** 元画像の高さ（px） */
  originalHeight: number;
  /** ページ種別 */
  pageType: 'single' | 'spread';
  /** 分割されたサブページ位置 */
  subPage: 'single' | 'left' | 'right';
  /** カラーモード */
  colorMode: ColorMode;
  /** 二値化設定 */
  binarizeConfig: BinarizeConfig;
  /** 個別余白設定（ミリ単位） */
  bidiMargins: BidiMarginConfig;
  /** 全体設定から個別に上書きされているか */
  isCustomized: boolean;
  /** 白紙ページか */
  isBlank: boolean;
  /** ノド影マスク左側幅（mm, 0-30） */
  gutterMaskLeftMm: number;
  /** ノド影マスク右側幅（mm, 0-30） */
  gutterMaskRightMm: number;
  /** 見開き分割位置（元画像幅に対する割合 0.0-1.0） */
  spineRatio: number;
  /** ホワイト修正テープ矩形リスト */
  whiteoutRects: WhiteoutRect[];
  /** スタンプオーバーレイリスト */
  stamps: StampOverlay[];
  /** 傾き補正データ（null=補正なし） */
  deskew: DeskewData | null;
  /** 回転角度（0, 90, 180, 270） */
  rotation: 0 | 90 | 180 | 270;
  /** トリミング範囲（px） */
  cropBox?: { x: number; y: number; w: number; h: number };
};

/** 用紙プリセット */
export type PaperPreset = {
  /** 表示名 */
  label: string;
  /** 幅（mm） */
  widthMm: number;
  /** 高さ（mm） */
  heightMm: number;
};

/** 定義済み用紙プリセット一覧 */
export const PAPER_PRESETS: PaperPreset[] = [
  { label: 'A4 縦 (210×297mm)', widthMm: 210, heightMm: 297 },
  { label: 'B4 縦 (257×364mm) オケ標準', widthMm: 257, heightMm: 364 },
  { label: 'A3 横 (420×297mm) 見開き', widthMm: 420, heightMm: 297 },
  { label: 'A3 縦 (297×420mm)', widthMm: 297, heightMm: 420 },
  { label: '菊倍判 (218×304mm)', widthMm: 218, heightMm: 304 },
  { label: 'US Letter (215.9×279.4mm)', widthMm: 215.9, heightMm: 279.4 },
];

/** ビューモード */
export type ViewMode = 'edit' | 'paper' | 'booklet';

/** エクスポート設定 */
export type ExportConfig = {
  /** ファイル名パターン: 'original' | 'suffix' | 'date' | 'custom' */
  filenameMode: 'original' | 'suffix' | 'date' | 'custom';
  /** カスタムファイル名 */
  customFilename: string;
  /** 元ファイル名（インポート時に記録） */
  originalFilename: string;
  /** サフィックス文字列 */
  suffix: string;
  /** ページ番号再付与: 開始番号（0=無効） */
  pageNumberStart: number;
  /** ページ番号フォントサイズ（pt） */
  pageNumberSizePt: number;
  /** ページ番号位置: 'top' | 'bottom' */
  pageNumberPosition: 'top' | 'bottom';
};

/** カラーモード */
export type ColorMode = 'color' | 'grayscale' | 'monochrome';

/** 二値化設定 */
export type BinarizeConfig = {
  /** 二値化閾値 (0-255) */
  threshold: number;
  /** 裏写り除去（明るいピクセルを白に飛ばす） */
  removeBleedThrough: boolean;
  /** 適応的二値化を使用するか */
  isAdaptive?: boolean;
  /** 適応的二値化のブロックサイズ */
  adaptiveBlockSize?: number;
};

/** ミリ単位の余白調整（見開き対応） */
export type BidiMarginConfig = {
  topMm: number;
  bottomMm: number;
  insideMm: number;
  outsideMm: number;
};

/** 表紙・前付けの処理モード */
export type FrontMatterMode = 'single_fit' | 'spread_split' | 'skip';

/** 全体設定 */
export type GlobalConfig = {
  /** 蛇腹製本モード（ノド余白シフト無効化） */
  accordionBindingMode: boolean;
  /** 大域スケール統一モード */
  globalStaffScaleLock: boolean;
  /** 基準ページインデックス（globalStaffScaleLock時） */
  referencePageIndex: number;
  /** マージン設定 */
  margins: BidiMarginConfig;
  /** 本文の開始ページ（見開き分割・ページ番号付与の起点） */
  bodyStartPage: number;
  /** ページの進行方向 */
  pageOrder: 'L2R' | 'R2L';
  /** 表紙・前付けの処理モード */
  frontMatterMode: FrontMatterMode;
};
