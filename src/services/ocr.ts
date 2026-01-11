import { createWorker } from 'tesseract.js';

export interface OCRResult {
  name: string;
  chineseName: string;
  expiryDate: string | null;
}

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

export const parseOCRText = (text: string): OCRResult => {
  // Clean text: replace common misreads for numbers
  const cleanedText = text
    .replace(/O/g, '0')
    .replace(/I|l|\|/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/G/g, '6')
    .replace(/Z/g, '2');

  const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let name = '';
  let chineseName = '';
  let expiryDate: string | null = null;

  // Comprehensive Date Regex Patterns
  const patterns = [
    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
    // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/,
    // DD-MM-YY or DD/MM/YY or DD.MM.YY
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})/,
    // YYYYMMDD (8 digits)
    /\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/,
    // DDMMYYYY (8 digits)
    /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(20\d{2})\b/,
    // DDMMYY (6 digits)
    /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(\d{2})\b/,
    // YYMMDD (6 digits)
    /\b(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/,
    // Flexible YYYY MM DD (with spaces)
    /\b(20\d{2})\s(0[1-9]|1[0-2])\s(0[1-9]|[12]\d|3[01])\b/,
    // Flexible DD MM YYYY
    /\b(0[1-9]|[12]\d|3[01])\s(0[1-9]|1[0-2])\s(20\d{2})\b/,
    // DD MMM YYYY (e.g. 31 DEC 2019)
    /(\d{1,2})\s(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s(\d{2,4})/i,
  ];

  // Keywords that often precede a date
  const dateKeywords = ['EXP', 'E:', 'EXPIRY', 'BBD', 'BEST BEFORE', 'USE BY', '此日期前最佳', '到期日'];

  const monthMap: { [key: string]: string } = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
  };

  for (const line of lines) {
    const upperLine = line.toUpperCase();
    
    // Check for date patterns
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && !expiryDate) {
        // Logic to normalize the date
        if (pattern.source.includes('JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC')) {
          // DD MMM YYYY
          const day = match[1].padStart(2, '0');
          const month = monthMap[match[2].toUpperCase().substring(0, 3)];
          let year = match[3];
          if (year.length === 2) year = '20' + year;
          expiryDate = `${year}-${month}-${day}`;
        } else if (pattern.source.includes('20\\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])')) {
          expiryDate = `${match[1]}-${match[2]}-${match[3]}`;
        } else if (pattern.source.includes('0[1-9]|[12]\\d|3[01])(0[1-9]|1[0-2])(20\\d{2})')) {
          expiryDate = `${match[3]}-${match[2]}-${match[1]}`;
        } else if (pattern.source.includes('0[1-9]|[12]\\d|3[01])(0[1-9]|1[0-2])(\\d{2})')) {
          expiryDate = `20${match[3]}-${match[2]}-${match[1]}`;
        } else if (match[1].length === 4) {
          expiryDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else if (match[3].length === 4) {
          expiryDate = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        } else if (match[3].length === 2) {
          expiryDate = `20${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
        if (expiryDate) break;
      }
    }

    if (expiryDate) continue;

    // Try to distinguish between Chinese and English for names
    const hasChinese = /[\u4e00-\u9fa5]/.test(line);
    const isKeyword = dateKeywords.some(kw => upperLine.includes(kw));
    
    if (!isKeyword) {
      if (hasChinese && !chineseName) {
        chineseName = line;
      } else if (!hasChinese && !name && line.length > 3 && !/\d/.test(line)) {
        name = line;
      }
    }
  }

  return {
    name: name || 'Unknown Product',
    chineseName: chineseName || '',
    expiryDate: expiryDate,
  };
};
