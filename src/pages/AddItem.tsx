import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Scanner from '../components/Scanner';
import type { OCRResult } from '../services/ocr';
import { ArrowLeft, Bell } from 'lucide-react';
import { addToGoogleCalendar } from '../utils/calendar';

const AddItem: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [chineseName, setChineseName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [setReminder, setSetReminder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameScanComplete = (result: OCRResult) => {
    if (result.name && result.name !== 'Unknown Product') {
      setName(result.name);
    }
    if (result.chineseName) {
      setChineseName(result.chineseName);
    }
  };

  const handleDateScanComplete = (result: OCRResult) => {
    if (result.expiryDate) {
      try {
        const date = new Date(result.expiryDate);
        if (!isNaN(date.getTime())) {
          setExpiryDate(date.toISOString().split('T')[0]);
        }
      } catch (e) {
        console.error('Date parsing error', e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.familyId) {
      alert('You must be part of a family to add items.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'inventory'), {
        familyId: user.familyId,
        name,
        chineseName,
        expiryDate,
        addedBy: user.uid,
        createdAt: new Date().toISOString(),
      });

      if (setReminder) {
        addToGoogleCalendar(name, expiryDate);
      }

      navigate('/');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to save item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-4 p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Add New Item</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <Scanner label="Scan Product Name" onScanComplete={handleNameScanComplete} />
        <Scanner label="Scan Expiry Date" onScanComplete={handleDateScanComplete} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Step 2: Confirm Details</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name (English)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Whole Milk"
            required={!chineseName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name (Chinese)</label>
          <input
            type="text"
            value={chineseName}
            onChange={(e) => setChineseName(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. 全脂牛奶"
            required={!name}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div className="flex items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="flex-1">
            <div className="flex items-center text-blue-700 font-bold mb-1">
              <Bell className="w-4 h-4 mr-2" />
              <span>Set Reminder</span>
            </div>
            <p className="text-xs text-blue-600">Add a calendar event 1 week before expiry.</p>
          </div>
          <input
            type="checkbox"
            checked={setReminder}
            onChange={(e) => setSetReminder(e.target.checked)}
            className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
              isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-lg active:scale-95'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save to Inventory'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddItem;
