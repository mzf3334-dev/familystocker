import React, { useState } from 'react';
import { useAuth, FAMILY_MEMBERS } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-32 h-32 mx-auto mb-6 overflow-hidden rounded-3xl shadow-lg border-4 border-white">
          <img src="/myapp_icon.jpg" alt="Family Stock Logo" className="w-full h-full object-cover" />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Family Stock</h1>
        <p className="text-gray-500 mb-8">Who are you?</p>

        <div className="space-y-3">
          {FAMILY_MEMBERS.map((name) => (
            <button
              key={name}
              onClick={() => {
                setSelected(name);
                login(name);
              }}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 border-2 ${
                selected === name
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Tap your name to start tracking the family inventory.
        </p>
      </div>
    </div>
  );
};

export default Login;
