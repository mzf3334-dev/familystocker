/**
 * GitHub-based storage for Family Stock Checker.
 *
 * Data lives in a single JSON file (data/inventory.json) inside this repo.
 * Reads are done via raw.githubusercontent.com (no auth needed).
 * Writes use the GitHub Contents API with a fine-grained Personal Access Token
 * that each family member pastes once — it is stored only in their browser
 * (localStorage) and never committed.
 *
 * Concurrency: writes use the file's current "sha" so conflicting writes fail
 * loudly instead of silently overwriting each other. On conflict we re-fetch,
 * merge, and retry once.
 */

// This repo — where the app is hosted AND where data/inventory.json lives
export const GITHUB_OWNER = 'mzf3334-dev';
export const GITHUB_REPO = 'familystocker';
export const GITHUB_BRANCH = 'main';
export const DATA_PATH = 'data/inventory.json';

const API_BASE = 'https://api.github.com';
const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const TOKEN_KEY = 'fsc_github_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token.trim());
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

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
  try {
    const res = await fetch(`${RAW_BASE}/${DATA_PATH}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return EMPTY_DATA; // file not created yet
    if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
    const json = await res.json();
    return { items: Array.isArray(json.items) ? json.items : [] };
  } catch (error) {
    console.error('fetchData error:', error);
    throw error;
  }
};

// ---------- Write ----------

interface WriteOptions {
  /** Retry once on sha conflict by re-fetching and re-applying a transform */
  mergeRetry?: (current: InventoryData) => InventoryData;
}

export const saveData = async (
  transform: (current: InventoryData) => InventoryData,
  options: WriteOptions = {}
): Promise<InventoryData> => {
  const token = getToken();
  if (!token) throw new Error('GitHub token not set. Go to Settings and paste your token.');

  const doWrite = async (): Promise<InventoryData> => {
    // 1. Get current file (need its sha to update)
    const metaRes = await fetch(
      `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}?ref=${GITHUB_BRANCH}`,
      { headers: githubHeaders(token) }
    );

    let sha: string | undefined;
    let current: InventoryData = EMPTY_DATA;
    if (metaRes.ok) {
      const meta = await metaRes.json();
      sha = meta.sha;
      current = JSON.parse(atob(meta.content.replace(/\n/g, '')));
    } else if (metaRes.status !== 404) {
      throw new Error(`Failed to read data file (${metaRes.status}). Check your token permissions.`);
    }

    // 2. Apply transform and commit
    const next = transform(current);
    const body = {
      message: `Update inventory (${new Date().toISOString()})`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(next, null, 2)))),
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(
      `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}`,
      {
        method: 'PUT',
        headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (putRes.status === 409 || putRes.status === 422) {
      throw new ConflictError();
    }
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Failed to save (${putRes.status})`);
    }
    return next;
  };

  try {
    return await doWrite();
  } catch (e) {
    if (e instanceof ConflictError && options.mergeRetry) {
      // Someone else wrote first — re-fetch and re-apply
      const latest = await fetchData();
      const merged = options.mergeRetry(latest);
      const token2 = getToken()!;
      const metaRes = await fetch(
        `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}?ref=${GITHUB_BRANCH}`,
        { headers: githubHeaders(token2) }
      );
      const meta = await metaRes.json();
      const putRes = await fetch(
        `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}`,
        {
          method: 'PUT',
          headers: { ...githubHeaders(token2), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Update inventory (merged, ${new Date().toISOString()})`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(merged, null, 2)))),
            branch: GITHUB_BRANCH,
            sha: meta.sha,
          }),
        }
      );
      if (!putRes.ok) throw new Error('Failed to save after merge. Please try again.');
      return merged;
    }
    throw e;
  }
};

class ConflictError extends Error {}

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

// ---------- Item helpers ----------

export const addItem = async (item: Omit<InventoryItem, 'id' | 'createdAt'>): Promise<void> => {
  await saveData(
    (current) => ({
      items: [
        ...current.items,
        { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ],
    }),
    {
      mergeRetry: (latest) => ({
        items: [
          ...latest.items,
          { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ],
      }),
    }
  );
};

export const deleteItem = async (id: string): Promise<void> => {
  await saveData(
    (current) => ({ items: current.items.filter((i) => i.id !== id) }),
    { mergeRetry: (latest) => ({ items: latest.items.filter((i) => i.id !== id) }) }
  );
};
