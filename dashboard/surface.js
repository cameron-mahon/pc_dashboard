import { get, put, uid, esc } from './store.js';
import { openModal } from './modal.js';
import { currentUser, isVisitor } from './auth.js';

export function initSurface(roomId, surfaceEl, addBtn) {
  if (!surfaceEl) surfaceEl = document.querySelector(`[data-room-surface="${roomId}"]`);
  if (!addBtn) addBtn = document.querySelector(`[data-room-file-add="${roomId}"]`);
  if (!surfaceEl) return;

  const key = 'room_files_' + roomId;

  function getFiles() { return get(key, []); }
  function saveFiles(f) { put(key, f); }

  function render() {
    surfaceEl.innerHTML = '';
    const files = getFiles();
    files.forEach(f => surfaceEl.appendChild(makeTile(f)));
  }

  function makeTile(file) {
    const el = document.createElement('div');
    el.className = 'file-tile';
    el.dataset.fileId = file.id;
    el.style.left = (file.x || 0) + 'px';
    el.style.top = (file.y || 0) + 'px';
    const vo = isVisitor(currentUser());
    el.innerHTML = vo
      ? `<span class="file-name">${esc(file.name)}</span>`
      : `<span class="x">×</span><span class="file-name">${esc(file.name)}</span>`;

    if (!vo) el.querySelector('.x').addEventListener('click', e => {
      e.stopPropagation();
      saveFiles(getFiles().filter(f => f.id !== file.id));
      el.remove();
    });

    let drag = null;
    if (vo) return el;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.x')) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sr = surfaceEl.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, ox: rect.left - sr.left, oy: rect.top - sr.top };
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const sr = surfaceEl.getBoundingClientRect();
      el.style.left = Math.max(0, Math.min(sr.width - el.offsetWidth, drag.ox + (e.clientX - drag.sx))) + 'px';
      el.style.top = Math.max(0, Math.min(sr.height - el.offsetHeight, drag.oy + (e.clientY - drag.sy))) + 'px';
    });
    el.addEventListener('pointerup', e => {
      if (!drag) return;
      el.releasePointerCapture(e.pointerId);
      el.classList.remove('dragging');
      const files = getFiles();
      const f = files.find(f => f.id === file.id);
      if (f) {
        f.x = parseInt(el.style.left);
        f.y = parseInt(el.style.top);
        saveFiles(files);
      }
      drag = null;
    });

    return el;
  }

  render();

  if (addBtn && isVisitor(currentUser())) addBtn.style.display = 'none';
  if (addBtn && !isVisitor(currentUser())) {
    addBtn.addEventListener('click', () => {
      openModal('Add', [
        { key: 'name', label: 'Name', placeholder: 'File, document, link, note...' }
      ], d => {
        if (!d.name) return false;
        const files = getFiles();
        const count = files.length;
        files.push({
          id: uid(), name: d.name,
          x: 12 + (count % 6) * 100,
          y: 12 + Math.floor(count / 6) * 100
        });
        saveFiles(files);
        render();
      });
    });
  }
}
