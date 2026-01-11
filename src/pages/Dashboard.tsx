import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import type { InventoryItem } from '../types';
import { Plus, Settings as SettingsIcon, Trash2, AlertCircle, Calendar, Search } from 'lucide-react';
import { formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'inventory'),
      where('familyId', '==', user.familyId),
      orderBy('expiryDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setItems(itemsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.familyId]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const getExpiryStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date)) return 'expired';
    if (isBefore(date, addDays(new Date(), 3))) return 'critical';
    if (isBefore(date, addDays(new Date(), 7))) return 'warning';
    return 'good';
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.chineseName && item.chineseName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user?.familyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">No Family Joined</h1>
        <p className="text-gray-500 mb-6">You need to join or create a family to start tracking inventory.</p>
        <button
          onClick={() => navigate('/settings')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 pt-6 pb-4 px-4 z-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">My Kitchen</h1>
          <Link to="/settings" className="p-2 bg-white rounded-full shadow-sm">
            <SettingsIcon className="w-6 h-6 text-gray-600" />
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-3 pl-10 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading inventory...</p>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No items found. Start by adding one!</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const status = getExpiryStatus(item.expiryDate);
            const statusColors = {
              expired: 'bg-red-50 border-red-200 text-red-700',
              critical: 'bg-orange-50 border-orange-200 text-orange-700',
              warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
              good: 'bg-white border-gray-100 text-gray-700',
            };

            return (
              <div
                key={item.id}
                className={`flex items-center p-4 rounded-2xl border shadow-sm transition-all ${statusColors[status]}`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{item.name}</h3>
                  {item.chineseName && <p className="text-sm opacity-80 truncate">{item.chineseName}</p>}
                  <div className="flex items-center mt-1 text-xs font-medium opacity-70">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>Expires {formatDistanceToNow(new Date(item.expiryDate), { addSuffix: true })}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 ml-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <Link
        to="/add"
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-blue-700 active:scale-95 transition-all z-20"
      >
        <Plus className="w-8 h-8" />
      </Link>
    </div>
  );
};

export default Dashboard;
