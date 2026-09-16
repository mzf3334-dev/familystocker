import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEndpoint, setEndpoint, pingServer } from '../services/storage';
import { APPS_SCRIPT_URL as DEFAULT_URL, GITHUB_OWNER, GITHUB_REPO, DATA_PATH } from '../config';
import { ArrowLeft, LogOut, Server, ExternalLink, Check, PlugZap } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState(getEndpoint());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSaveServer = () => {
    setEndpoint(serverUrl);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await pingServer(serverUrl);
    setTestResult(
      result.ok
        ? `✅ Connected! ${result.count} item(s) on file.`
        : `❌ ${result.error}`
    );
    setTesting(false);
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

        {/* Family Server Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <Server className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-lg">Family Server</h2>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            Saving goes through a free Google Apps Script that commits to{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">{DATA_PATH}</code> in the{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">{GITHUB_OWNER}/{GITHUB_REPO}</code> repo.
            No GitHub tokens needed on your phone.
          </p>

          {/* How-to guide */}
          <details className="mb-4 bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
            <summary className="font-bold text-blue-700 cursor-pointer">
              📖 How the owner sets this up (one-time)
            </summary>
            <ol className="list-decimal ml-4 mt-2 space-y-1">
              <li>
                Open{' '}
                <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  script.google.com
                </a>{' '}
                → <b>New project</b>
              </li>
              <li>
                Copy the code from <b>google-apps-script/Code.gs</b> in this repo, paste it in, and
                fill in <b>MEMBERS</b> (emails for reminders) and <b>REMINDER_DAYS</b>
              </li>
              <li>
                Project Settings (⚙️) → <b>Script Properties</b> → add{' '}
                <b>GITHUB_TOKEN</b> = a fine-grained PAT with <b>Contents: Read &amp; write</b> on this repo
              </li>
              <li>
                <b>Deploy → New deployment → Web app</b>, Execute as: <b>Me</b>, Access: <b>Anyone</b>,
                copy the URL (ends in /exec)
              </li>
              <li>Paste that URL below → Test → Save. Run <b>setupDailyTrigger</b> once in the editor to enable daily email reminders.</li>
            </ol>
          </details>

          <input
            type="url"
            placeholder={DEFAULT_URL || 'https://script.google.com/macros/s/.../exec'}
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm mb-3"
          />
          <div className="flex space-x-2 mb-3">
            <button
              onClick={handleTest}
              disabled={testing || !serverUrl}
              className="flex-1 border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <PlugZap className="w-5 h-5" />
              <span>{testing ? 'Testing...' : 'Test'}</span>
            </button>
            <button
              onClick={handleSaveServer}
              disabled={!serverUrl}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {saved ? <Check className="w-5 h-5" /> : null}
              <span>{saved ? 'Saved!' : 'Save'}</span>
            </button>
          </div>
          {testResult && <p className="text-sm mb-3 text-gray-700">{testResult}</p>}

          <a
            href="https://script.google.com"
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open Google Apps Script
          </a>
          {getEndpoint() && (
            <button
              onClick={() => {
                setEndpoint('');
                setServerUrl('');
              }}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Clear saved server URL (read-only mode)
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
