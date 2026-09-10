import type { ScorePage, PaperPreset, BidiMarginConfig } from '../types';
import { mmToPx, fitAspectRatio, getEffectiveMargins, PRINT_DPI, PDF_DPI } from './geometry';
import { applyImageFilter } from './filterEngine';

export * from './geometry';
export * from './filterEngine';
export * from './pdfEngine';

/** 印刷品質エクスポート時のスケール */
export const EXPORT_SCALE = PRINT_DPI / PDF_DPI; // ~4.167
/** プレビュー表示用スケール */
export const PREVIEW_SCALE = 0.2;

/**
 * 1ページ分をキャンバスにレンダリングする。
 * 
 * @param page - ソースページデータ
 * @param preset - 出力用紙プリセット
 * @param side - 見開き分割時の左右指定、またはsingle
 * @param scale - レンダリングスケール（プレビュー=0.2, エクスポート=300/72）
 * @param margins - マージン設定 (BidiMarginConfig)
 * @param accordionMode - 蛇腹製本モード
 * @param pageIndex - ページインデックス（偶数/奇数の判定用、0始まりを想定）
 */
export const renderPage = async (
  page: ScorePage,
  preset: PaperPreset,
  side: 'left' | 'right' | 'single',
  scale: number,
  margins: BidiMarginConfig,
  accordionMode: boolean,
  pageIndex: number = 0
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2Dコンテキストの取得に失敗');

  // 出力キャンバスサイズ（用紙全体）
  const paperW = mmToPx(preset.widthMm, scale);
  const paperH = mmToPx(preset.heightMm, scale);
  canvas.width = paperW;
  canvas.height = paperH;

  // 白背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, paperW, paperH);

  // 白紙ページはそのまま返す
  if (page.isBlank || !page.imageUrl) {
    return canvas;
  }

  // 元画像をロード
  const img = await loadImage(page.imageUrl);

  // マージン領域を計算
  // pageIndex % 2 === 1 を偶数ページ(左ページ)として扱うか、
  // pageIndex % 2 === 0 を右ページ(奇数ページ)として扱うか
  // ここでは "Odd pages have inside=left, outside=right. Even pages have inside=right, outside=left." に従う。
  // pageIndex=0 (1ページ目) -> 奇数ページ -> isLeftPage = false
  // pageIndex=1 (2ページ目) -> 偶数ページ -> isLeftPage = true
  const isLeftPage = pageIndex % 2 !== 0;

  // page.bidiMarginsがあれば優先、なければ全体設定のmarginsを使用
  const effectiveMarginConfig = page.isCustomized ? page.bidiMargins : margins;

  const effectiveMargins = getEffectiveMargins(effectiveMarginConfig, isLeftPage, accordionMode);
  
  const marginLeft = mmToPx(effectiveMargins.left, scale);
  const marginRight = mmToPx(effectiveMargins.right, scale);
  const marginTop = mmToPx(effectiveMargins.top, scale);
  const marginBottom = mmToPx(effectiveMargins.bottom, scale);
  const printableW = paperW - marginLeft - marginRight;
  const printableH = paperH - marginTop - marginBottom;

  // 傾き補正の適用
  if (page.deskew) {
    ctx.save();
    ctx.translate(paperW / 2, paperH / 2);
    ctx.rotate(-page.deskew.angleRad);
    ctx.translate(-paperW / 2, -paperH / 2);
  }

  // 回転処理（元画像の実効サイズを計算）
  let effectiveImgW = img.width;
  let effectiveImgH = img.height;
  if (page.rotation === 90 || page.rotation === 270) {
    effectiveImgW = img.height;
    effectiveImgH = img.width;
  }

  // ソース画像のクロップ領域を決定
  let srcX = 0;
  let srcY = 0;
  let srcW = effectiveImgW;
  let srcH = effectiveImgH;

  if (page.pageType === 'spread' && side !== 'single') {
    const splitPx = Math.round(effectiveImgW * page.spineRatio);
    if (side === 'left') {
      srcX = 0;
      srcW = splitPx;
    } else {
      srcX = splitPx;
      srcW = effectiveImgW - splitPx;
    }
  }

  // アスペクト比を維持したセンタリング配置
  const fit = fitAspectRatio(srcW, srcH, printableW, printableH);

  // 回転を考慮した描画
  ctx.save();
  if (page.rotation !== 0) {
    // 回転の中心を出力領域の中心に設定
    const cx = marginLeft + printableW / 2;
    const cy = marginTop + printableH / 2;
    ctx.translate(cx, cy);
    ctx.rotate((page.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    
    // 回転後のソース矩形を元画像座標系で計算
    if (page.rotation === 90 || page.rotation === 270) {
      // 元画像のW/Hは回転前の値を使う
      const origSplitPx = page.pageType === 'spread'
        ? Math.round(img.width * page.spineRatio)
        : 0;
      if (side === 'left' && page.pageType === 'spread') {
        ctx.drawImage(img, 0, 0, origSplitPx, img.height, 
          marginLeft + fit.x, marginTop + fit.y, fit.w, fit.h);
      } else if (side === 'right' && page.pageType === 'spread') {
        ctx.drawImage(img, origSplitPx, 0, img.width - origSplitPx, img.height,
          marginLeft + fit.x, marginTop + fit.y, fit.w, fit.h);
      } else {
        ctx.drawImage(img, 0, 0, img.width, img.height,
          marginLeft + fit.x, marginTop + fit.y, fit.w, fit.h);
      }
    } else {
      // 180度回転
      ctx.drawImage(img, srcX, srcY, srcW, srcH,
        marginLeft + fit.x, marginTop + fit.y, fit.w, fit.h);
    }
  } else {
    // 回転なし: 通常描画
    ctx.drawImage(img, srcX, srcY, srcW, srcH,
      marginLeft + fit.x, marginTop + fit.y, fit.w, fit.h);
  }
  ctx.restore();

  // ノド影グラデーション消去
  if (!accordionMode) {
    if (side === 'left' && page.gutterMaskRightMm > 0) {
      const maskW = mmToPx(page.gutterMaskRightMm, scale);
      const grad = ctx.createLinearGradient(
        marginLeft + fit.x + fit.w - maskW, 0,
        marginLeft + fit.x + fit.w, 0
      );
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(marginLeft + fit.x + fit.w - maskW, marginTop + fit.y, maskW, fit.h);
    }
    if (side === 'right' && page.gutterMaskLeftMm > 0) {
      const maskW = mmToPx(page.gutterMaskLeftMm, scale);
      const grad = ctx.createLinearGradient(
        marginLeft + fit.x, 0,
        marginLeft + fit.x + maskW, 0
      );
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(marginLeft + fit.x, marginTop + fit.y, maskW, fit.h);
    }
  }

  // ホワイト修正テープ（WhiteoutRect）の適用
  if (page.whiteoutRects && page.whiteoutRects.length > 0) {
    ctx.fillStyle = '#ffffff';
    // WhiteoutRectの座標はフィット後の描画領域にマッピング
    const scaleX = fit.w / srcW;
    const scaleY = fit.h / srcH;
    for (const rect of page.whiteoutRects) {
      const rx = marginLeft + fit.x + (rect.x - srcX) * scaleX;
      const ry = marginTop + fit.y + (rect.y - srcY) * scaleY;
      const rw = rect.w * scaleX;
      const rh = rect.h * scaleY;
      ctx.fillRect(rx, ry, rw, rh);
    }
  }

  // 画像フィルター処理の適用
  applyImageFilter(ctx, paperW, paperH, page.colorMode, page.binarizeConfig);

  // 傾き補正のrestore
  if (page.deskew) {
    ctx.restore();
  }

  return canvas;
};

/** 画像ロードのPromiseラッパー */
export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗'));
    img.src = src;
  });
