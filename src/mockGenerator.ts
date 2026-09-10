import type { ScorePage } from './types';
import { genId } from './store/useScoreStore';

/**
 * テスト用ダミー楽譜を生成する。
 * - 見開き2ページ（A3横相当）
 * - 中央ノド影
 * - 五線譜＋小節番号＋脚注テキスト（Urtext風）
 * - 意図的に+1.5度の傾き
 */
export const createMockScore = async (): Promise<ScorePage> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    /** A3横 420×297mm を 300DPIで生成 */
    const pxPerInch = 300;
    const widthMm = 420;
    const heightMm = 297;
    const width = Math.round((widthMm / 25.4) * pxPerInch);
    const height = Math.round((heightMm / 25.4) * pxPerInch);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 背景（わずかにクリーム色の紙質感）
      ctx.fillStyle = '#FAF8F0';
      ctx.fillRect(0, 0, width, height);

      // +1.5度の傾きを適用
      const tiltDeg = 1.5;
      const tiltRad = (tiltDeg * Math.PI) / 180;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(tiltRad);
      ctx.translate(-width / 2, -height / 2);

      // 左右ページを描画
      const halfW = width / 2;
      const pageLabels = ['Violin I – p.12', 'Violin I – p.13'];

      for (let pageIdx = 0; pageIdx < 2; pageIdx++) {
        const xBase = pageIdx * halfW;
        const margin = 120;

        // ヘッダー: パート名
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 60px "Times New Roman", serif';
        ctx.fillText(pageLabels[pageIdx], xBase + margin, 160);

        // 五線譜を10段描画
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        const staffSpacing = 12; // 五線間隔
        const staffGap = 140;    // 段間隔

        for (let staff = 0; staff < 10; staff++) {
          const yBase = 260 + staff * staffGap;

          // 小節番号
          ctx.fillStyle = '#333333';
          ctx.font = 'italic 28px "Times New Roman", serif';
          ctx.fillText(`${staff * 4 + 1 + pageIdx * 40}`, xBase + margin - 60, yBase - 8);

          // 5本の線
          for (let line = 0; line < 5; line++) {
            const y = yBase + line * staffSpacing;
            ctx.beginPath();
            ctx.moveTo(xBase + margin, y);
            ctx.lineTo(xBase + halfW - margin, y);
            ctx.stroke();
          }

          // 小節線
          const measures = 4;
          const measWidth = (halfW - margin * 2) / measures;
          for (let m = 0; m <= measures; m++) {
            const x = xBase + margin + m * measWidth;
            ctx.beginPath();
            ctx.moveTo(x, yBase);
            ctx.lineTo(x, yBase + 4 * staffSpacing);
            ctx.stroke();
          }

          // ダミー音符（楕円の黒丸）
          ctx.fillStyle = '#000000';
          for (let m = 0; m < measures; m++) {
            const noteCount = 3 + Math.floor(Math.random() * 3);
            for (let n = 0; n < noteCount; n++) {
              const nx = xBase + margin + m * measWidth + (n + 1) * (measWidth / (noteCount + 1));
              const lineIdx = Math.floor(Math.random() * 5);
              const ny = yBase + lineIdx * staffSpacing;
              ctx.beginPath();
              ctx.ellipse(nx, ny, 12, 9, -0.3, 0, Math.PI * 2);
              ctx.fill();

              // 符幹
              ctx.beginPath();
              ctx.moveTo(nx + 11, ny);
              ctx.lineTo(nx + 11, ny - 50);
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.lineWidth = 2;
            }
          }
        }

        // 脚注テキスト（Urtext風）
        ctx.fillStyle = '#666666';
        ctx.font = 'italic 24px "Times New Roman", serif';
        ctx.fillText(
          'Urtext edition © Bärenreiter-Verlag Karl Vötterle GmbH & Co. KG, Kassel',
          xBase + margin,
          height - 80
        );

        // ページ番号
        ctx.fillStyle = '#000000';
        ctx.font = '32px "Times New Roman", serif';
        const pageNum = String(12 + pageIdx);
        const numWidth = ctx.measureText(pageNum).width;
        ctx.fillText(
          pageNum,
          pageIdx === 0 ? xBase + margin : xBase + halfW - margin - numWidth,
          height - 120
        );
      }

      ctx.restore();

      // ノド影（中央の谷折り影）
      const shadowWidth = 80;
      const gradient = ctx.createLinearGradient(
        halfW - shadowWidth, 0,
        halfW + shadowWidth, 0
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.15)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.35)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.15)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(halfW - shadowWidth, 0, shadowWidth * 2, height);
    }

    const imageUrl = canvas.toDataURL('image/png');
    // メモリ即時解放
    canvas.width = 0;
    canvas.height = 0;

    resolve({
      id: genId(),
      imageUrl,
      originalWidth: width,
      originalHeight: height,
      isSpread: true,
      skipSplit: false,
      isBlank: false,
      pageType: 'single',
      subPage: 'single',
      colorMode: 'color',
      binarizeConfig: { threshold: 128, removeBleedThrough: false },
      bidiMargins: { topMm: 5, bottomMm: 5, insideMm: 5, outsideMm: 5 },
      isCustomized: false,
      gutterMaskLeftMm: 8,
      gutterMaskRightMm: 8,
      spineRatio: 0.5,
      whiteoutRects: [],
      stamps: [],
      deskew: {
        angleRad: (1.5 * Math.PI) / 180,
        angleDeg: 1.5,
      },
      rotation: 0,
    });
  });
};
