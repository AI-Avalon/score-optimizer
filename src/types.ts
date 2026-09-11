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

// ─── 用紙判型 (score-lossless-engine skill §3) ───────────────────────

/** 回転角度 (0, 90, 180, 270) */
export type RotationDeg = 0 | 90 | 180 | 270;

/** 用紙プリセットキー */
export type PaperPresetKey =
  | 'a4_portrait'
  | 'b4_portrait'
  | 'kiku_music'
  | 'a3_landscape'
  | 'a3_portrait'
  | 'us_letter'
  | 'custom';

/** 用紙定義 (mm → pt 変換済み) */
export interface PaperConfig {
  readonly key: PaperPresetKey;
  readonly label: string;
  readonly description: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly widthPt: number;
  readonly heightPt: number;
}

/** mm → pt 変換 (1mm = 72/25.4 pt) */
const mmToPt = (mm: number): number => mm * (72 / 25.4);

/**
 * オーケストラ用紙判型プリセット (score-lossless-engine skill §3)
 *
 * - A4 縦: 210 x 297 mm (オケ譜・練習用)
 * - B4 縦: 257 x 364 mm (日本のオケ標準)
 * - 菊倍判: 218 x 304 mm (輸入譜・ピアノ譜・日本の出版楽譜標準)
 * - A3 横: 420 x 297 mm (指揮者用スタディスコア)
 * - A3 縦: 297 x 420 mm (大編成フルスコア)
 * - US Letter: 215.9 x 279.4 mm (北米オケ標準)
 * - カスタム: 幅と高さをミリ単位で自由入力
 */
export const PAPER_PRESETS: Record<PaperPresetKey, PaperConfig> = {
  a4_portrait: {
    key: 'a4_portrait',
    label: 'A4 縦',
    description: 'オケ譜・練習用 (210×297mm)',
    widthMm: 210,
    heightMm: 297,
    widthPt: mmToPt(210),
    heightPt: mmToPt(297),
  },
  b4_portrait: {
    key: 'b4_portrait',
    label: 'B4 縦 (日本のオケ標準)',
    description: '国内オーケストラ・吹奏楽の標準パート譜 (257×364mm)',
    widthMm: 257,
    heightMm: 364,
    widthPt: mmToPt(257),
    heightPt: mmToPt(364),
  },
  kiku_music: {
    key: 'kiku_music',
    label: '菊倍判 (楽譜標準)',
    description: '輸入譜・ピアノ譜・日本の出版楽譜標準 (218×304mm)',
    widthMm: 218,
    heightMm: 304,
    widthPt: mmToPt(218),
    heightPt: mmToPt(304),
  },
  a3_landscape: {
    key: 'a3_landscape',
    label: 'A3 横 (見開きスコア)',
    description: '指揮者用スタディスコア (420×297mm)',
    widthMm: 420,
    heightMm: 297,
    widthPt: mmToPt(420),
    heightPt: mmToPt(297),
  },
  a3_portrait: {
    key: 'a3_portrait',
    label: 'A3 縦 (総譜)',
    description: '大編成フルスコア (297×420mm)',
    widthMm: 297,
    heightMm: 420,
    widthPt: mmToPt(297),
    heightPt: mmToPt(420),
  },
  us_letter: {
    key: 'us_letter',
    label: 'US Letter',
    description: '北米オケ標準 (215.9×279.4mm)',
    widthMm: 215.9,
    heightMm: 279.4,
    widthPt: mmToPt(215.9),
    heightPt: mmToPt(279.4),
  },
  custom: {
    key: 'custom',
    label: 'カスタム (mm入力)',
    description: '幅と高さをミリ単位で自由入力',
    widthMm: 210,
    heightMm: 297,
    widthPt: mmToPt(210),
    heightPt: mmToPt(297),
  },
};

/** 後方互換: A4定数 */
export const A4 = {
  widthPt: PAPER_PRESETS.a4_portrait.widthPt,
  heightPt: PAPER_PRESETS.a4_portrait.heightPt,
} as const;

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
  /** 見開き分割時、左右で個別のクロップ枠を使用するか */
  independentSplitFrames: boolean;
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
  independentSplitFrames: boolean;
}

// ─── ページ管理 (仮想ページ配列) ──────────────────────────────────────

/** 仮想ページエントリ (削除・挿入・回転を管理) */
export interface PageEntry {
  /** 元のPDFページインデックス (0始まり)。白紙の場合は -1 */
  readonly sourceIndex: number;
  /** 白紙ページか */
  readonly isBlank: boolean;
  /** 削除フラグ */
  deleted: boolean;
  /** 回転角度 */
  rotation: RotationDeg;
}

// ─── 履歴管理 (Undo/Redo) ─────────────────────────────────────────────

export type HistoryAction =
  | { type: 'delete'; pageIndex: number }
  | { type: 'restore'; pageIndex: number }
  | { type: 'insertBlank'; pageIndex: number }
  | { type: 'removeBlank'; pageIndex: number }
  | { type: 'rotate'; pageIndex: number; prevRotation: RotationDeg; newRotation: RotationDeg };

// ─── プログレス情報 ───────────────────────────────────────────────────

export interface ProgressInfo {
  current: number;
  total: number;
  message: string;
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
  independentSplitFrames: false,
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

/** mm → pt 変換ユーティリティ (外部使用向け) */
export function convertMmToPt(mm: number): number {
  return mmToPt(mm);
}
