import React, { useState } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create user profile if it doesn't exist
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          familyId: null, // Initially no family
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      alert(`Login failed: ${error.message || 'Unknown error'}. Please check your Firebase Console settings.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-32 h-32 mx-auto mb-6 overflow-hidden rounded-3xl shadow-lg border-4 border-white">
          <img 
            src="/myapp_icon.jpg" 
            alt="Family Stock Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Family Stock</h1>
        <p className="text-gray-500 mb-8">Keep track of your family's inventory and never miss an expiry date again.</p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-200 py-4 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
        >
          <div className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full text-[10px] font-black">G</div>
          <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>

        <p className="mt-8 text-xs text-gray-400">
          By continuing, you agree to share your inventory with your family members.
        </p>
      </div>
    </div>
  );
};

export default Login;
