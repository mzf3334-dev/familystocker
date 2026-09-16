/**
 * Family Stock Checker storage.
 *
 * All family members save WITHOUT any GitHub tokens:
 * the app talks to a Google Apps Script web app (free), which commits
 * changes to data/inventory.json in this GitHub repo using a hidden
 * owner token stored inside the script (see google-apps-script/Code.gs).
 *
 * - The Apps Script URL can be baked into src/config.ts by the owner,
 *   or pasted per-device in Settings (stored in localStorage).
 * - If no URL is configured, the app falls back to READ-ONLY mode
 *   (fetches the committed JSON from raw.githubusercontent.com).
 */

import { APPS_SCRIPT_URL as DEFAULT_URL, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, DATA_PATH } from '../config';

const ENDPOINT_KEY = 'fsc_server_url';

export const getEndpoint = (): string =>
  localStorage.getItem(ENDPOINT_KEY) || DEFAULT_URL;

export const setEndpoint = (url: string) => {
  const trimmed = url.trim();
  if (trimmed) localStorage.setItem(ENDPOINT_KEY, trimmed.replace(/\/$/, ''));
  else localStorage.removeItem(ENDPOINT_KEY);
};

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

// ---------- Data model ----------

export interface InventoryItem {
  id: string;
  name: string;
  chineseName?: string;
  expiryDate: string; // YYYY-MM-DD
  addedBy: string; // member name
  createdAt: string; // ISO string
}

export interface InventoryData {
  items: InventoryItem[];
}

const EMPTY_DATA: InventoryData = { items: [] };

// ---------- Read ----------

export const fetchData = async (): Promise<InventoryData> => {
  const endpoint = getEndpoint();
  if (endpoint) {
    // Read through the Apps Script (works even if the JSON isn't committed yet)
    const res = await fetch(endpoint, { method: 'GET', redirect: 'follow' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to load data');
    return { items: Array.isArray(json.data.items) ? json.data.items : [] };
  }

  // Read-only fallback: the committed JSON file (no auth needed)
  const res = await fetch(`${RAW_BASE}/${DATA_PATH}?t=${Date.now()}`, { cache: 'no-store' });
  if (res.status === 404) return EMPTY_DATA;
  if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
  const json = await res.json();
  return { items: Array.isArray(json.items) ? json.items : [] };
};

// ---------- Write ----------

const post = async (payload: object): Promise<InventoryData> => {
  const endpoint = getEndpoint();
  if (!endpoint) {
    throw new Error('Family Server not set up yet. Open Settings to add the server URL (owner does this once).');
  }
  // text/plain avoids a CORS preflight; Apps Script requires simple requests
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Failed to save');
  return json.data;
};

export const addItem = async (item: Omit<InventoryItem, 'id' | 'createdAt'>): Promise<void> => {
  await post({ action: 'add', item });
};

export const deleteItem = async (id: string): Promise<void> => {
  await post({ action: 'delete', id });
};

/** Quick connectivity test used by the Settings page */
export const pingServer = async (url?: string): Promise<{ ok: boolean; count?: number; error?: string }> => {
  const target = (url || getEndpoint()).trim().replace(/\/$/, '');
  if (!target) return { ok: false, error: 'No URL entered' };
  try {
    const res = await fetch(target, { method: 'GET', redirect: 'follow' });
    const json = await res.json();
    if (!json.ok) return { ok: false, error: json.error || 'Server error' };
    return { ok: true, count: json.data?.items?.length ?? 0 };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Could not reach server' };
  }
};
