import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchData, deleteItem } from '../services/storage';
import type { InventoryItem } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Plus, Settings as SettingsIcon, Trash2, AlertCircle, Calendar, Search, BellRing, RefreshCw } from 'lucide-react';
import { isPast, isBefore, addDays, differenceInCalendarDays, parseISO } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const data = await fetchData();
      setItems(data.items);
    } catch (e: any) {
      setError(e.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this item?')) return;
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete. Check the Family Server URL in Settings.');
    }
  };

  const getExpiryStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date)) return 'expired';
    if (isBefore(date, addDays(new Date(), 3))) return 'critical';
    if (isBefore(date, addDays(new Date(), 7))) return 'warning';
    return 'good';
  };

  // --- Expiry summary + browser notification reminder ---
  const expiredCount = items.filter((i) => getExpiryStatus(i.expiryDate) === 'expired').length;
  const criticalCount = items.filter((i) => getExpiryStatus(i.expiryDate) === 'critical').length;
  const warningCount = items.filter((i) => getExpiryStatus(i.expiryDate) === 'warning').length;
  const alertCount = expiredCount + criticalCount + warningCount;

  useEffect(() => {
    if (alertCount === 0 || !('Notification' in window)) return;

    const notify = () => {
      const parts: string[] = [];
      if (expiredCount) parts.push(`${expiredCount} expired`);
      if (criticalCount) parts.push(`${criticalCount} expiring within 3 days`);
      if (warningCount) parts.push(`${warningCount} expiring this week`);
      new Notification('Family Stock Alert', {
        body: `⚠️ ${parts.join(', ')}. Open the app to check your kitchen.`,
        tag: 'family-stock-expiry', // avoid duplicate notifications
      });
    };

    if (Notification.permission === 'granted') {
      notify();
    } else if (Notification.permission === 'default') {
      // Ask once per session; user gesture not strictly required for this API
      Notification.requestPermission().then((p) => {
        if (p === 'granted') notify();
      });
    }
  }, [alertCount, expiredCount, criticalCount, warningCount]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.chineseName && item.chineseName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 pt-6 pb-4 px-4 z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">My Kitchen</h1>
            <p className="text-sm text-gray-500">Hi, {user?.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => load(true)}
              className="p-2 bg-white rounded-full shadow-sm"
              title="Refresh (pull latest from GitHub)"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/settings" className="p-2 bg-white rounded-full shadow-sm">
              <SettingsIcon className="w-6 h-6 text-gray-600" />
            </Link>
          </div>
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

      {/* Expiry Alert Banner */}
      {alertCount > 0 && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-3">
          <BellRing className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Attention needed</p>
            <p className="text-sm text-red-600">
              {expiredCount > 0 && <span>{expiredCount} item{expiredCount > 1 ? 's' : ''} expired. </span>}
              {criticalCount > 0 && <span>{criticalCount} expiring within 3 days. </span>}
              {warningCount > 0 && <span>{warningCount} expiring this week.</span>}
            </p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading inventory...</p>
        ) : error ? (
          <div className="text-center py-10">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={() => load(true)} className="text-blue-600 font-bold text-sm">
              Try again
            </button>
          </div>
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
                    <span>
                      {status === 'expired'
                        ? `Expired ${Math.abs(differenceInCalendarDays(parseISO(item.expiryDate), new Date()))} day(s) ago`
                        : `${differenceInCalendarDays(parseISO(item.expiryDate), new Date())} day(s) left`}
                    </span>
                    {item.addedBy && <span className="ml-2">· added by {item.addedBy}</span>}
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
