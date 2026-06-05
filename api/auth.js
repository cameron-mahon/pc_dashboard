const { put, list, get: getBlob } = require('@vercel/blob');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BLOB_KEY = 'pc-dashboard-users.json';
const SALT_ROUNDS = 10;

function sign(userId) {
  const secret = process.env.PC_SESSION_SECRET;
  const sig = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  return `${userId}.${sig}`;
}

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

function setSessionCookie(res, userId) {
  const token = sign(userId);
  res.setHeader('Set-Cookie',
    `pc_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie',
    'pc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  );
}

function getSessionUserId(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)pc_session=([^;]+)/);
  return match ? verify(match[1]) : null;
}

async function getUsers() {
  try {
    const result = await getBlob(BLOB_KEY, { access: 'private' });
    if (!result) return [];
    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    return [];
  }
}

async function saveUsers(users) {
  await put(BLOB_KEY, JSON.stringify(users), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { action, name, password } = req.body || {};

  if (action === 'me') {
    const userId = getSessionUserId(req);
    if (!userId) return res.json({ ok: false });
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) { clearSessionCookie(res); return res.json({ ok: false }); }
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, email: user.email || null, crab: user.crab || null } });
  }

  if (action === 'logout') {
    clearSessionCookie(res);
    return res.json({ ok: true });
  }

  // one-time migration: promote Chesapeake Blue to admin
  if (action === 'migrate') {
    const users = await getUsers();
    const cb = users.find(u => u.name === 'Chesapeake Blue');
    if (cb && cb.role !== 'admin') {
      cb.role = 'admin';
      await saveUsers(users);
      return res.json({ ok: true, migrated: 'Chesapeake Blue → admin' });
    }
    return res.json({ ok: true, migrated: false });
  }

  if (action === 'backfill-crabs') {
    const CRABS = [
      'Yeti','Maryland Blue','Dungeness','Florida Stone','Peekytoe',
      'Jonah','Japanese Spider','Snow','Brown','Chesapeake Blue',
      'Mud','Mangrove','Flower','Ghost','Fiddler','Red Rock',
      'Southern Kelp','Sheep','Box','Calico','Arrow','Green',
      'Velvet Belly','Halloween Moon','Soldier','Mitten','Shore',
      'Marble','Yellowline Arrow','Spider Decorator','Alaskan King',
      'Red King','Blue King','Golden King','Coconut','Hermit',
      'Porcelain','Mole','Squat Lobster','Tasmanian Giant',
      'Spiny King','Pom Pom','Horseshoe','Triops'
    ];
    const users = await getUsers();
    const fixed = [];
    for (const u of users) {
      if (u.crab) continue;
      if (CRABS.includes(u.name)) {
        u.crab = u.name;
        fixed.push(`${u.name} → ${u.crab}`);
      }
    }
    // first account was assigned CRABS[0]
    const first = users.reduce((a, b) => (a.created || 0) < (b.created || 0) ? a : b, users[0]);
    if (first && !first.crab) {
      const takenCrabs = new Set(users.filter(u => u.crab).map(u => u.crab));
      if (!takenCrabs.has(CRABS[0])) {
        first.crab = CRABS[0];
        fixed.push(`${first.name} → ${first.crab} (first account)`);
      }
    }
    if (fixed.length) await saveUsers(users);
    return res.json({ ok: true, fixed });
  }

  if (action === 'signup') {
    const inviteCode = process.env.PC_INVITE_CODE;
    if (!inviteCode) return res.json({ ok: false, error: 'Signup is disabled' });
    const { invite, email } = req.body;
    if (invite !== inviteCode) return res.json({ ok: false, error: 'Invalid invite code' });
    if (!password) return res.status(400).json({ ok: false, error: 'Password required' });
    if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'Name required' });
    if (!email || !email.trim()) return res.status(400).json({ ok: false, error: 'Email required' });
    const users = await getUsers();
    const emailLower = email.trim().toLowerCase();
    if (users.find(u => u.email && u.email.toLowerCase() === emailLower)) {
      return res.json({ ok: false, error: 'Email already in use' });
    }
    const CRABS = [
      'Yeti','Maryland Blue','Dungeness','Florida Stone','Peekytoe',
      'Jonah','Japanese Spider','Snow','Brown','Chesapeake Blue',
      'Mud','Mangrove','Flower','Ghost','Fiddler','Red Rock',
      'Southern Kelp','Sheep','Box','Calico','Arrow','Green',
      'Velvet Belly','Halloween Moon','Soldier','Mitten','Shore',
      'Marble','Yellowline Arrow','Spider Decorator','Alaskan King',
      'Red King','Blue King','Golden King','Coconut','Hermit',
      'Porcelain','Mole','Squat Lobster','Tasmanian Giant',
      'Spiny King','Pom Pom','Horseshoe','Triops'
    ];
    const takenCrabs = new Set(users.map(u => u.crab || u.name));
    const available = CRABS.filter(c => !takenCrabs.has(c) && c !== 'Pea');
    const crab = available.length
      ? available[Math.floor(Math.random() * available.length)]
      : 'Crab #' + (users.length + 1);
    const role = users.length === 0 ? 'superadmin' : 'member';
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: emailLower,
      crab,
      password: hashed,
      role,
      created: Date.now(),
    };
    users.push(user);
    await saveUsers(users);
    setSessionCookie(res, user.id);
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, email: user.email, crab: user.crab } });
  }

  if (action === 'login') {
    const { email } = req.body;
    if ((!email && !name) || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });
    const users = await getUsers();
    const loginKey = (email || name || '').trim().toLowerCase();
    // try email first, fall back to crab name for legacy accounts
    let user = users.find(u => u.email && u.email.toLowerCase() === loginKey);
    if (!user) user = users.find(u => u.name.toLowerCase() === loginKey);
    if (!user) return res.json({ ok: false, error: 'Wrong email or password' });
    const isHashed = user.password.startsWith('$2');
    const match = isHashed
      ? await bcrypt.compare(password, user.password)
      : password === user.password;
    if (!match) return res.json({ ok: false, error: 'Wrong email or password' });
    if (!isHashed) {
      user.password = await bcrypt.hash(password, SALT_ROUNDS);
      await saveUsers(users);
    }
    setSessionCookie(res, user.id);
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, email: user.email || null, crab: user.crab || null } });
  }

  if (action === 'visitor') {
    const visitorPass = process.env.PC_VISITOR_PASSWORD;
    if (!visitorPass) return res.json({ ok: false, error: 'Visitor access is disabled' });
    if (password !== visitorPass) return res.json({ ok: false, error: 'Wrong password' });
    const users = await getUsers();
    let visitor = users.find(u => u.role === 'visitor');
    if (!visitor) {
      visitor = {
        id: crypto.randomUUID(),
        name: 'Pea',
        password: await bcrypt.hash(visitorPass, SALT_ROUNDS),
        role: 'visitor',
        created: Date.now(),
      };
      users.push(visitor);
      await saveUsers(users);
    }
    setSessionCookie(res, visitor.id);
    return res.json({ ok: true, user: { id: visitor.id, name: visitor.name, role: visitor.role } });
  }

  if (action === 'update-profile') {
    const callerId = getSessionUserId(req);
    if (!callerId) return res.json({ ok: false, error: 'Not signed in' });
    const { email } = req.body;
    const users = await getUsers();
    const user = users.find(u => u.id === callerId);
    if (!user) return res.json({ ok: false, error: 'User not found' });
    if (!user.crab) {
      const CRABS = [
        'Yeti','Maryland Blue','Dungeness','Florida Stone','Peekytoe',
        'Jonah','Japanese Spider','Snow','Brown','Chesapeake Blue',
        'Mud','Mangrove','Flower','Ghost','Fiddler','Red Rock',
        'Southern Kelp','Sheep','Box','Calico','Arrow','Green',
        'Velvet Belly','Halloween Moon','Soldier','Mitten','Shore',
        'Marble','Yellowline Arrow','Spider Decorator','Alaskan King',
        'Red King','Blue King','Golden King','Coconut','Hermit',
        'Porcelain','Mole','Squat Lobster','Tasmanian Giant',
        'Spiny King','Pom Pom','Horseshoe','Triops'
      ];
      if (CRABS.includes(user.name)) user.crab = user.name;
    }
    if (name && name.trim()) user.name = name.trim();
    if (email && email.trim()) {
      const emailLower = email.trim().toLowerCase();
      const taken = users.find(u => u.id !== callerId && u.email && u.email.toLowerCase() === emailLower);
      if (taken) return res.json({ ok: false, error: 'Email already in use' });
      user.email = emailLower;
    }
    await saveUsers(users);
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, email: user.email || null, crab: user.crab || null } });
  }

  if (action === 'preview') {
    const users = await getUsers();
    const CRABS = [
      'Yeti','Maryland Blue','Dungeness','Florida Stone','Peekytoe',
      'Jonah','Japanese Spider','Snow','Brown','Chesapeake Blue',
      'Mud','Mangrove','Flower','Ghost','Fiddler','Red Rock',
      'Southern Kelp','Sheep','Box','Calico','Arrow','Green',
      'Velvet Belly','Halloween Moon','Soldier','Mitten','Shore',
      'Marble','Yellowline Arrow','Spider Decorator','Alaskan King',
      'Red King','Blue King','Golden King','Coconut','Hermit',
      'Porcelain','Mole','Squat Lobster','Tasmanian Giant',
      'Spiny King','Pom Pom','Horseshoe','Triops'
    ];
    const takenCrabs = new Set(users.map(u => u.crab || u.name));
    const available = CRABS.filter(c => !takenCrabs.has(c) && c !== 'Pea');
    const crab = available.length
      ? available[Math.floor(Math.random() * available.length)]
      : 'Crab #' + (users.length + 1);
    const role = users.length === 0 ? 'superadmin' : 'member';
    return res.json({ ok: true, crab, role });
  }

  if (action === 'list-users') {
    const callerId = getSessionUserId(req);
    const users = await getUsers();
    const caller = callerId ? users.find(u => u.id === callerId) : null;
    const isAdmin = caller && (caller.role === 'superadmin' || caller.role === 'admin');
    return res.json({ ok: true, users: users.map(u => ({ name: u.name, crab: u.crab || null, ...(isAdmin ? { role: u.role } : {}) })) });
  }

  if (action === 'set-role') {
    const { targetName, newRole } = req.body;
    const callerId = getSessionUserId(req);
    if (!targetName || !newRole || !callerId) return res.json({ ok: false, error: 'Missing fields' });
    const users = await getUsers();
    const caller = users.find(u => u.id === callerId);
    if (!caller || (caller.role !== 'superadmin' && caller.role !== 'admin')) {
      return res.json({ ok: false, error: 'Not authorized' });
    }
    const target = users.find(u => u.name === targetName);
    if (!target) return res.json({ ok: false, error: 'User not found' });
    target.role = newRole;
    await saveUsers(users);
    return res.json({ ok: true });
  }

  if (action === 'get-user') {
    const { userId } = req.body;
    if (!userId) return res.json({ ok: false });
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return res.json({ ok: false });
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, crab: user.crab || null } });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
