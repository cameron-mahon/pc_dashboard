const { put, get: getBlob } = require('@vercel/blob');
const crypto = require('crypto');

const BLOB_KEY = 'pc-dashboard-data.json';
const USERS_KEY = 'pc-dashboard-users.json';

function verify(token) {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!userId || !sig) return null;
  const secret = process.env.PC_SESSION_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return userId;
}

function getSessionUserId(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)pc_session=([^;]+)/);
  return match ? verify(match[1]) : null;
}

async function readBlob(key) {
  const result = await getBlob(key, { access: 'private' });
  if (!result) return null;
  const chunks = [];
  for await (const chunk of result.stream) {
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

async function getData() {
  const data = await readBlob(BLOB_KEY);
  if (data === null) throw new Error('Blob read failed');
  return data;
}

async function saveData(data) {
  if (!data || Object.keys(data).length === 0) {
    throw new Error('Refusing to save empty data — would wipe blob');
  }
  await put(BLOB_KEY, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function getUserRole(userId) {
  const users = (await readBlob(USERS_KEY)) || [];
  const user = users.find(u => u.id === userId);
  return user ? user.role : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const userId = getSessionUserId(req);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { action, key, value } = req.body || {};

  try {
    if (action === 'getAll') {
      const data = await getData();
      return res.json({ ok: true, data });
    }

    if (action === 'put') {
      if (!key) return res.status(400).json({ error: 'Key required' });
      const role = await getUserRole(userId);
      if (role === 'visitor') return res.status(403).json({ error: 'Visitors cannot modify data' });
      const data = await getData();
      data[key] = value;
      await saveData(data);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: 'Storage unavailable', detail: err.message });
  }
};
