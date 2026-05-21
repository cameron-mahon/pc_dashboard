const { put, list, get: getBlob } = require('@vercel/blob');

const BLOB_KEY = 'pc-dashboard-users.json';

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

  if (action === 'signup') {
    if (!password) return res.status(400).json({ ok: false, error: 'Password required' });
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
    let crabName;
    let role;
    if (users.length === 0) {
      crabName = CRABS[0];
      role = 'superadmin';
    } else {
      const taken = new Set(users.map(u => u.name));
      const available = CRABS.filter(c => !taken.has(c) && c !== 'Pea');
      crabName = available.length
        ? available[Math.floor(Math.random() * available.length)]
        : 'Crab #' + (users.length + 1);
      role = 'member';
    }
    const user = {
      id: crypto.randomUUID(),
      name: crabName,
      password,
      role,
      created: Date.now(),
    };
    users.push(user);
    await saveUsers(users);
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  }

  if (action === 'login') {
    if (!name || !password) return res.status(400).json({ ok: false, error: 'Name and password required' });
    const users = await getUsers();
    const user = users.find(u =>
      u.name.toLowerCase() === name.toLowerCase() && u.password === password
    );
    if (!user) return res.json({ ok: false, error: 'Wrong name or password' });
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  }

  if (action === 'visitor') {
    if (password !== 'p455word1') return res.json({ ok: false, error: 'Wrong password' });
    const users = await getUsers();
    let visitor = users.find(u => u.role === 'visitor');
    if (!visitor) {
      visitor = {
        id: crypto.randomUUID(),
        name: 'Pea',
        password: 'p455word1',
        role: 'visitor',
        created: Date.now(),
      };
      users.push(visitor);
      await saveUsers(users);
    }
    return res.json({ ok: true, user: { id: visitor.id, name: visitor.name, role: visitor.role } });
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
    let crabName;
    let role;
    if (users.length === 0) {
      crabName = CRABS[0];
      role = 'superadmin';
    } else {
      const taken = new Set(users.map(u => u.name));
      const available = CRABS.filter(c => !taken.has(c) && c !== 'Pea');
      crabName = available.length
        ? available[Math.floor(Math.random() * available.length)]
        : 'Crab #' + (users.length + 1);
      role = 'member';
    }
    return res.json({ ok: true, name: crabName, role });
  }

  if (action === 'list-users') {
    const { userId } = req.body;
    const users = await getUsers();
    const caller = userId ? users.find(u => u.id === userId) : null;
    const isAdmin = caller && (caller.role === 'superadmin' || caller.role === 'admin');
    return res.json({ ok: true, users: users.map(u => ({ name: u.name, ...(isAdmin ? { role: u.role } : {}) })) });
  }

  if (action === 'set-role') {
    const { targetName, newRole, userId } = req.body;
    if (!targetName || !newRole || !userId) return res.json({ ok: false, error: 'Missing fields' });
    const users = await getUsers();
    const caller = users.find(u => u.id === userId);
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
    return res.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
