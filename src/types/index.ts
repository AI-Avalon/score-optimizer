
export type WhiteoutRect = { id: string; x: number; y: number; w: number; h: number; };
export type StampOverlay = { id: string; text: string; xMm: number; yMm: number; sizePt: number; };
export type DeskewData = { angleRad: number; angleDeg: number; };

export type ProcessSettings = {
  pageProcessingMode: 'spread_split' | 'single_fit';
  splitOffsetPercent: number; // -20.0 ~ 20.0
  pageOrder: 'left_to_right' | 'right_to_left';
  blackMarginThreshold: number; // 0 ~ 80
  cropPaddingPx: number; // 0 ~ 40
  autoCropEnabled: boolean;
  manualTrimLeftPercent: number; // 0 ~ 20
  manualTrimRightPercent: number;
  manualTrimTopPercent: number;
  manualTrimBottomPercent: number;
  useAdaptiveThreshold: boolean;
  fixedThreshold: number; // 80 ~ 230
  outputColorMode: 'monochrome' | 'original' | 'grayscale'; // kept grayscale just in case
  bodyStartPage: number;
  frontMatterMode: 'single' | 'split' | 'skip';
};

export type ScorePage = {
  id: string;
  imageUrl: string | null;
  originalWidth: number;
  originalHeight: number;
  isBlank: boolean;
  
  whiteoutRects: WhiteoutRect[];
  stamps: StampOverlay[];
  deskew: DeskewData | null;
  rotation: 0 | 90 | 180 | 270;
  
  // 個別オーバーライド
  overrideSettings?: Partial<ProcessSettings>;
  
  // 計算結果キャッシュ（UI表示・次段用）
  cropBox?: { x: number; y: number; w: number; h: number };
};

export type PaperPreset = { label: string; widthMm: number; heightMm: number; };
export const PAPER_PRESETS: PaperPreset[] = [
  { label: 'A4 縦 (210×297mm)', widthMm: 210, heightMm: 297 },
  { label: 'B4 縦 (257×364mm) オケ標準', widthMm: 257, heightMm: 364 },
  { label: 'A3 横 (420×297mm) 見開き', widthMm: 420, heightMm: 297 },
  { label: 'A3 縦 (297×420mm)', widthMm: 297, heightMm: 420 },
  { label: '菊倍判 (218×304mm)', widthMm: 218, heightMm: 304 },
  { label: 'US Letter (215.9×279.4mm)', widthMm: 215.9, heightMm: 279.4 },
];

export type ViewMode = 'edit' | 'paper' | 'booklet';

export type ExportConfig = {
  filenameMode: 'original' | 'suffix' | 'date' | 'custom';
  customFilename: string;
  originalFilename: string;
  suffix: string;
  pageNumberStart: number;
  pageNumberSizePt: number;
  pageNumberPosition: 'top' | 'bottom';
};

export type GlobalConfig = {
  accordionBindingMode: boolean;
  globalStaffScaleLock: boolean;
  referencePageIndex: number;
  processSettings: ProcessSettings;
};
