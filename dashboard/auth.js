import { get, put } from './store.js';

const CRABS = [
  'Yeti',
  'Maryland Blue','Dungeness','Florida Stone','Peekytoe',
  'Jonah','Japanese Spider','Snow','Brown',
  'Chesapeake Blue','Mud','Mangrove','Flower',
  'Ghost','Fiddler','Red Rock','Southern Kelp',
  'Sheep','Box','Calico','Arrow',
  'Green','Velvet Belly','Halloween Moon','Pea',
  'Soldier','Mitten','Shore','Marble',
  'Yellowline Arrow','Spider Decorator',
  'Alaskan King','Red King','Blue King','Golden King',
  'Coconut','Hermit','Porcelain','Mole',
  'Squat Lobster','Tasmanian Giant','Spiny King',
  'Pom Pom','Horseshoe','Triops'
];

export function getUsers() { return get('users', []); }
function saveUsers(u) { put('users', u); }

export function getSession() { return get('session', null); }
function saveSession(s) { put('session', s); }

export function currentUser() {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.id === s.userId) || null;
}

export function assignCrabName() {
  const users = getUsers();
  if (users.length === 0) return CRABS[0];
  const taken = new Set(users.map(u => u.name));
  const available = CRABS.filter(c => !taken.has(c) && c !== 'Pea');
  if (!available.length) return 'Crab #' + (users.length + 1);
  return available[Math.floor(Math.random() * available.length)];
}

export function isVisitor(user) {
  return user && user.role === 'visitor';
}

export function signupVisitor() {
  const users = getUsers();
  const existing = users.find(u => u.role === 'visitor');
  if (existing) {
    saveSession({ userId: existing.id });
    return { ok: true, user: existing };
  }
  const user = {
    id: crypto.randomUUID(),
    name: 'Pea',
    password: '',
    role: 'visitor',
    created: Date.now()
  };
  users.push(user);
  saveUsers(users);
  saveSession({ userId: user.id });
  return { ok: true, user };
}

export function signup(password) {
  const users = getUsers();
  const name = assignCrabName();
  const role = users.length === 0 ? 'superadmin' : 'member';
  const user = {
    id: crypto.randomUUID(),
    name,
    password,
    role,
    created: Date.now()
  };
  users.push(user);
  saveUsers(users);
  saveSession({ userId: user.id });
  return { ok: true, user };
}

export function login(name, password) {
  const user = getUsers().find(u =>
    u.name.toLowerCase() === name.toLowerCase() && u.password === password
  );
  if (!user) return { ok: false, error: 'Wrong name or password' };
  saveSession({ userId: user.id });
  return { ok: true, user };
}

export function logout() {
  put('session', null);
  window.location.href = 'login.html';
}

export function requireAuth() {
  if (!currentUser()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}
