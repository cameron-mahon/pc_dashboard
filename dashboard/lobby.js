import { get, put, uid, esc } from './store.js';
import { openModal } from './modal.js';
import { currentUser, isVisitor } from './auth.js';

let userNames = [];
async function loadUsers() {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list-users', userId: currentUser()?.id }),
    });
    const data = await res.json();
    if (data.ok) userNames = data.users.map(u => u.name);
  } catch {}
}

export function initLobby() {
  if (!document.querySelector('[data-lobby]')) return;
  const user = currentUser();
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');
  const viewOnly = isVisitor(user);

  // ---- Note of the day ----
  const noteBox = document.querySelector('[data-note-box]');
  function renderNote() {
    const n = get('note', '');
    noteBox.innerHTML = n
      ? `<div class="note-text">${esc(n)}</div><div class="note-edit">edit note</div>`
      : `<div class="note-text is-empty">No note posted</div><div class="note-edit">post a note</div>`;
    if (viewOnly) { const edit = noteBox.querySelector('.note-edit'); if (edit) edit.style.display = 'none'; }
    noteBox.querySelector('.note-edit')?.addEventListener('click', () => {
      if (viewOnly) return;
      openModal('Note of the Day', [
        { key: 'text', label: 'Note', type: 'textarea', placeholder: 'What should everyone know today?' }
      ], d => {
        if (!d.text) return false;
        put('note', d.text);
        renderNote();
      });
    });
  }
  renderNote();

  // ---- Tasks ----
  const TASK_KEY = 'tasks';
  const myContainer = document.querySelector('[data-my-tasks]');
  const genContainer = document.querySelector('[data-gen-tasks]');
  const myAdd = document.querySelector('[data-my-add]');
  const genAdd = document.querySelector('[data-gen-add]');

  function renderTasks() {
    const tasks = get(TASK_KEY, []);
    const me = user ? user.name : null;
    const mine = tasks.filter(t => t.assignee === me);
    const unclaimed = tasks.filter(t => !t.assignee);

    function renderList(items, container) {
      if (!items.length) {
        container.innerHTML = '<div class="empty">Nothing here yet</div>';
        return;
      }
      container.innerHTML = `<div class="task-list">${items.map(t =>
        `<div class="task-item" data-id="${t.id}">
          <span class="task-text">${esc(t.text)}</span>
          ${t.assignee ? `<span class="area">${esc(t.assignee)}</span>` : ''}
          ${t.area ? `<span class="area">${esc(t.area)}</span>` : ''}
          ${isAdmin ? '<span class="x">×</span>' : ''}
        </div>`
      ).join('')}</div>`;
      container.querySelectorAll('.x').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const id = btn.closest('.task-item').dataset.id;
          put(TASK_KEY, get(TASK_KEY, []).filter(t => t.id !== id));
          renderTasks();
        });
      });
    }

    renderList(mine, myContainer);
    renderList(unclaimed, genContainer);
  }

  loadUsers().then(() => {
    renderTasks();

    if (!isAdmin) { myAdd.style.display = 'none'; genAdd.style.display = 'none'; return; }

    function addTask(defaultAssignee) {
      const assigneeOptions = ['(none)', ...userNames];
      openModal('Add Task', [
        { key: 'text', label: 'Task', placeholder: 'What needs doing?' },
        { key: 'area', label: 'Area', placeholder: 'pipeline, marketing, backend, frontend...' },
        { key: 'assignee', label: 'Assign to', type: 'select', options: assigneeOptions }
      ], d => {
        if (!d.text) return false;
        const tasks = get(TASK_KEY, []);
        tasks.push({ id: uid(), text: d.text, area: d.area, assignee: d.assignee === '(none)' ? '' : d.assignee });
        put(TASK_KEY, tasks);
        renderTasks();
      });
    }

    myAdd.addEventListener('click', () => addTask(user?.name || ''));
    genAdd.addEventListener('click', () => addTask(''));
  });

  // ---- Gantt ----
  const ganttBox = document.querySelector('[data-gantt]');
  const ganttAdd = document.querySelector('[data-gantt-add]');
  function renderGantt() {
    const items = get('gantt', []);
    if (!items.length) {
      ganttBox.innerHTML = '<div class="empty">No timeline items yet</div>';
      return;
    }
    ganttBox.innerHTML = `<div class="gantt-rows">${items.map((g, i) =>
      `<div class="gantt-row" data-id="${g.id}">
        <div class="gantt-label">${esc(g.label)}</div>
        <div class="gantt-track"><div class="gantt-bar c${i % 4}" style="left:${g.start}%;width:${g.width}%"></div></div>
        ${isAdmin ? '<span class="x">×</span>' : ''}
      </div>`
    ).join('')}</div>`;
    if (isAdmin) {
      ganttBox.querySelectorAll('.x').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.closest('.gantt-row').dataset.id;
          put('gantt', get('gantt', []).filter(g => g.id !== id));
          renderGantt();
        });
      });
    }
  }
  renderGantt();
  if (!isAdmin) { ganttAdd.style.display = 'none'; }
  ganttAdd.addEventListener('click', () => {
    openModal('Add Timeline Item', [
      { key: 'label', label: 'Label', placeholder: 'e.g. pipeline batch 3' },
      { key: 'start', label: 'Start position (0–100%)', placeholder: '0' },
      { key: 'width', label: 'Width (0–100%)', placeholder: '25' }
    ], d => {
      if (!d.label) return false;
      const items = get('gantt', []);
      items.push({ id: uid(), label: d.label, start: parseInt(d.start) || 0, width: parseInt(d.width) || 25 });
      put('gantt', items);
      renderGantt();
    });
  });

  // ---- Lobby surface (files) ----
  // ---- Rooms ----
  const roomLinks = document.querySelector('[data-room-links]');
  const roomAdd = document.querySelector('[data-room-add]');

  function renderRooms() {
    const builtIn = [
      { name: 'Pipeline', href: 'pipeline.html' },
      { name: 'Marketing', href: 'marketing.html' },
    ];
    const custom = get('rooms', []);

    const builtInHTML = builtIn.map(r =>
      `<a href="${r.href}" class="room-link">${esc(r.name)}</a>`
    ).join('');

    const customHTML = custom.map(r =>
      `<a href="room.html?id=${encodeURIComponent(r.id)}" class="room-link">
        ${esc(r.name)}
        ${isAdmin ? '<span class="x">×</span>' : ''}
      </a>`
    ).join('');

    roomLinks.innerHTML = '<div class="room-links">' + builtInHTML + customHTML + '</div>';
    if (!isAdmin) return;
    roomLinks.querySelectorAll('.x').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const link = btn.closest('.room-link');
        const href = link.getAttribute('href');
        const id = new URLSearchParams(href.split('?')[1]).get('id');
        put('rooms', get('rooms', []).filter(r => r.id !== id));
        renderRooms();
      });
    });
  }
  renderRooms();

  if (!isAdmin) { roomAdd.style.display = 'none'; return; }
  roomAdd.addEventListener('click', () => {
    openModal('New Room', [
      { key: 'name', label: 'Room name', placeholder: 'e.g. pipeline, marketing, backend...' }
    ], d => {
      if (!d.name) return false;
      const rooms = get('rooms', []);
      rooms.push({ id: uid(), name: d.name });
      put('rooms', rooms);
      renderRooms();
    });
  });
}
