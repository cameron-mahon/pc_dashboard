import { get, put, uid, esc } from './store.js';
import { openModal } from './modal.js';

const LANE_KEYS = { todo: 'pipe_todo', wip: 'pipe_wip', done: 'pipe_done' };

export function initPipeline() {
  if (!document.querySelector('[data-pipeline]')) return;

  const laneEls = {
    todo: document.querySelector('[data-lane="todo"]'),
    wip: document.querySelector('[data-lane="wip"]'),
    done: document.querySelector('[data-lane="done"]'),
  };
  const countEls = {
    todo: document.querySelector('[data-count="todo"]'),
    wip: document.querySelector('[data-count="wip"]'),
    done: document.querySelector('[data-count="done"]'),
  };

  function renderLane(name) {
    const cards = get(LANE_KEYS[name], []);
    const el = laneEls[name];
    countEls[name].textContent = cards.length;

    if (!cards.length) {
      el.innerHTML = '<div class="lane-empty">Drop tasks here</div>';
    } else {
      el.innerHTML = cards.map(c =>
        `<div class="card" draggable="true" data-id="${c.id}" data-lane="${name}">
          <span class="x">×</span>
          <div class="card-title">${esc(c.title)}</div>
          ${c.detail ? `<div class="card-detail">${esc(c.detail)}</div>` : ''}
          ${c.meta ? `<div class="card-meta">${esc(c.meta)}</div>` : ''}
        </div>`
      ).join('');
    }

    el.querySelectorAll('.x').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.closest('.card').dataset.id;
        put(LANE_KEYS[name], get(LANE_KEYS[name], []).filter(c => c.id !== id));
        renderLane(name);
      });
    });

    el.querySelectorAll('.card').forEach(card => {
      card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ id: card.dataset.id, from: name }));
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });
  }

  function renderAll() { renderLane('todo'); renderLane('wip'); renderLane('done'); }
  renderAll();

  document.querySelectorAll('[data-drop]').forEach(laneWrapper => {
    const targetName = laneWrapper.dataset.drop;
    laneWrapper.addEventListener('dragover', e => {
      e.preventDefault();
      laneWrapper.classList.add('drag-over');
    });
    laneWrapper.addEventListener('dragleave', e => {
      if (!laneWrapper.contains(e.relatedTarget)) laneWrapper.classList.remove('drag-over');
    });
    laneWrapper.addEventListener('drop', e => {
      e.preventDefault();
      laneWrapper.classList.remove('drag-over');
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.from === targetName) return;
        const fromCards = get(LANE_KEYS[data.from], []);
        const idx = fromCards.findIndex(c => c.id === data.id);
        if (idx === -1) return;
        const card = fromCards.splice(idx, 1)[0];
        if (targetName === 'wip') card.meta = 'you · just started';
        else if (targetName === 'done') card.meta = 'you · completed just now';
        else card.meta = '';
        put(LANE_KEYS[data.from], fromCards);
        const toCards = get(LANE_KEYS[targetName], []);
        toCards.push(card);
        put(LANE_KEYS[targetName], toCards);
        renderAll();
      } catch {}
    });
  });

  document.querySelector('[data-pipe-add]').addEventListener('click', () => {
    openModal('New Pipeline Task', [
      { key: 'title', label: 'Title', placeholder: 'e.g. scan: object_048' },
      { key: 'detail', label: 'Execution detail', type: 'textarea', placeholder: 'Scanner, settings, printer, filament — everything needed to execute without coming back to ask.' }
    ], d => {
      if (!d.title) return false;
      const cards = get(LANE_KEYS.todo, []);
      cards.push({ id: uid(), title: d.title, detail: d.detail, meta: '' });
      put(LANE_KEYS.todo, cards);
      renderLane('todo');
    });
  });

  // ---- Issues ----
  const issueBox = document.querySelector('[data-issues]');

  function renderIssues() {
    const issues = get('pipe_issues', []);
    if (!issues.length) {
      issueBox.innerHTML = '<div class="empty">No issues reported</div>';
      return;
    }
    issueBox.innerHTML = `<div class="issue-list">${issues.map(iss => {
      let cls = 'issue';
      if (iss.severity === 'critical') cls += ' critical';
      if (iss.status === 'resolved') cls += ' resolved';
      return `<div class="${cls}" data-id="${iss.id}">
        <span class="x">×</span>
        <div class="issue-title">${esc(iss.title)}</div>
        <div class="issue-meta">
          <span>${esc(iss.reporter || '—')}</span>
          <span class="issue-badge" data-cycle="${iss.id}">${esc(iss.status)}</span>
        </div>
      </div>`;
    }).join('')}</div>`;

    issueBox.querySelectorAll('.x').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.issue').dataset.id;
        put('pipe_issues', get('pipe_issues', []).filter(i => i.id !== id));
        renderIssues();
      });
    });
    issueBox.querySelectorAll('[data-cycle]').forEach(badge => {
      badge.addEventListener('click', () => {
        const id = badge.dataset.cycle;
        const issues = get('pipe_issues', []);
        const iss = issues.find(i => i.id === id);
        if (!iss) return;
        const cycle = { open: 'investigating', investigating: 'resolved', resolved: 'open' };
        iss.status = cycle[iss.status] || 'open';
        put('pipe_issues', issues);
        renderIssues();
      });
    });
  }
  renderIssues();

  document.querySelector('[data-issue-add]').addEventListener('click', () => {
    openModal('Report Issue', [
      { key: 'title', label: 'Issue', placeholder: "What's wrong?" },
      { key: 'reporter', label: 'Reporter', placeholder: 'Who found it?' },
      { key: 'severity', label: 'Severity', type: 'select', options: ['normal', 'critical'] }
    ], d => {
      if (!d.title) return false;
      const issues = get('pipe_issues', []);
      issues.push({ id: uid(), title: d.title, reporter: d.reporter || 'anon', severity: d.severity, status: 'open' });
      put('pipe_issues', issues);
      renderIssues();
    });
  });
}
