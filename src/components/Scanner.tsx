import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { performOCR, parseOCRText, rotateImage } from '../services/ocr';
import type { OCRResult } from '../services/ocr';

interface ScannerProps {
  onScanComplete: (result: OCRResult) => void;
  label?: string;
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, label = "Scan" }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStatus('Initializing...');
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file.');
      }
      
      // Try multiple rotations if needed
      const rotations = [0, 90, 270, 180];
      let finalResult: OCRResult | null = null;

      for (let i = 0; i < rotations.length; i++) {
        const rotation = rotations[i];
        setScanStatus(rotation === 0 ? 'Scanning...' : `Retrying (rotated ${rotation}°)`);
        
        const processedFile = rotation === 0 ? file : await rotateImage(file, rotation);
        
        // Use only English for date scanning to improve speed and accuracy
        const languages = label.toLowerCase().includes('date') ? ['eng'] : ['eng', 'chi_sim', 'chi_tra'];
        const text = await performOCR(processedFile, languages);
        const result = parseOCRText(text);

        // If we found a date, we're happy
        if (result.expiryDate) {
          finalResult = result;
          break;
        }
        
        // If it's the first pass and we found a name but no date, keep it as fallback
        if (rotation === 0 && (result.name !== 'Unknown Product' || result.chineseName)) {
          finalResult = result;
        }
      }

      if (finalResult) {
        onScanComplete(finalResult);
      } else {
        alert('Could not find any product info or date. Please try a clearer photo.');
      }
    } catch (error: any) {
      console.error('OCR Error:', error);
      alert(`Failed to scan image: ${error.message || 'Please try again.'}`);
    } finally {
      setIsScanning(false);
      setScanStatus('');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border-2 border-dashed border-gray-300 rounded-2xl bg-white shadow-sm">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraInputRef}
        onChange={handleFileChange}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      {isScanning ? (
        <div className="flex flex-col items-center py-4 space-y-2">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-600 font-medium">{scanStatus || `Reading ${label}...`}</p>
        </div>
      ) : (
        <div className="w-full">
          <p className="text-center text-sm font-bold text-gray-700 mb-4">{label}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-md"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider">Camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
            >
              <Upload className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider">Gallery</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
