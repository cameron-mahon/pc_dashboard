import { esc } from './store.js';

export function openModal(title, fields, onSave) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';

  let fieldsHTML = fields.map(f => {
    let input;
    if (f.type === 'textarea') {
      input = `<textarea data-f="${f.key}" placeholder="${esc(f.placeholder || '')}"></textarea>`;
    } else if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
      input = `<select data-f="${f.key}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px;">${opts}</select>`;
    } else if (f.type === 'file') {
      input = `<input type="file" data-f="${f.key}" ${f.accept ? `accept="${esc(f.accept)}"` : ''} ${f.multiple ? 'multiple' : ''}>`;
    } else if (f.type === 'password') {
      input = `<input type="password" data-f="${f.key}" placeholder="${esc(f.placeholder || '')}">`;
    } else if (f.type === 'info') {
      return `<div class="modal-field"><div style="font-size:13px;color:var(--text-2);padding:8px 0;">${esc(f.label)}</div></div>`;
    } else {
      input = `<input data-f="${f.key}" placeholder="${esc(f.placeholder || '')}">`;
    }
    return `<div class="modal-field"><label>${esc(f.label)}</label>${input}</div>`;
  }).join('');

  bg.innerHTML = `
    <div class="modal-box">
      <h3>${esc(title)}</h3>
      ${fieldsHTML}
      <div class="modal-actions">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn-primary" data-act="save">Add</button>
      </div>
    </div>`;

  document.body.appendChild(bg);

  const first = bg.querySelector('input, textarea');
  if (first) requestAnimationFrame(() => first.focus());

  function close() { bg.remove(); }

  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bg.querySelector('[data-act="cancel"]').addEventListener('click', close);
  bg.querySelector('[data-act="save"]').addEventListener('click', () => {
    const data = {};
    bg.querySelectorAll('[data-f]').forEach(el => {
      if (el.type === 'file') data[el.dataset.f] = el.files;
      else data[el.dataset.f] = el.value.trim();
    });
    if (onSave(data) !== false) close();
  });
  bg.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      bg.querySelector('[data-act="save"]').click();
    }
  });
}
