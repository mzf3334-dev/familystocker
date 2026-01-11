import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, LogOut, Users, Copy, Check, UserPlus } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [familyCode, setFamilyCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const createFamily = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newFamilyId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create family doc
      await setDoc(doc(db, 'families', newFamilyId), {
        id: newFamilyId,
        name: `${user.displayName}'s Family`,
        members: [user.uid],
        createdAt: new Date().toISOString(),
      });

      // Update user doc
      await updateDoc(doc(db, 'users', user.uid), {
        familyId: newFamilyId
      });

      alert(`Family created! Code: ${newFamilyId}`);
      window.location.reload(); // Refresh to update context
    } catch (error) {
      console.error('Error creating family:', error);
      alert('Failed to create family.');
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    if (!user || !familyCode) return;
    setLoading(true);
    try {
      const familyRef = doc(db, 'families', familyCode.toUpperCase());
      const familyDoc = await getDoc(familyRef);

      if (!familyDoc.exists()) {
        alert('Family code not found.');
        return;
      }

      // Update family members
      const familyData = familyDoc.data();
      const updatedMembers = [...(familyData.members || []), user.uid];
      await updateDoc(familyRef, {
        members: updatedMembers
      });

      // Update user doc
      await updateDoc(doc(db, 'users', user.uid), {
        familyId: familyCode.toUpperCase()
      });

      alert('Joined family successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error joining family:', error);
      alert('Failed to join family.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (user?.familyId) {
      navigator.clipboard.writeText(user.familyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate('/')} className="mr-4 p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="font-bold text-lg">{user?.displayName}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Family Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-6">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg">Family Sharing</h2>
          </div>

          {user?.familyId ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Share this code with your family members to let them join your inventory.</p>
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="font-mono font-bold text-xl tracking-widest">{user.familyId}</span>
                <button onClick={copyToClipboard} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Join a Family</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter Code"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={joinFamily}
                    disabled={loading || !familyCode}
                    className="bg-blue-600 text-white px-4 rounded-xl font-bold disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 uppercase">or</span>
                </div>
              </div>

              <button
                onClick={createFamily}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span>Create New Family</span>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 text-red-500 font-bold py-4 hover:bg-red-50 rounded-2xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
