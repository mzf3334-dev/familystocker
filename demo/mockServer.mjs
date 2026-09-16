/**
 * DEMO ONLY — a local mock of the Google Apps Script web app.
 * Implements the same GET/POST API so the app can be demoed without
 * deploying the real script. Data is stored in demo-data.json.
 *
 * Run: node demo/mockServer.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, 'mock-data.json');
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ items: [] }, null, 2));

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.end(); return; }

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      const db = JSON.parse(fs.readFileSync(FILE));
      let out;
      if (req.method === 'GET') {
        out = { ok: true, data: db };
      } else {
        const msg = JSON.parse(body);
        if (msg.action === 'add') {
          db.items.push({ ...msg.item, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
        } else if (msg.action === 'delete') {
          db.items = db.items.filter((i) => i.id !== msg.id);
        } else {
          throw new Error('Unknown action');
        }
        fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
        out = { ok: true, data: db };
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(out));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
  });
});

server.listen(8787, () => console.log('Mock Family Server on http://localhost:8787/exec'));
