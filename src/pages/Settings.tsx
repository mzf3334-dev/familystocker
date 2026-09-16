import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getToken, setToken, clearToken, GITHUB_OWNER, GITHUB_REPO, DATA_PATH } from '../services/storage';
import { ArrowLeft, LogOut, KeyRound, ExternalLink, Check } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [token, setLocalToken] = useState(getToken() || '');
  const [saved, setSaved] = useState(false);

  const handleSaveToken = () => {
    setToken(token);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
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
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="font-bold text-lg">{user?.name}</h2>
              <p className="text-sm text-gray-500">Family member</p>
            </div>
          </div>
        </div>

        {/* GitHub Token Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg">GitHub Connection</h2>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            Paste a GitHub token so you can save items. Data is stored in{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">{DATA_PATH}</code> in the{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">{GITHUB_OWNER}/{GITHUB_REPO}</code> repo.
          </p>

          {/* How-to guide */}
          <details className="mb-4 bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
            <summary className="font-bold text-blue-700 cursor-pointer">📖 How to get a token (one-time)</summary>
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>
                On GitHub, open{' '}
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Settings → Personal access tokens → Fine-grained tokens
                </a>{' '}
                (must be signed in as the repo owner <b>{GITHUB_OWNER}</b>, or a collaborator)
              </li>
              <li>Repository access → <b>Only select repositories</b> → choose <b>{GITHUB_REPO}</b></li>
              <li>Permissions → <b>Contents → Read and write</b></li>
              <li>Generate token, copy it, paste below → Save Token</li>
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              Tip: family members without GitHub accounts can share one token created by the owner.
              The token is stored only in this browser — never uploaded anywhere.
            </p>
          </details>

          <input
            type="password"
            placeholder="github_pat_... or ghp_..."
            value={token}
            onChange={(e) => setLocalToken(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm mb-3"
          />
          <button
            onClick={handleSaveToken}
            disabled={!token}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {saved ? <Check className="w-5 h-5" /> : null}
            <span>{saved ? 'Saved!' : 'Save Token'}</span>
          </button>

          <a
            href="https://github.com/settings/personal-access-tokens/new?fine_grained=true"
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Create a token (give Contents: Read & write on this repo)
          </a>
          {getToken() && (
            <button
              onClick={() => {
                clearToken();
                setLocalToken('');
              }}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Remove saved token
            </button>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 text-red-500 font-bold py-4 hover:bg-red-50 rounded-2xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Switch Member</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
