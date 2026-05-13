import { get, put, uid, esc } from './store.js';
import { currentUser } from './auth.js';

export function initRecs() {
  const bubble = document.querySelector('[data-open-recs]');
  const panel = document.querySelector('[data-recs-panel]');
  if (!bubble || !panel) return;

  const user = currentUser();
  if (!user) return;

  const isAdmin = user.role === 'admin' || user.role === 'superadmin';

  bubble.classList.add('visible');

  const list = panel.querySelector('[data-recs-list]');
  const input = panel.querySelector('[data-recs-send]');

  const page = location.pathname.split('/').pop() || 'index.html';
  const KEY = 'recs_' + page.replace('.html', '');

  function getRecs() { return get(KEY, []); }
  function saveRecs(r) { put(KEY, r); }

  function render() {
    if (!isAdmin) {
      list.innerHTML = '<div class="recs-empty">Your suggestions are visible only to admins</div>';
      return;
    }
    const recs = getRecs();
    if (!recs.length) {
      list.innerHTML = '<div class="recs-empty">No suggestions yet</div>';
      return;
    }
    list.innerHTML = recs.map(r =>
      `<div class="rec-item" data-rec-id="${r.id}">
        <span class="x" data-rec-remove="${r.id}">&times;</span>
        <div class="who">${esc(r.who)}</div>
        <div>${esc(r.text)}</div>
      </div>`
    ).join('');

    list.querySelectorAll('[data-rec-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        saveRecs(getRecs().filter(r => r.id !== btn.dataset.recRemove));
        render();
      });
    });
  }

  // position panel above bubble
  function positionPanel() {
    const br = bubble.getBoundingClientRect();
    panel.style.bottom = (window.innerHeight - br.top + 8) + 'px';
    panel.style.right = (window.innerWidth - br.right) + 'px';
  }

  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      positionPanel();
      render();
      input.focus();
    }
  });

  panel.querySelector('[data-close-recs]').addEventListener('click', () => {
    panel.classList.remove('open');
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      const recs = getRecs();
      recs.push({ id: uid(), who: user.name, text: input.value.trim() });
      saveRecs(recs);
      input.value = '';
      render();
    }
  });

  render();
}
