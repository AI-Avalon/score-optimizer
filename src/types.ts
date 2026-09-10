export type Mask = { x: number; y: number; w: number; h: number };
export type Stamp = { text: string; x: number; y: number; size: number };

export type Page = {
  id: string;
  imageUrl: string | null;
  width: number;
  height: number;
  isLandscape: boolean;
  leftMaskOffset: number; // 0-30mm
  rightMaskOffset: number; // 0-30mm
  spineGuide: number; // Percentage 0-100% for splitting landscape
  whiteoutMasks: Mask[];
  stamps: Stamp[];
};

export type Preset = {
  name: string;
  widthMm: number;
  heightMm: number;
};

export const PRESETS: Preset[] = [
  { name: 'A4 Portrait', widthMm: 210, heightMm: 297 },
  { name: 'B4 Portrait (Orchestra)', widthMm: 250, heightMm: 353 },
  { name: 'A3 Landscape', widthMm: 420, heightMm: 297 },
  { name: 'A3 Portrait', widthMm: 297, heightMm: 420 },
  { name: '菊倍判 (218x304mm)', widthMm: 218, heightMm: 304 },
  { name: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
];
