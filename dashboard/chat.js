import { get, put, esc } from './store.js';
import { currentUser, isVisitor } from './auth.js';
import { getCrabPhoto } from './userbar.js';
import 'emoji-picker-element';

const KEY = 'chat';
const GIPHY_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';

function whoAmI() {
  const u = currentUser();
  return u ? u.name : 'anon';
}

function load() { return get(KEY, []); }

let cachedUsers = null;
async function fetchUsers() {
  if (cachedUsers) return cachedUsers;
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list-users', userId: currentUser()?.id }),
    });
    const data = await res.json();
    if (data.ok) cachedUsers = data.users;
  } catch {}
  return cachedUsers || [];
}

function renderText(text) {
  return esc(text).replace(/@(\w[\w\s]*?\w|\w)/g, (match) => {
    return `<span class="chat-mention">${match}</span>`;
  });
}

function avatarHTML(name) {
  const src = getCrabPhoto(name);
  if (src) return `<img src="${esc(src)}" alt="${esc(name)}">`;
  const ini = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return `<span class="msg-avatar-fallback">${ini}</span>`;
}

function msgHTML(m, prev) {
  const me = whoAmI();
  const isMe = m.who === me;
  const grouped = prev && prev.who === m.who;
  const content = m.img
    ? `<img src="${esc(m.img)}" alt="">`
    : renderText(m.text);
  if (isMe) {
    return `<div class="chat-msg you${grouped ? ' grouped' : ''}">
      <div class="msg-body">
        <div class="msg-bubble">${content}</div>
      </div>
    </div>`;
  }
  return `<div class="chat-msg${grouped ? ' grouped' : ''}">
    <div class="msg-avatar">${grouped ? '' : avatarHTML(m.who)}</div>
    <div class="msg-body">
      ${grouped ? '' : `<div class="msg-name">${esc(m.who)}</div>`}
      <div class="msg-bubble">${content}</div>
    </div>
  </div>`;
}

function renderMsgs(msgs) {
  if (!msgs.length) return '<div class="chat-empty">No messages yet</div>';
  return msgs.map((m, i) => msgHTML(m, i > 0 ? msgs[i - 1] : null)).join('');
}

function bindInput(input) {
  if (!input) return;
  let mentionDropdown = null;

  function closeMention() {
    if (mentionDropdown) { mentionDropdown.remove(); mentionDropdown = null; }
  }

  input.addEventListener('keydown', e => {
    if (mentionDropdown) {
      const items = mentionDropdown.querySelectorAll('.mention-item');
      const active = mentionDropdown.querySelector('.mention-item.active');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const arr = [...items];
        let idx = arr.indexOf(active);
        if (e.key === 'ArrowDown') idx = (idx + 1) % arr.length;
        else idx = (idx - 1 + arr.length) % arr.length;
        arr.forEach(el => el.classList.remove('active'));
        arr[idx].classList.add('active');
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && active) {
        e.preventDefault();
        const name = active.dataset.name;
        const val = input.value;
        const atIdx = val.lastIndexOf('@');
        input.value = val.slice(0, atIdx) + '@' + name + ' ';
        closeMention();
        return;
      }
      if (e.key === 'Escape') { closeMention(); return; }
    }
    if (e.key === 'Enter' && input.value.trim()) {
      push({ who: whoAmI(), text: input.value.trim() });
      input.value = '';
      closeMention();
    }
  });

  input.addEventListener('input', async () => {
    const val = input.value;
    const atIdx = val.lastIndexOf('@');
    if (atIdx === -1 || (atIdx > 0 && val[atIdx - 1] !== ' ')) {
      closeMention();
      return;
    }
    const query = val.slice(atIdx + 1).toLowerCase();
    if (query.includes(' ') && query.length > 20) { closeMention(); return; }
    const users = await fetchUsers();
    const matches = users.filter(u => u.name.toLowerCase().startsWith(query));
    if (!matches.length) { closeMention(); return; }

    closeMention();
    mentionDropdown = document.createElement('div');
    mentionDropdown.className = 'mention-dropdown';
    matches.slice(0, 6).forEach((u, i) => {
      const item = document.createElement('div');
      item.className = 'mention-item' + (i === 0 ? ' active' : '');
      item.dataset.name = u.name;
      item.innerHTML = `<span class="mention-name">${esc(u.name)}</span>${u.role ? `<span class="mention-role">${esc(u.role)}</span>` : ''}`;
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const v = input.value;
        const ai = v.lastIndexOf('@');
        input.value = v.slice(0, ai) + '@' + u.name + ' ';
        closeMention();
        input.focus();
      });
      mentionDropdown.appendChild(item);
    });
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(mentionDropdown);
  });

  input.addEventListener('blur', () => setTimeout(closeMention, 150));
}

function push(msg) {
  const msgs = load();
  msgs.push(msg);
  put(KEY, msgs);
  window.dispatchEvent(new CustomEvent('pc-chat'));
}

function bindToolbar(panel) {
  const toolbar = panel.querySelector('.chat-compose-tools');
  if (!toolbar) return;
  const input = panel.querySelector('input[data-act="send"]');
  const sendBtn = panel.querySelector('[data-send-btn]');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      if (input && input.value.trim()) {
        push({ who: whoAmI(), text: input.value.trim() });
        input.value = '';
      }
    });
  }

  // Emoji picker
  const emojiBtn = toolbar.querySelector('[data-chat-emoji]');
  let emojiPicker = null;
  emojiBtn.addEventListener('click', () => {
    if (emojiPicker) { emojiPicker.remove(); emojiPicker = null; return; }
    emojiPicker = document.createElement('emoji-picker');
    emojiPicker.classList.add('chat-emoji-picker');
    toolbar.closest('.chat-compose').appendChild(emojiPicker);
    emojiPicker.addEventListener('emoji-click', e => {
      input.value += e.detail.unicode;
      input.focus();
    });
    const close = (ev) => {
      if (!emojiPicker) return;
      if (!emojiPicker.contains(ev.target) && ev.target !== emojiBtn) {
        emojiPicker.remove(); emojiPicker = null;
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  });

  // Image upload
  const imgInput = toolbar.querySelector('[data-chat-img-input]');
  imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      push({ who: whoAmI(), img: reader.result });
      imgInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  // GIF picker
  const gifBtn = toolbar.querySelector('[data-chat-gif]');
  let gifPanel = null;
  gifBtn.addEventListener('click', () => {
    if (gifPanel) { gifPanel.remove(); gifPanel = null; return; }
    gifPanel = document.createElement('div');
    gifPanel.className = 'chat-gif-picker';
    gifPanel.innerHTML = `<input placeholder="Search GIFs..." data-gif-search><div class="chat-gif-results"></div>`;
    toolbar.closest('.chat-compose').appendChild(gifPanel);
    const searchInput = gifPanel.querySelector('[data-gif-search]');
    const results = gifPanel.querySelector('.chat-gif-results');
    searchInput.focus();

    function closeGif() {
      if (gifPanel) { gifPanel.remove(); gifPanel = null; }
      document.removeEventListener('click', outsideClick);
    }

    function outsideClick(ev) {
      if (!gifPanel) return;
      if (!gifPanel.contains(ev.target) && ev.target !== gifBtn) closeGif();
    }

    async function searchGifs(q) {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        results.innerHTML = (data.data || []).map(g => {
          const preview = g.images.fixed_width_small.url;
          const full = g.images.original.url;
          return `<img src="${preview}" data-full="${full}">`;
        }).join('');
        results.querySelectorAll('img').forEach(img => {
          img.addEventListener('click', () => {
            push({ who: whoAmI(), img: img.dataset.full });
            closeGif();
          });
        });
      } catch { results.innerHTML = '<div style="font-size:11px;color:var(--text-4);padding:8px;">Could not load GIFs</div>'; }
    }

    searchGifs('');
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => searchGifs(searchInput.value.trim()), 300);
    });

    setTimeout(() => document.addEventListener('click', outsideClick), 0);
  });
}

export function initInlineChat() {
  const list = document.querySelector('.chat-inline .chat-list');
  if (!list) return;
  function render() {
    list.innerHTML = renderMsgs(load());
    list.scrollTop = list.scrollHeight;
  }
  render();
  window.addEventListener('pc-chat', render);
  window.addEventListener('storage', e => { if (e.key === 'pc_' + KEY) render(); });
  if (isVisitor(currentUser())) {
    const compose = document.querySelector('.chat-inline .chat-compose');
    if (compose) compose.style.display = 'none';
  } else {
    bindInput(document.querySelector('.chat-inline input[data-act="send"]'));
    const inlinePanel = document.querySelector('.chat-inline');
    if (inlinePanel) bindToolbar(inlinePanel);
  }
}

export function initFloatingChat() {
  const panel = document.querySelector('[data-chat-panel]');
  if (!panel) return;

  const openBtn = document.querySelector('[data-open-chat]');
  const closeBtn = document.querySelector('[data-close-chat]');
  let open = get('chat_open', false);

  const bubble = document.querySelector('.chat-bubble');
  function setOpen(v) {
    open = v;
    panel.style.display = v ? 'flex' : 'none';
    if (bubble) bubble.style.display = v ? 'none' : 'flex';
    put('chat_open', v);
  }

  // position
  const pos = get('chat_pos', null);
  if (pos) {
    panel.style.left = pos.left + 'px';
    panel.style.top = pos.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  } else {
    panel.style.right = '20px';
    panel.style.top = '60px';
  }

  setOpen(open);

  if (openBtn) openBtn.addEventListener('click', () => setOpen(!open));
  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));

  // drag
  const header = panel.querySelector('.chat-panel-header');
  let drag = null;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('.chat-panel-close')) return;
    const r = panel.getBoundingClientRect();
    panel.style.left = r.left + 'px';
    panel.style.top = r.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove', e => {
    if (!drag) return;
    const x = Math.max(4, Math.min(window.innerWidth - panel.offsetWidth - 4, drag.ox + (e.clientX - drag.sx)));
    const y = Math.max(4, Math.min(window.innerHeight - panel.offsetHeight - 4, drag.oy + (e.clientY - drag.sy)));
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
  });
  header.addEventListener('pointerup', e => {
    if (!drag) return;
    header.releasePointerCapture(e.pointerId);
    put('chat_pos', { left: parseInt(panel.style.left), top: parseInt(panel.style.top) });
    drag = null;
  });

  // messages
  const body = panel.querySelector('.chat-panel-body');
  function render() {
    body.innerHTML = renderMsgs(load());
    body.scrollTop = body.scrollHeight;
  }
  render();
  window.addEventListener('pc-chat', render);
  window.addEventListener('storage', e => { if (e.key === 'pc_' + KEY) render(); });
  if (isVisitor(currentUser())) {
    const compose = panel.querySelector('.chat-compose');
    if (compose) compose.style.display = 'none';
  } else {
    bindInput(panel.querySelector('input[data-act="send"]'));
    bindToolbar(panel);
  }
}
