import { get, put, uid, esc } from './store.js';
import { openModal } from './modal.js';
import { currentUser } from './auth.js';

export function initSidebar() {
  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;
  const user = currentUser();
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function render() {
    const page = currentPage();
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('id');
    const rooms = get('rooms', []);

    const builtIn = [
      { name: 'Lobby', href: 'index.html' },
      { name: 'Pipeline', href: 'pipeline.html' },
      { name: 'Marketing', href: 'marketing.html' },
    ];

    const builtInHTML = builtIn.map(r => {
      const active = page === r.href ? ' active' : '';
      return `<a href="${r.href}" class="${active}">${esc(r.name)}</a>`;
    }).join('');

    const customHTML = rooms.map(r => {
      const href = `room.html?id=${encodeURIComponent(r.id)}`;
      const active = page === 'room.html' && roomId === r.id ? ' active' : '';
      return `<a href="${href}" class="sidebar-room${active}">
        ${esc(r.name)}
        ${isAdmin ? `<span class="sidebar-room-x" data-remove="${r.id}">&times;</span>` : ''}
      </a>`;
    }).join('');

    const divider = rooms.length ? '<div class="sidebar-divider"></div>' : '';

    nav.innerHTML = builtInHTML + divider + customHTML +
      (isAdmin ? `<button class="sidebar-add" data-add-room><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>New Room</button>` : '');

    nav.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.remove;
        put('rooms', get('rooms', []).filter(r => r.id !== id));
        render();
      });
    });

    const addBtn = nav.querySelector('[data-add-room]');
    if (addBtn) addBtn.addEventListener('click', () => {
      openModal('New Room', [
        { key: 'name', label: 'Room name', placeholder: 'e.g. backend, design, ops...' }
      ], d => {
        if (!d.name) return false;
        const rooms = get('rooms', []);
        rooms.push({ id: uid(), name: d.name });
        put('rooms', rooms);
        render();
      });
    });
  }

  render();
}
