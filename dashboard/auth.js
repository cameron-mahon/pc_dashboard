const API = '/api/auth';

let _user = null;

export function currentUser() { return _user; }

export function isVisitor(user) {
  return user && user.role === 'visitor';
}

export async function requireAuth() {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'me' }),
    });
    const data = await res.json();
    if (data.ok) { _user = data.user; return true; }
  } catch {}
  window.location.href = 'login.html';
  return false;
}

export async function signup(password, invite) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signup', password, invite }),
  });
  const data = await res.json();
  if (data.ok) _user = data.user;
  return data;
}

export async function signupVisitor(password) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'visitor', password }),
  });
  const data = await res.json();
  if (data.ok) _user = data.user;
  return data;
}

export async function login(name, password) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', name, password }),
  });
  const data = await res.json();
  if (data.ok) _user = data.user;
  return data;
}

export async function logout() {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  });
  _user = null;
  window.location.href = 'login.html';
}
