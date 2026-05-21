import { get, put } from './store.js';

const API = '/api/auth';

export function getSession() { return get('session', null); }
function saveSession(s) { put('session', s); }

export function currentUser() {
  const s = getSession();
  if (!s) return null;
  return s.user || null;
}

export function isVisitor(user) {
  return user && user.role === 'visitor';
}

export async function signupVisitor(password) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'visitor', password }),
  });
  const data = await res.json();
  if (data.ok) saveSession({ userId: data.user.id, user: data.user });
  return data;
}

export async function signup(password) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signup', password }),
  });
  const data = await res.json();
  if (data.ok) saveSession({ userId: data.user.id, user: data.user });
  return data;
}

export async function login(name, password) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', name, password }),
  });
  const data = await res.json();
  if (data.ok) saveSession({ userId: data.user.id, user: data.user });
  return data;
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

export function assignCrabName() {
  return 'Crab';
}

export function getUsers() { return get('users', []); }
