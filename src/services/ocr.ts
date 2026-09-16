import { createWorker } from 'tesseract.js';

export interface OCRResult {
  name: string;
  chineseName: string;
  expiryDate: string | null;
}

/**
 * Preprocess image for better OCR accuracy:
 * - Downscale very large photos (faster + Tesseract works best ~1000-2000px)
 * - Upscale tiny images
 * - Boost contrast & convert to grayscale
 */
export const preprocessImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      const MIN = 800;
      let { width, height } = img;

      if (width > MAX || height > MAX) {
        const scale = MAX / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      } else if (Math.max(width, height) < MIN) {
        const scale = MIN / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));

      ctx.drawImage(img, 0, 0, width, height);

      // Grayscale + contrast boost
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const contrast = 1.35;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const adjusted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
        data[i] = data[i + 1] = data[i + 2] = adjusted;
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '_prep.png', { type: 'image/png' }));
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        },
        'image/png',
        0.95
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const performOCR = async (imageFile: File | string, languages: string[] = ['eng', 'chi_sim', 'chi_tra']): Promise<string> => {
  const worker = await createWorker(languages);
  
  // Try normal recognition first
  const { data: { text } } = await worker.recognize(imageFile);
  
  await worker.terminate();
  return text;
};

/**
 * Helper to rotate an image using Canvas API
 * This needs to be called in a browser environment
 */
export const rotateImage = (file: File, degrees: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));

      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((blob) => {
        if (blob) {
          const rotatedFile = new File([blob], file.name, { type: file.type });
          resolve(rotatedFile);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, file.type);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// ---------- Date parsing helpers ----------

const MONTH_MAP: { [key: string]: string } = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const pad = (n: string) => n.padStart(2, '0');

/** Validate a candidate date; reject impossible dates like 2025-13-45 */
const isValidDate = (y: number, m: number, d: number): boolean => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

const normalize = (y: number, m: number, d: number): string | null => {
  if (y < 100) y += 2000;
  if (y < 2020 || y > 2100) return null; // expiry dates are always future-ish
  if (!isValidDate(y, m, d)) return null;
  return `${y}-${pad(String(m))}-${pad(String(d))}`;
};

interface DatePattern {
  regex: RegExp;
  /** returns [year, month, day] from the match, or null if not applicable */
  extract: (m: RegExpMatchArray) => [number, number, number] | null;
}

const DATE_PATTERNS: DatePattern[] = [
  // DD MMM YYYY / DDMMMYYYY (e.g. 31 DEC 2019, 31DEC2019)
  {
    regex: /\b(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{2,4})\b/i,
    extract: (m) => {
      const month = MONTH_MAP[m[2].toUpperCase().substring(0, 3)];
      if (!month) return null;
      return [parseInt(m[3]), parseInt(month), parseInt(m[1])];
    },
  },
  // MMM DD YYYY (e.g. DEC 31 2019)
  {
    regex: /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{1,2})\s*,?\s*(\d{2,4})\b/i,
    extract: (m) => {
      const month = MONTH_MAP[m[1].toUpperCase().substring(0, 3)];
      if (!month) return null;
      return [parseInt(m[3]), parseInt(month), parseInt(m[2])];
    },
  },
  // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD (with optional spaces)
  {
    regex: /\b(20\d{2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\b/,
    extract: (m) => [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])],
  },
  // YYYYMMDD (8 digits)
  {
    regex: /\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/,
    extract: (m) => [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])],
  },
  // DD-MM-YYYY / DD/MM/YYYY (day-first is common on HK/China packaging)
  {
    regex: /\b(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(20\d{2})\b/,
    extract: (m) => [parseInt(m[3]), parseInt(m[2]), parseInt(m[1])],
  },
  // DDMMYYYY (8 digits)
  {
    regex: /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(20\d{2})\b/,
    extract: (m) => [parseInt(m[3]), parseInt(m[2]), parseInt(m[1])],
  },
  // DD-MM-YY / DD/MM/YY
  {
    regex: /\b(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2})\b/,
    extract: (m) => [parseInt(m[3]), parseInt(m[2]), parseInt(m[1])],
  },
  // DDMMYY (6 digits)
  {
    regex: /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(\d{2})\b/,
    extract: (m) => [parseInt(m[3]), parseInt(m[2]), parseInt(m[1])],
  },
];

// Keywords that often precede a date — lines containing these are date lines, not names
const DATE_KEYWORDS = ['EXP', 'EXPIRY', 'EXPIRE', 'BBD', 'BEST BEFORE', 'USE BY', 'BB:', '此日期前最佳', '此日期前', '到期', '有效期', '保質期', '保质期'];

const hasChinese = (s: string) => /[\u4e00-\u9fff]/.test(s);

/** Score a line as a product-name candidate. Higher = better. Returns -1 for non-candidates. */
const nameScore = (line: string): number => {
  if (line.length < 2 || line.length > 40) return -1;
  const letters = (line.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  if (letters < 2) return -1;
  if (letters / line.length < 0.5) return -1;
  // Penalize packaging noise words
  const noise = /^(NET|GROSS|WT|ML|G|KG|L|LOT|BATCH|MADE IN|PROD|INGREDIENT|STORAGE|KEEP|REFRIGERAT)/i;
  if (noise.test(line)) return -1;
  let score = Math.min(line.length, 25);
  if (/^[A-Z0-9 &'.-]+$/.test(line)) score += 5; // brand-like ALL CAPS lines
  return score;
};

export const parseOCRText = (text: string): OCRResult => {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let expiryDate: string | null = null;
  let bestEnglish: { line: string; score: number } | null = null;
  let chineseName = '';

  // Pass 1: find expiry date — prefer lines with date keywords (EXP, BEST BEFORE, 此日期前最佳...)
  const dateLines = lines.filter((l) => DATE_KEYWORDS.some((kw) => l.toUpperCase().includes(kw)));
  const otherLines = lines.filter((l) => !dateLines.includes(l));

  for (const line of [...dateLines, ...otherLines]) {
    for (const { regex, extract } of DATE_PATTERNS) {
      const m = line.match(regex);
      if (m) {
        const parts = extract(m);
        if (parts) {
          const normalized = normalize(...parts);
          if (normalized) {
            expiryDate = normalized;
            break;
          }
        }
      }
    }
    if (expiryDate) break;
  }

  // Pass 2: find product names — do NOT mangle text with O->0 style replacements
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (DATE_KEYWORDS.some((kw) => upper.includes(kw))) continue;
    // Skip lines that look like pure dates
    if (/\d{1,4}\s*[-/.]\s*\d{1,4}/.test(line) && !hasChinese(line)) continue;

    if (hasChinese(line)) {
      if (!chineseName) {
        const cleaned = line.replace(/[^\u4e00-\u9fff]/g, '');
        if (cleaned.length >= 2) chineseName = cleaned;
      }
    } else {
      const score = nameScore(line);
      if (score > 0 && (!bestEnglish || score > bestEnglish.score)) {
        bestEnglish = { line, score };
      }
    }
  }

  return {
    name: bestEnglish?.line || 'Unknown Product',
    chineseName,
    expiryDate,
  };
};
