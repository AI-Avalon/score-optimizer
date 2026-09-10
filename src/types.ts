// ─── Geometry Types (research.pdf 課題3) ─────────────────────────────

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Normalized 0.0–1.0 coordinate rect – the single source of truth for all crop/split state */
export interface NormalizedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// ─── Processing Mode Unions (app.py enums) ────────────────────────────

export type PageProcessingMode = 'spread_split' | 'single_fit';
export type PageOrder = 'left_to_right' | 'right_to_left';
export type OutputColorMode = 'monochrome' | 'original';
export type FrontMatterMode = 'single' | 'split' | 'skip';

// ─── ProcessSettings (app.py L19-37 完全移植) ─────────────────────────

export interface ProcessSettings {
  /** ページ処理: 見開き2分割 or 単ページ幅統一 */
  pageProcessingMode: PageProcessingMode;
  /** 分割位置補正 %: -20.0 〜 +20.0 */
  splitOffsetPercent: number;
  /** ページ順: 左→右 or 右→左 */
  pageOrder: PageOrder;
  /** 黒余白しきい値: 0 〜 80 */
  blackMarginThreshold: number;
  /** クロップ余白 px: 0 〜 40 */
  cropPaddingPx: number;
  /** 自動クロップ有効 */
  autoCropEnabled: boolean;
  /** 手動トリム 左 %: 0 〜 20.0 */
  manualTrimLeftPercent: number;
  /** 手動トリム 右 %: 0 〜 20.0 */
  manualTrimRightPercent: number;
  /** 手動トリム 上 %: 0 〜 20.0 */
  manualTrimTopPercent: number;
  /** 手動トリム 下 %: 0 〜 20.0 */
  manualTrimBottomPercent: number;
  /** 大津 / 適応的二値化 */
  useAdaptiveThreshold: boolean;
  /** 固定二値化しきい値: 80 〜 230 */
  fixedThreshold: number;
  /** 出力色: 白黒 or 元ファイルのまま */
  outputColorMode: OutputColorMode;
  /** 本文開始ページ (1始まり, デフォルト: 2) */
  bodyStartPage: number;
  /** 本文前ページの扱い */
  frontMatterMode: FrontMatterMode;
}

// ─── PageOverride (app.py L39-53 完全移植) ─────────────────────────────
// render_dpi, output_dpi, bodyStartPage, frontMatterMode は全体設定に属する

export interface PageOverride {
  pageProcessingMode: PageProcessingMode;
  splitOffsetPercent: number;
  pageOrder: PageOrder;
  blackMarginThreshold: number;
  cropPaddingPx: number;
  autoCropEnabled: boolean;
  manualTrimLeftPercent: number;
  manualTrimRightPercent: number;
  manualTrimTopPercent: number;
  manualTrimBottomPercent: number;
  useAdaptiveThreshold: boolean;
  fixedThreshold: number;
  outputColorMode: OutputColorMode;
}

// ─── Default Values (app.py L676-691 初期値) ──────────────────────────

export const DEFAULT_SETTINGS: ProcessSettings = {
  pageProcessingMode: 'spread_split',
  splitOffsetPercent: 0.0,
  pageOrder: 'left_to_right',
  blackMarginThreshold: 20,
  cropPaddingPx: 8,
  autoCropEnabled: true,
  manualTrimLeftPercent: 0.0,
  manualTrimRightPercent: 0.0,
  manualTrimTopPercent: 0.0,
  manualTrimBottomPercent: 0.0,
  useAdaptiveThreshold: false,
  fixedThreshold: 170,
  outputColorMode: 'monochrome',
  bodyStartPage: 2,
  frontMatterMode: 'single',
};

export const FULL_PAGE_RECT: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 };

// ─── Worker Message Types ─────────────────────────────────────────────

export interface OtsuWorkerRequest {
  imageBitmap: ImageBitmap;
  blackMarginThreshold: number;
  cropPaddingPx: number;
}

export interface OtsuWorkerResponse {
  cropRect: NormalizedRect;
  otsuThreshold: number;
}

// ─── A4 Constants (pdf-lib, research.pdf 課題4) ───────────────────────

export const A4 = {
  widthPt: 595.28,
  heightPt: 841.89,
} as const;
