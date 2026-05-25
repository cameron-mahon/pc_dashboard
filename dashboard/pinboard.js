import { get, put, uid, esc } from './store.js';
import { currentUser } from './auth.js';

const COLORS = ['#666','#4caf50','#42a5f5','#ab47bc','#ffca28','#ef5350','#ff9800','#26c6da','#ec407a','#8d6e63'];

function blendColor(hex, base, t) {
  const h = s => parseInt(hex.slice(s, s+2), 16);
  const b = s => parseInt(base.slice(s, s+2), 16);
  const m = (a, c) => Math.round(a + (c - a) * t).toString(16).padStart(2, '0');
  return '#' + m(b(1), h(1)) + m(b(3), h(3)) + m(b(5), h(5));
}

function escAttr(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

export function initPinboard() {
  const canvas = document.getElementById('pb-canvas');
  const world = document.getElementById('pb-world');
  const stringSvg = document.getElementById('pb-strings');
  const statusEl = document.querySelector('[data-pb-status]');
  const dropOverlay = document.querySelector('[data-pb-drop]');
  const selectBox = document.getElementById('pb-select-box');
  const toolbar = document.getElementById('pb-toolbar');
  const ownerLabel = document.querySelector('[data-pb-owner]');
  const userSelect = document.querySelector('[data-pb-user-select]');
  if (!canvas) return;

  const user = currentUser();
  const isSuperadmin = user && user.role === 'superadmin';
  let viewingUserId = user.id;
  let readOnly = false;

  function storageKey(userId) { return 'pinboard_' + userId; }

  let state = { cards: [], strings: [], view: { x: 0, y: 0, zoom: 1 } };
  let tool = 'note';
  let selectedCard = null;
  let groupSelected = new Set();
  let dragging = null;
  let groupDragging = false;
  let groupDragStart = null;
  let groupOrigPositions = {};
  let panning = false;
  let panStart = { x: 0, y: 0 };
  let connecting = null;
  let spaceHeld = false;
  let nextId = 1;
  let editing = false;
  let undoStack = [];
  let selecting = false;
  let selStart = { x: 0, y: 0 };

  // superadmin user switcher
  ownerLabel.textContent = user.name + "'s Pinboard";
  if (isSuperadmin) {
    userSelect.style.display = '';
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list-users', userId: user.id }),
    }).then(r => r.json()).then(data => {
      if (!data.ok) return;
      userSelect.innerHTML = data.users.map(u =>
        `<option value="${u.id}"${u.id === user.id ? ' selected' : ''}>${esc(u.name)}</option>`
      ).join('');
      userSelect.addEventListener('change', () => {
        viewingUserId = userSelect.value;
        readOnly = viewingUserId !== user.id;
        const selected = data.users.find(u => u.id === viewingUserId);
        ownerLabel.textContent = (selected ? selected.name : 'Unknown') + "'s Pinboard";
        toolbar.style.display = readOnly ? 'none' : '';
        load();
      });
    });
  }

  function load() {
    try {
      const raw = get(storageKey(viewingUserId), null);
      if (raw) {
        state = { cards: raw.cards || [], strings: raw.strings || [], view: raw.view || { x: 0, y: 0, zoom: 1 } };
        if (state.cards.length) nextId = Math.max(...state.cards.map(c => c.id)) + 1;
      } else {
        state = { cards: [], strings: [], view: { x: 0, y: 0, zoom: 1 } };
        nextId = 1;
      }
    } catch(e) {
      state = { cards: [], strings: [], view: { x: 0, y: 0, zoom: 1 } };
    }
    undoStack = [];
    render();
  }

  function snapshot() {
    undoStack.push(JSON.stringify({ cards: state.cards, strings: state.strings }));
    if (undoStack.length > 50) undoStack.shift();
  }

  function undo() {
    if (!undoStack.length || readOnly) return;
    const prev = JSON.parse(undoStack.pop());
    state.cards = prev.cards;
    state.strings = prev.strings;
    render();
    save(true);
  }

  function save() {
    if (readOnly) return;
    try { put(storageKey(viewingUserId), state); }
    catch(e) {
      if (e.name === 'QuotaExceededError') alert('Storage full — remove some image cards to free space.');
    }
    statusEl.textContent = state.cards.length + ' items';
  }

  function applyView() {
    const t = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.zoom})`;
    world.style.transform = t;
    stringSvg.style.transform = t;
  }

  function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (sx - rect.left - state.view.x) / state.view.zoom,
      y: (sy - rect.top - state.view.y) / state.view.zoom
    };
  }

  // card HTML
  function cardHTML(card) {
    let inner = '';
    if (card.type === 'image' && card.dataUrl) {
      inner += `<img class="pb-card-image" src="${card.dataUrl}" alt="">`;
    }
    inner += `<div class="pb-card-header"><div class="pb-card-title">${esc(card.title || '')}</div></div>`;

    if (card.type === 'file') {
      const ext = (card.fileName || '').split('.').pop().toLowerCase();
      if (ext === 'pdf' && (card.dataUrl || card.thumbnail)) {
        if (card.thumbnail) {
          inner += `<div class="pb-card-file-preview"><img src="${card.thumbnail}" style="width:100%;display:block;"></div>`;
        } else {
          inner += `<div class="pb-card-file-preview" data-pdf="${card.id}"></div>`;
        }
      } else if (card.dataUrl && ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)) {
        inner += `<img class="pb-card-image" src="${card.dataUrl}" alt="">`;
      }
      inner += `<div class="pb-card-file-info"><div class="pb-file-name">${esc(card.fileName || 'file')}</div><div class="pb-file-size">${formatSize(card.fileSize || 0)}</div></div>`;
    }

    if (card.type === 'checklist') {
      const items = card.items || [];
      inner += '<ul class="pb-checklist">';
      items.forEach((item, i) => {
        inner += `<li class="pb-check-item${item.done ? ' checked' : ''}" data-idx="${i}">
          <input type="checkbox" ${item.done ? 'checked' : ''}>
          <span class="pb-check-label">${esc(item.text || '')}</span>
          ${readOnly ? '' : '<span class="pb-check-delete">&times;</span>'}
        </li>`;
      });
      inner += '</ul>';
      if (!readOnly) inner += '<div class="pb-check-add">+ Add item</div>';
    } else if (card.type === 'link') {
      const urlDisplay = card.url
        ? `<a href="${escAttr(card.url)}" target="_blank" rel="noopener">${esc(card.url)}</a>` : '';
      inner += `<div class="pb-card-content"><div class="pb-card-url-row"><span class="pb-url-icon">🔗</span><div class="pb-card-url" data-field="url">${urlDisplay}</div></div><div class="pb-card-body">${esc(card.text || '')}</div></div>`;
    } else if (card.type !== 'checklist') {
      inner += `<div class="pb-card-content"><div class="pb-card-body">${esc(card.text || '')}</div></div>`;
    }

    if (!readOnly) inner += '<div class="pb-delete-btn">&times;</div>';
    return inner;
  }

  function rebindChecklist(card, el) {
    el.querySelectorAll('.pb-check-item input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', e => {
        e.stopPropagation();
        if (readOnly) { e.preventDefault(); return; }
        const idx = parseInt(cb.closest('.pb-check-item').dataset.idx);
        snapshot();
        card.items[idx].done = cb.checked;
        cb.closest('.pb-check-item').classList.toggle('checked', cb.checked);
        save();
      });
    });
    el.querySelectorAll('.pb-check-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.closest('.pb-check-item').dataset.idx);
        snapshot();
        card.items.splice(idx, 1);
        el.innerHTML = cardHTML(card);
        rebindChecklist(card, el);
        save();
      });
    });
    const addBtn = el.querySelector('.pb-check-add');
    if (addBtn) {
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        snapshot();
        card.items.push({ text: '', done: false });
        el.innerHTML = cardHTML(card);
        rebindChecklist(card, el);
        save();
        const labels = el.querySelectorAll('.pb-check-label');
        const last = labels[labels.length - 1];
        if (last) { last.contentEditable = 'true'; last.focus(); }
      });
    }
    el.querySelectorAll('.pb-check-label').forEach(label => {
      label.addEventListener('dblclick', e => {
        if (readOnly) return;
        e.stopPropagation();
        label.contentEditable = 'true';
        label.focus();
        editing = true;
      });
      label.addEventListener('blur', () => {
        label.contentEditable = 'false';
        const idx = parseInt(label.closest('.pb-check-item').dataset.idx);
        card.items[idx].text = label.innerText.trim();
        editing = false;
        save();
      });
      label.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); label.blur(); const ab = el.querySelector('.pb-check-add'); if (ab) ab.click(); }
        if (e.key === 'Escape') label.blur();
      });
    });
  }

  function createCardEl(card) {
    const el = document.createElement('div');
    el.className = 'pb-card';
    el.dataset.id = card.id;
    el.style.left = card.x + 'px';
    el.style.top = card.y + 'px';
    if (card.w) el.style.width = card.w + 'px';
    if (card.color && card.color !== '#666') {
      el.style.background = blendColor(card.color, '#1a1a1a', 0.15);
      el.style.borderColor = blendColor(card.color, '#333333', 0.35);
    }
    el.innerHTML = cardHTML(card);

    const title = el.querySelector('.pb-card-title');
    const body = el.querySelector('.pb-card-body');
    const urlField = el.querySelector('.pb-card-url');
    const delBtn = el.querySelector('.pb-delete-btn');
    const editables = [title, body, urlField].filter(Boolean);

    if (card.type === 'checklist') rebindChecklist(card, el);

    // drag
    el.addEventListener('mousedown', e => {
      if (e.target.closest('.pb-delete-btn') || editing || readOnly) return;
      e.stopPropagation();
      if (groupSelected.has(card.id)) {
        groupDragging = true;
        groupDragStart = { x: e.clientX, y: e.clientY };
        groupOrigPositions = {};
        groupSelected.forEach(id => {
          const c = state.cards.find(cc => cc.id === id);
          if (c) groupOrigPositions[id] = { x: c.x, y: c.y };
        });
      } else {
        if (!e.shiftKey) { groupSelected.clear(); updateGroupHighlights(); }
        selectCard(card.id);
        dragging = { id: card.id, startX: e.clientX, startY: e.clientY, origX: card.x, origY: card.y };
      }
    });

    el.addEventListener('dblclick', e => {
      if (readOnly) return;
      e.stopPropagation();
      startEdit(card, el);
    });

    function commitEdit() {
      editing = false;
      editables.forEach(f => { if (f) f.contentEditable = 'false'; });
      card.title = title ? title.innerText.trim() : '';
      if (body) card.text = body.innerText.trim();
      if (urlField) {
        const raw = urlField.innerText.trim();
        card.url = raw;
        urlField.innerHTML = raw
          ? `<a href="${escAttr(raw)}" target="_blank" rel="noopener">${esc(raw)}</a>` : '';
      }
      save();
    }

    editables.forEach(f => {
      if (!f) return;
      f.addEventListener('blur', () => {
        setTimeout(() => {
          if (!editables.some(ef => ef && ef === document.activeElement)) commitEdit();
        }, 50);
      });
      f.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { commitEdit(); return; }
        if (e.key === 'Tab') {
          e.preventDefault();
          const idx = editables.indexOf(f);
          const next = editables[(idx + 1) % editables.length];
          if (next) next.focus();
        }
      });
    });

    // drop file onto card
    if (!readOnly) {
      el.addEventListener('dragover', e => { e.preventDefault(); el.style.outline = '2px solid #5b9bd5'; });
      el.addEventListener('dragleave', () => { el.style.outline = ''; });
      el.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        el.style.outline = '';
        if (e.dataTransfer.files.length) {
          const file = e.dataTransfer.files[0];
          const reader = new FileReader();
          reader.onload = ev => {
            card.dataUrl = ev.target.result;
            card.fileName = file.name;
            card.fileSize = file.size;
            card.fileType = file.type;
            if (file.type.startsWith('image/')) card.type = 'image';
            card.thumbnail = '';
            const newEl = createCardEl(card);
            el.replaceWith(newEl);
            save();
            setTimeout(renderPdfThumbnails, 100);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // click PDF thumbnail to open
    const pdfPreview = el.querySelector('.pb-card-file-preview');
    if (pdfPreview && card.dataUrl) {
      pdfPreview.style.cursor = 'pointer';
      pdfPreview.addEventListener('click', e => {
        e.stopPropagation();
        const byteStr = atob(card.dataUrl.split(',')[1]);
        const mime = card.dataUrl.split(',')[0].match(/:(.*?);/)[1];
        const arr = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
        const blob = new Blob([arr], { type: mime });
        window.open(URL.createObjectURL(blob), '_blank');
      });
    }

    // right-click context menu
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.pb-ctx-menu').forEach(m => m.remove());
      const menu = document.createElement('div');
      menu.className = 'pb-ctx-menu';
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';

      if (!readOnly) {
        const colorRow = document.createElement('div');
        colorRow.className = 'pb-ctx-colors';
        COLORS.forEach(c => {
          const dot = document.createElement('div');
          dot.className = 'pb-ctx-dot';
          dot.style.background = c;
          dot.addEventListener('click', () => {
            card.color = c;
            if (c === '#666') { el.style.background = ''; el.style.borderColor = ''; }
            else { el.style.background = blendColor(c, '#1a1a1a', 0.15); el.style.borderColor = blendColor(c, '#333333', 0.35); }
            save();
            menu.remove();
          });
          colorRow.appendChild(dot);
        });
        menu.appendChild(colorRow);

        const connectItem = document.createElement('div');
        connectItem.className = 'pb-ctx-item';
        connectItem.textContent = 'Connect to...';
        connectItem.addEventListener('click', () => {
          menu.remove();
          connecting = { fromId: card.id };
          canvas.style.cursor = 'crosshair';
          const onClick = ev => {
            const target = ev.target.closest('.pb-card');
            if (target) {
              const toId = parseInt(target.dataset.id);
              if (toId !== card.id) {
                const exists = state.strings.some(s =>
                  (s.from === card.id && s.to === toId) || (s.from === toId && s.to === card.id));
                if (!exists) { state.strings.push({ from: card.id, to: toId }); renderStrings(); save(); }
              }
            }
            connecting = null;
            canvas.style.cursor = '';
            window.removeEventListener('click', onClick);
          };
          setTimeout(() => window.addEventListener('click', onClick), 10);
        });
        menu.appendChild(connectItem);
      }

      const connected = state.strings.filter(s => s.from === card.id || s.to === card.id);
      connected.forEach(s => {
        const otherId = s.from === card.id ? s.to : s.from;
        const other = state.cards.find(c => c.id === otherId);
        if (!other || readOnly) return;
        const item = document.createElement('div');
        item.className = 'pb-ctx-item';
        item.textContent = '✂ ' + (other.title?.slice(0, 25) || other.type);
        item.addEventListener('click', () => {
          snapshot();
          state.strings = state.strings.filter(st => st !== s);
          renderStrings();
          save();
          menu.remove();
        });
        menu.appendChild(item);
      });

      document.body.appendChild(menu);
      setTimeout(() => window.addEventListener('click', () => menu.remove(), { once: true }), 10);
    });

    if (delBtn) delBtn.addEventListener('click', e => { e.stopPropagation(); deleteCard(card.id); });

    if (urlField) {
      urlField.addEventListener('click', e => {
        if (editing && urlField.contentEditable === 'true') return;
        const a = e.target.closest('a');
        if (a) e.stopPropagation();
      });
    }

    return el;
  }

  function startEdit(card, el) {
    if (readOnly) return;
    editing = true;
    selectCard(card.id);
    const title = el.querySelector('.pb-card-title');
    const body = el.querySelector('.pb-card-body');
    const urlField = el.querySelector('.pb-card-url');
    [title, body, urlField].forEach(f => { if (f) f.contentEditable = 'true'; });
    if (urlField) urlField.textContent = card.url || '';
    if (card.type === 'checklist') { if (title) { title.contentEditable = 'true'; title.focus(); } }
    else if (card.type === 'link' && !card.url && urlField) urlField.focus();
    else if (!card.title && title) title.focus();
    else if (body) body.focus();
  }

  function render() {
    world.querySelectorAll('.pb-card').forEach(el => el.remove());
    stringSvg.querySelectorAll('line:not(.preview)').forEach(l => l.remove());
    applyView();
    state.cards.forEach(card => world.appendChild(createCardEl(card)));
    renderStrings();
    statusEl.textContent = state.cards.length + ' items';
  }

  function renderStrings() {
    stringSvg.querySelectorAll('line:not(.preview)').forEach(l => l.remove());
    state.strings.forEach(s => {
      const from = state.cards.find(c => c.id === s.from);
      const to = state.cards.find(c => c.id === s.to);
      if (!from || !to) return;
      const fromEl = world.querySelector(`[data-id="${s.from}"]`);
      const toEl = world.querySelector(`[data-id="${s.to}"]`);
      if (!fromEl || !toEl) return;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x + fromEl.offsetWidth / 2);
      line.setAttribute('y1', from.y + fromEl.offsetHeight / 2);
      line.setAttribute('x2', to.x + toEl.offsetWidth / 2);
      line.setAttribute('y2', to.y + toEl.offsetHeight / 2);
      stringSvg.appendChild(line);
    });
  }

  function selectCard(id) {
    selectedCard = id;
    world.querySelectorAll('.pb-card').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.id) === id);
    });
  }

  function updateGroupHighlights() {
    world.querySelectorAll('.pb-card').forEach(el => {
      el.classList.toggle('group-selected', groupSelected.has(parseInt(el.dataset.id)));
    });
  }

  function deleteCard(id) {
    if (readOnly) return;
    snapshot();
    state.cards = state.cards.filter(c => c.id !== id);
    state.strings = state.strings.filter(s => s.from !== id && s.to !== id);
    if (selectedCard === id) selectedCard = null;
    groupSelected.delete(id);
    render();
    save();
  }

  function addCard(type, wx, wy, extra) {
    if (readOnly) return;
    const defaults = type === 'checklist' ? { items: [{ text: '', done: false }] } : {};
    const card = { id: nextId++, type, title: '', text: '', x: wx, y: wy, color: '#666', ...defaults, ...extra };
    state.cards.push(card);
    const el = createCardEl(card);
    world.appendChild(el);
    save();
    selectCard(card.id);
    if (type === 'note' || type === 'link') startEdit(card, el);
    if (type === 'checklist') {
      const label = el.querySelector('.pb-check-label');
      if (label) { label.contentEditable = 'true'; label.focus(); editing = true; }
    }
    setTimeout(renderPdfThumbnails, 100);
    return card;
  }

  // toolbar
  toolbar.querySelectorAll('[data-pb-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      tool = btn.dataset.pbTool;
      toolbar.querySelectorAll('[data-pb-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // file inputs
  function handleFiles(files, wx, wy) {
    let offsetY = 0;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const type = file.type.startsWith('image/') ? 'image' : 'file';
        addCard(type, wx, wy + offsetY, {
          dataUrl: e.target.result,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
      };
      reader.readAsDataURL(file);
      offsetY += 240;
    });
  }

  const imgInput = toolbar.querySelector('[data-pb-img-input]');
  const fileInput = toolbar.querySelector('[data-pb-file-input]');
  imgInput.addEventListener('change', e => {
    if (!e.target.files.length) return;
    const vp = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    handleFiles(e.target.files, vp.x, vp.y);
    e.target.value = '';
  });
  fileInput.addEventListener('change', e => {
    if (!e.target.files.length) return;
    const vp = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    handleFiles(e.target.files, vp.x, vp.y);
    e.target.value = '';
  });

  // drag & drop
  let dragCounter = 0;
  canvas.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; dropOverlay.classList.add('visible'); });
  canvas.addEventListener('dragleave', () => { dragCounter--; if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('visible'); } });
  canvas.addEventListener('dragover', e => e.preventDefault());
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove('visible');
    if (readOnly) return;
    if (e.dataTransfer.files.length) {
      const wp = screenToWorld(e.clientX, e.clientY);
      handleFiles(e.dataTransfer.files, wp.x, wp.y);
      return;
    }
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const wp = screenToWorld(e.clientX, e.clientY);
      addCard('link', wp.x, wp.y, { url, title: '' });
    }
  });

  // paste URL
  document.addEventListener('paste', e => {
    if (editing || readOnly) return;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
      const vp = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      addCard('link', vp.x, vp.y, { url: text, title: '' });
      e.preventDefault();
    }
  });

  // canvas double-click
  canvas.addEventListener('dblclick', e => {
    if (e.target.closest('.pb-card') || editing || readOnly) return;
    const wp = screenToWorld(e.clientX, e.clientY);
    addCard(tool || 'note', wp.x, wp.y);
  });

  // canvas mousedown — pan or select
  canvas.addEventListener('mousedown', e => {
    if (e.target.closest('.pb-card') || editing) return;
    if (e.button === 0 && e.shiftKey && !readOnly) {
      selecting = true;
      selStart = { x: e.clientX, y: e.clientY };
      selectBox.style.left = e.clientX + 'px';
      selectBox.style.top = e.clientY + 'px';
      selectBox.style.width = '0';
      selectBox.style.height = '0';
      selectBox.style.display = 'block';
      e.preventDefault();
      return;
    }
    if (e.button === 0 || e.button === 1 || spaceHeld) {
      selectCard(null);
      groupSelected.clear();
      updateGroupHighlights();
      panning = true;
      panStart = { x: e.clientX - state.view.x, y: e.clientY - state.view.y };
      canvas.classList.add('panning');
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', e => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / state.view.zoom;
      const dy = (e.clientY - dragging.startY) / state.view.zoom;
      const card = state.cards.find(c => c.id === dragging.id);
      if (card) {
        card.x = dragging.origX + dx;
        card.y = dragging.origY + dy;
        const el = world.querySelector(`[data-id="${card.id}"]`);
        if (el) { el.style.left = card.x + 'px'; el.style.top = card.y + 'px'; }
        renderStrings();
      }
    }
    if (groupDragging && groupDragStart) {
      const dx = (e.clientX - groupDragStart.x) / state.view.zoom;
      const dy = (e.clientY - groupDragStart.y) / state.view.zoom;
      groupSelected.forEach(id => {
        const card = state.cards.find(c => c.id === id);
        const orig = groupOrigPositions[id];
        if (card && orig) {
          card.x = orig.x + dx;
          card.y = orig.y + dy;
          const el = world.querySelector(`[data-id="${id}"]`);
          if (el) { el.style.left = card.x + 'px'; el.style.top = card.y + 'px'; }
        }
      });
      renderStrings();
    }
    if (selecting) {
      const x = Math.min(e.clientX, selStart.x);
      const y = Math.min(e.clientY, selStart.y);
      selectBox.style.left = x + 'px';
      selectBox.style.top = y + 'px';
      selectBox.style.width = Math.abs(e.clientX - selStart.x) + 'px';
      selectBox.style.height = Math.abs(e.clientY - selStart.y) + 'px';
    }
    if (panning) {
      state.view.x = e.clientX - panStart.x;
      state.view.y = e.clientY - panStart.y;
      applyView();
    }
  });

  window.addEventListener('mouseup', () => {
    if (dragging) { save(); dragging = null; }
    if (groupDragging) { groupDragging = false; groupDragStart = null; save(); }
    if (selecting) {
      selecting = false;
      selectBox.style.display = 'none';
      const boxRect = {
        left: parseInt(selectBox.style.left), top: parseInt(selectBox.style.top),
        right: parseInt(selectBox.style.left) + parseInt(selectBox.style.width),
        bottom: parseInt(selectBox.style.top) + parseInt(selectBox.style.height)
      };
      groupSelected.clear();
      state.cards.forEach(card => {
        const el = world.querySelector(`[data-id="${card.id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.left < boxRect.right && rect.right > boxRect.left && rect.top < boxRect.bottom && rect.bottom > boxRect.top) {
          groupSelected.add(card.id);
        }
      });
      updateGroupHighlights();
    }
    if (panning) { panning = false; canvas.classList.remove('panning'); save(); }
    if (connecting) { connecting = null; canvas.style.cursor = ''; }
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.min(3, Math.max(0.1, state.view.zoom * delta));
    const rect = canvas.getBoundingClientRect();
    const wx = (e.clientX - rect.left - state.view.x) / state.view.zoom;
    const wy = (e.clientY - rect.top - state.view.y) / state.view.zoom;
    state.view.zoom = newZoom;
    state.view.x = e.clientX - rect.left - wx * newZoom;
    state.view.y = e.clientY - rect.top - wy * newZoom;
    applyView();
    save();
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !editing) { e.preventDefault(); undo(); return; }
    if (editing) return;
    if (e.code === 'Space') { spaceHeld = true; canvas.style.cursor = 'grab'; e.preventDefault(); }
    if ((e.key === 'Backspace' || e.key === 'Delete') && !readOnly) {
      if (groupSelected.size > 0) {
        snapshot();
        groupSelected.forEach(id => {
          state.cards = state.cards.filter(c => c.id !== id);
          state.strings = state.strings.filter(s => s.from !== id && s.to !== id);
        });
        groupSelected.clear();
        render();
        save();
      } else if (selectedCard) {
        deleteCard(selectedCard);
      }
    }
    if (e.key === 'Escape') { selectCard(null); groupSelected.clear(); updateGroupHighlights(); }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'Space') { spaceHeld = false; canvas.style.cursor = ''; }
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // PDF thumbnails
  function renderPdfThumbnails() {
    if (typeof pdfjsLib === 'undefined') return;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    document.querySelectorAll('[data-pdf]').forEach(container => {
      if (container.querySelector('canvas')) return;
      const cardId = parseInt(container.dataset.pdf);
      const card = state.cards.find(c => c.id === cardId);
      if (!card || !card.dataUrl) return;
      pdfjsLib.getDocument(card.dataUrl).promise.then(pdf => {
        pdf.getPage(1).then(page => {
          const scale = 300 / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale });
          const cvs = document.createElement('canvas');
          cvs.width = viewport.width;
          cvs.height = viewport.height;
          page.render({ canvasContext: cvs.getContext('2d'), viewport }).promise.then(() => {
            container.appendChild(cvs);
            card.thumbnail = cvs.toDataURL('image/jpeg', 0.8);
            save();
          });
        });
      }).catch(() => {});
    });
  }

  load();
  setTimeout(renderPdfThumbnails, 200);
}
