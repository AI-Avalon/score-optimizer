// @ts-nocheck
import { PDFDocument } from 'pdf-lib';
import type { ExportConfig, GlobalConfig, PaperPreset, ScorePage } from '../types';
import { processPageImage } from './index';

export const resolveFilename = (config: ExportConfig, preset: PaperPreset): string => {
  const base = config.originalFilename.replace(/\.[^/.]+$/, "");
  switch (config.filenameMode) {
    case 'original':
      return `${base}_optimized.pdf`;
    case 'suffix':
      return `${base}${config.suffix}.pdf`;
    case 'date': {
      const d = new Date();
      const ds = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
      return `${base}_${ds}.pdf`;
    }
    case 'custom':
      return `${config.customFilename}.pdf`;
    default:
      return 'score_optimized.pdf';
  }
};

export const exportToPdfPdfLib = async (
  pages: ScorePage[],
  /* preset: PaperPreset */ 
  exportConfig: ExportConfig,
  globalConfig: GlobalConfig,
  onProgress: (progress: number) => void
): Promise<void> => {
  const pdfDoc = await PDFDocument.create();
  
  const pageW = preset.widthMm * (72 / 25.4);
  const pageH = preset.heightMm * (72 / 25.4);
  const outputDpi = 300;
  const targetW = Math.max(1000, Math.floor((preset.widthMm / 25.4) * outputDpi));
  const targetH = Math.max(1000, Math.floor((preset.heightMm / 25.4) * outputDpi));

  let totalGenerated = 0;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const imageDatas = await processPageImage(p, i, globalConfig);

    for (const data of imageDatas) {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;
      
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, targetW, targetH);

      // Fit aspect ratio
      const imgC = document.createElement('canvas');
      imgC.width = data.width;
      imgC.height = data.height;
      imgC.getContext('2d')!.putImageData(data, 0, 0);

      const srcAspect = data.width / data.height;
      const dstAspect = targetW / targetH;
      let drawW, drawH;
      if (srcAspect > dstAspect) {
        drawW = targetW;
        drawH = targetW / srcAspect;
      } else {
        drawH = targetH;
        drawW = targetH * srcAspect;
      }

      const x0 = (targetW - drawW) / 2;
      const y0 = (targetH - drawH) / 2;
      
      // We don't apply margins because the app.py explicitly says:
      // "初期マージンは必ず 0mm とし、用紙いっぱいに最大化配置すること（余計な5mm余白を入れない）。"
      
      ctx.drawImage(imgC, x0, y0, drawW, drawH);

      const base64 = canvas.toDataURL('image/png').split(',')[1];
      const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      
      canvas.width = 0;
      imgC.width = 0;

      const pdfImage = await pdfDoc.embedPng(imgBytes);
      const pdfPage = pdfDoc.addPage([pageW, pageH]);
      pdfPage.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: pageW,
        height: pageH
      });
      totalGenerated++;
    }

    onProgress(Math.round(((i + 1) / pages.length) * 100));
  }

  const pdfBytes = await pdfDoc.save();
  const filename = resolveFilename(exportConfig, { widthMm: 0, heightMm: 0, label: '' });
  
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
