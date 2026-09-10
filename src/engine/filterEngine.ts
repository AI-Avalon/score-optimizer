// filterEngine.ts
// Pure functions for binarization (fixed and adaptive)

export function binarizeFixed(data: ImageData, threshold: number): ImageData {
  const output = new ImageData(data.width, data.height);
  const len = data.data.length;
  for (let i = 0; i < len; i += 4) {
    // rgb to gray: 0.299*R + 0.587*G + 0.114*B
    const gray = data.data[i] * 0.299 + data.data[i+1] * 0.587 + data.data[i+2] * 0.114;
    const val = gray >= threshold ? 255 : 0;
    output.data[i] = val;
    output.data[i+1] = val;
    output.data[i+2] = val;
    output.data[i+3] = 255;
  }
  return output;
}

// Integral image based fast local mean adaptive threshold
// block_size = 31, C = 11 (matches app.py cv2.adaptiveThreshold)
export function binarizeAdaptive(data: ImageData): ImageData {
  const w = data.width;
  const h = data.height;
  const output = new ImageData(w, h);
  
  // 1. Create grayscale buffer and integral image
  const gray = new Float32Array(w * h);
  const integral = new Float32Array((w + 1) * (h + 1));
  
  let i = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const g = data.data[idx] * 0.299 + data.data[idx+1] * 0.587 + data.data[idx+2] * 0.114;
      gray[i++] = g;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const g = gray[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = 
        g + 
        integral[(y + 1) * (w + 1) + x] + 
        integral[y * (w + 1) + (x + 1)] - 
        integral[y * (w + 1) + x];
    }
  }

  const s = Math.floor(31 / 2); // block_size=31
  const C = 11; // constant
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(x - s, 0);
      const y1 = Math.max(y - s, 0);
      const x2 = Math.min(x + s, w - 1);
      const y2 = Math.min(y + s, h - 1);
      
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      
      const sum = integral[(y2 + 1) * (w + 1) + (x2 + 1)] -
                  integral[(y1) * (w + 1) + (x2 + 1)] -
                  integral[(y2 + 1) * (w + 1) + (x1)] +
                  integral[(y1) * (w + 1) + (x1)];
                  
      const mean = sum / count;
      
      const g = gray[y * w + x];
      const val = g >= (mean - C) ? 255 : 0;
      
      const idx = (y * w + x) * 4;
      output.data[idx] = val;
      output.data[idx+1] = val;
      output.data[idx+2] = val;
      output.data[idx+3] = 255;
    }
  }
  
  return output;
}

// Utility to convert ImageData to grayscale for processing
export function toGray(data: ImageData): Float32Array {
  const len = data.width * data.height;
  const gray = new Float32Array(len);
  let j = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    gray[j++] = data.data[i] * 0.299 + data.data[i+1] * 0.587 + data.data[i+2] * 0.114;
  }
  return gray;
}
