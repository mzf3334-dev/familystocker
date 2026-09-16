/**
 * Family Stock Checker — Google Apps Script backend
 * =================================================
 * Acts as a tiny free "server" so all family members can save inventory
 * WITHOUT needing GitHub tokens. Data still lives in data/inventory.json
 * in the GitHub repo (committed via a hidden owner token stored here).
 * Also emails everyone N days before items expire.
 *
 * ============================ ONE-TIME SETUP (owner only) ============================
 * 1. Go to https://script.google.com → New project
 * 2. Replace the default code with this entire file
 * 3. Edit CONFIG below: MEMBERS (names + emails) and REMINDER_DAYS
 * 4. Project Settings (⚙️) → Script Properties → add property:
 *       GITHUB_TOKEN = <a fine-grained PAT with Contents: Read & write on the repo>
 * 5. Deploy → New deployment → type: Web app
 *       Execute as: Me      Who has access: Anyone
 * 6. Copy the Web app URL (ends in /exec)
 *    → paste it into the app's Settings ("Family Server URL"), or bake it
 *      into src/config.ts before deploying the site.
 * 7. In the editor, run setupDailyTrigger() once (approve permissions)
 *    → enables daily email reminders.
 * ====================================================================================
 */

// ===== CONFIG =====
const GITHUB_OWNER = 'mzf3334-dev';
const GITHUB_REPO = 'familystocker';
const GITHUB_BRANCH = 'main';
const DATA_PATH = 'data/inventory.json';

/** Email reminders are sent this many days before expiry (and for already-expired) */
const REMINDER_DAYS = 3;

/** Who receives reminder emails — fill in real addresses */
const MEMBERS = [
  { name: 'Tony', email: 'tony@example.com' },
  { name: 'Member 2', email: '' },
  { name: 'Member 3', email: '' },
];

const API_BASE = 'https://api.github.com';
const TOKEN = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');

// ===== Helpers =====

function parseDataFile_(res) {
  if (res.getResponseCode() === 404) return { sha: undefined, data: { items: [] } };
  if (res.getResponseCode() !== 200) {
    throw new Error('GitHub read failed (' + res.getResponseCode() + '). Check GITHUB_TOKEN in Script Properties.');
  }
  const meta = JSON.parse(res.getContentText());
  const content = Utilities.newBlob(Utilities.base64DecodeWebSafe(meta.content)).getDataAsString();
  return { sha: meta.sha, data: JSON.parse(content) };
}

function getDataFile_() {
  const url = API_BASE + '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + DATA_PATH + '?ref=' + GITHUB_BRANCH;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true,
  });
  return parseDataFile_(res);
}

/** Fetch → transform → commit, serialized by a lock + retry on conflicts */
function saveData_(transform) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const url = API_BASE + '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + DATA_PATH;
      const current = getDataFile_();
      const next = transform(current.data);
      const payload = {
        message: 'Update inventory (via Family Stock app)',
        content: Utilities.base64EncodeWebSafe(JSON.stringify(next, null, 2)),
        branch: GITHUB_BRANCH,
      };
      if (current.sha) payload.sha = current.sha;

      const put = UrlFetchApp.fetch(url, {
        method: 'put',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      const code = put.getResponseCode();
      if (code >= 200 && code < 300) return next;
      if (code === 409 || code === 422) continue; // someone saved first — retry
      throw new Error('GitHub save failed (' + code + '): ' + put.getContentText().slice(0, 200));
    }
    throw new Error('Too many simultaneous changes. Please try again.');
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===== Web app endpoints =====

function doGet() {
  try {
    return json_({ ok: true, data: getDataFile_().data });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    let data;
    if (body.action === 'add') {
      const item = {
        name: String(body.item.name || '').slice(0, 100),
        chineseName: body.item.chineseName || undefined,
        expiryDate: body.item.expiryDate,
        addedBy: String(body.item.addedBy || 'Unknown').slice(0, 30),
      };
      if (!item.name || !item.expiryDate) throw new Error('Missing name or expiry date');
      data = saveData_((d) => ({
        items: d.items.concat({
          ...item,
          id: Utilities.getUuid(),
          createdAt: new Date().toISOString(),
        }),
      }));
    } else if (body.action === 'delete') {
      data = saveData_((d) => ({ items: d.items.filter((i) => i.id !== body.id) }));
    } else if (body.action === 'ping') {
      data = getDataFile_().data;
    } else {
      throw new Error('Unknown action: ' + body.action);
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

// ===== Expiry email reminders =====

/** Emails all members with a digest of items expiring within REMINDER_DAYS */
function sendReminders() {
  if (!MEMBERS.some((m) => m.email)) return;
  const data = getDataFile_().data;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiring = data.items
    .map((item) => {
      const exp = new Date(item.expiryDate + 'T00:00:00');
      const days = Math.round((exp - today) / 86400000);
      return { ...item, daysLeft: days };
    })
    .filter((item) => item.daysLeft <= REMINDER_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (expiring.length === 0) return;

  const rows = expiring
    .map((item) => {
      const when =
        item.daysLeft < 0
          ? '⚠️ EXPIRED ' + Math.abs(item.daysLeft) + ' day(s) ago'
          : '⏳ expires in ' + item.daysLeft + ' day(s)';
      return (
        '<li><b>' + item.name + '</b>' +
        (item.chineseName ? ' (' + item.chineseName + ')' : '') +
        ' — ' + when + ' · added by ' + (item.addedBy || '?') + '</li>'
      );
    })
    .join('');

  const html =
    '<h2>Family Stock: ' + expiring.length + ' item(s) need attention</h2><ul>' + rows + '</ul>' +
    '<p>Open the app to check: https://mzf3334-dev.github.io/familystocker/</p>';

  MEMBERS.filter((m) => m.email).forEach((m) => {
    MailApp.sendEmail({
      to: m.email,
      subject: '🥛 Family Stock: ' + expiring.length + ' item(s) expiring soon',
      htmlBody: html,
    });
  });
}

/** Run this ONCE from the editor to enable daily 8:00 reminders */
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === 'sendReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendReminders').timeBased().atHour(8).everyDays(1).create();
}
