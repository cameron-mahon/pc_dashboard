import { get, put, esc } from './store.js';
import { currentUser } from './auth.js';
import 'emoji-picker-element';

const KEY = 'chat';
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCHQ';

function whoAmI() {
  const u = currentUser();
  return u ? u.name : 'anon';
}

function load() { return get(KEY, []); }

function msgHTML(m) {
  const me = whoAmI();
  const cls = m.who === me ? 'chat-msg you' : 'chat-msg';
  if (m.img) {
    return `<div class="${cls}"><span class="who">${esc(m.who)}</span><img src="${esc(m.img)}" alt=""></div>`;
  }
  return `<div class="${cls}"><span class="who">${esc(m.who)}</span>${esc(m.text)}</div>`;
}

function bindInput(input) {
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      push({ who: whoAmI(), text: input.value.trim() });
      input.value = '';
    }
  });
}

function push(msg) {
  const msgs = load();
  msgs.push(msg);
  put(KEY, msgs);
  window.dispatchEvent(new CustomEvent('pc-chat'));
}

function bindToolbar(panel) {
  const toolbar = panel.querySelector('.chat-panel-toolbar');
  if (!toolbar) return;
  const input = panel.querySelector('input[data-act="send"]');

  // Emoji picker
  const emojiBtn = toolbar.querySelector('[data-chat-emoji]');
  let emojiPicker = null;
  emojiBtn.addEventListener('click', () => {
    if (emojiPicker) { emojiPicker.remove(); emojiPicker = null; return; }
    emojiPicker = document.createElement('emoji-picker');
    emojiPicker.classList.add('chat-emoji-picker');
    toolbar.style.position = 'relative';
    toolbar.appendChild(emojiPicker);
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
    toolbar.style.position = 'relative';
    toolbar.appendChild(gifPanel);
    const searchInput = gifPanel.querySelector('[data-gif-search]');
    const results = gifPanel.querySelector('.chat-gif-results');
    searchInput.focus();

    async function searchGifs(q) {
      const endpoint = q
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=20&media_filter=tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=20&media_filter=tinygif`;
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        results.innerHTML = (data.results || []).map(g => {
          const url = g.media_formats.tinygif.url;
          return `<img src="${url}" data-full="${g.media_formats.gif ? g.media_formats.gif.url : url}">`;
        }).join('');
        results.querySelectorAll('img').forEach(img => {
          img.addEventListener('click', () => {
            push({ who: whoAmI(), img: img.dataset.full });
            gifPanel.remove(); gifPanel = null;
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

    const close = (ev) => {
      if (!gifPanel) return;
      if (!gifPanel.contains(ev.target) && ev.target !== gifBtn) {
        gifPanel.remove(); gifPanel = null;
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  });
}

export function initInlineChat() {
  const list = document.querySelector('.chat-inline .chat-list');
  if (!list) return;
  function render() {
    const msgs = load();
    list.innerHTML = msgs.length
      ? msgs.map(msgHTML).join('')
      : '<div class="chat-empty">No messages yet</div>';
    list.scrollTop = list.scrollHeight;
  }
  render();
  window.addEventListener('pc-chat', render);
  window.addEventListener('storage', e => { if (e.key === 'pc_' + KEY) render(); });
  bindInput(document.querySelector('.chat-inline input[data-act="send"]'));
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
    const msgs = load();
    body.innerHTML = msgs.length
      ? msgs.map(msgHTML).join('')
      : '<div class="chat-empty">No messages yet</div>';
    body.scrollTop = body.scrollHeight;
  }
  render();
  window.addEventListener('pc-chat', render);
  window.addEventListener('storage', e => { if (e.key === 'pc_' + KEY) render(); });
  bindInput(panel.querySelector('input[data-act="send"]'));
  bindToolbar(panel);
}
