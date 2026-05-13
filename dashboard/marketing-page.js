import { get, put, uid, esc } from './store.js';
import { openModal } from './modal.js';
import { currentUser, isVisitor } from './auth.js';

export function initMarketing() {
  if (!document.querySelector('[data-marketing]')) return;
  const viewOnly = isVisitor(currentUser());

  const box = document.querySelector('[data-campaigns]');

  function getCamps() { return get('campaigns', []); }
  function saveCamps(c) { put('campaigns', c); }

  function renderCampaigns() {
    const camps = getCamps();
    if (!camps.length) {
      box.innerHTML = '<div class="empty">No campaigns yet</div>';
      return;
    }

    box.innerHTML = camps.map(camp => {
      const cls = 'campaign' + (camp.active ? ' active' : '');
      return `<div class="${cls}" data-id="${camp.id}">
        ${viewOnly ? '' : '<span class="x">×</span>'}
        <div class="campaign-head">
          <div class="campaign-name">${esc(camp.name)}</div>
          <div class="campaign-controls">
            <span class="campaign-badge">${camp.active ? 'in progress' : 'paused'}</span>
            ${viewOnly ? '' : `<button class="btn btn-sm btn-ghost" data-toggle="${camp.id}">${camp.active ? 'Pause' : 'Activate'}</button>`}
          </div>
        </div>
        <div class="surface campaign-surface" data-campaign-surface="${camp.id}"></div>
        ${viewOnly ? '' : `<button class="btn btn-add" style="margin-top:10px;" data-file-add="${camp.id}"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>File</button>`}
      </div>`;
    }).join('');

    // place files on each campaign surface
    camps.forEach(camp => {
      const surface = box.querySelector(`[data-campaign-surface="${camp.id}"]`);
      (camp.files || []).forEach(f => surface.appendChild(makeTile(f, camp.id, surface)));
    });

    // toggle active
    box.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggle;
        const camps = getCamps();
        camps.forEach(c => { c.active = c.id === id ? !c.active : false; });
        saveCamps(camps);
        renderCampaigns();
      });
    });

    // remove campaign
    box.querySelectorAll('.campaign > .x').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.campaign').dataset.id;
        saveCamps(getCamps().filter(c => c.id !== id));
        renderCampaigns();
      });
    });

    // add file
    box.querySelectorAll('[data-file-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const campId = btn.dataset.fileAdd;
        openModal('Add File', [
          { key: 'name', label: 'File name', placeholder: 'e.g. hero image, copy draft v2...' }
        ], d => {
          if (!d.name) return false;
          const camps = getCamps();
          const camp = camps.find(c => c.id === campId);
          if (!camp) return false;
          camp.files = camp.files || [];
          const count = camp.files.length;
          camp.files.push({
            id: uid(), name: d.name,
            x: 12 + (count % 5) * 100,
            y: 12 + Math.floor(count / 5) * 100
          });
          saveCamps(camps);
          renderCampaigns();
        });
      });
    });
  }

  function makeTile(file, campId, surface) {
    const el = document.createElement('div');
    el.className = 'file-tile';
    el.dataset.fileId = file.id;
    el.style.left = (file.x || 0) + 'px';
    el.style.top = (file.y || 0) + 'px';
    el.innerHTML = `<span class="x">×</span><span class="file-name">${esc(file.name)}</span>`;

    el.querySelector('.x').addEventListener('click', e => {
      e.stopPropagation();
      const camps = getCamps();
      const camp = camps.find(c => c.id === campId);
      if (camp) {
        camp.files = (camp.files || []).filter(f => f.id !== file.id);
        saveCamps(camps);
      }
      el.remove();
    });

    let drag = null;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.x')) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sr = surface.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, ox: rect.left - sr.left, oy: rect.top - sr.top };
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const sr = surface.getBoundingClientRect();
      el.style.left = Math.max(0, Math.min(sr.width - el.offsetWidth, drag.ox + (e.clientX - drag.sx))) + 'px';
      el.style.top = Math.max(0, Math.min(sr.height - el.offsetHeight, drag.oy + (e.clientY - drag.sy))) + 'px';
    });
    el.addEventListener('pointerup', e => {
      if (!drag) return;
      el.releasePointerCapture(e.pointerId);
      el.classList.remove('dragging');
      const camps = getCamps();
      const camp = camps.find(c => c.id === campId);
      if (camp) {
        const f = (camp.files || []).find(f => f.id === file.id);
        if (f) {
          f.x = parseInt(el.style.left);
          f.y = parseInt(el.style.top);
          saveCamps(camps);
        }
      }
      drag = null;
    });

    return el;
  }

  renderCampaigns();

  if (viewOnly) { document.querySelector('[data-campaign-add]').style.display = 'none'; }
  else document.querySelector('[data-campaign-add]').addEventListener('click', () => {
    openModal('New Campaign', [
      { key: 'name', label: 'Campaign name', placeholder: 'e.g. launch teaser, investor outreach...' }
    ], d => {
      if (!d.name) return false;
      const camps = getCamps();
      camps.push({ id: uid(), name: d.name, active: camps.length === 0, files: [] });
      saveCamps(camps);
      renderCampaigns();
    });
  });

  // ---- Workbenches ----
  const wbBox = document.querySelector('[data-workbenches]');
  const wbAdd = document.querySelector('[data-workbench-add]');
  if (!wbBox || !wbAdd) return;

  const WB_KEY = 'marketing_workbenches';
  function getWBs() {
    let wbs = get(WB_KEY, null);
    if (!wbs) {
      wbs = [{ id: uid(), name: 'Files', files: [] }];
      put(WB_KEY, wbs);
    }
    return wbs;
  }
  function saveWBs(w) { put(WB_KEY, w); }

  function renderWorkbenches() {
    const wbs = getWBs();
    wbBox.innerHTML = wbs.map(wb =>
      `<div class="workbench-block" data-wb="${wb.id}">
        <div class="panel-header">
          <div class="panel-title">${esc(wb.name)}</div>
          ${!viewOnly && wbs.length > 1 ? `<span class="wb-x" data-wb-remove="${wb.id}">&times;</span>` : ''}
        </div>
        <div class="surface workbench-surface" data-wb-surface="${wb.id}"></div>
        <button class="btn btn-add" data-wb-add="${wb.id}" style="margin-top:8px;${viewOnly ? 'display:none;' : ''}"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>Add Item</button>
      </div>`
    ).join('');

    wbs.forEach(wb => {
      const surface = wbBox.querySelector(`[data-wb-surface="${wb.id}"]`);
      (wb.files || []).forEach((f, i) => {
        if (f.x == null) { f.x = 12 + (i % 5) * 100; f.y = 12 + Math.floor(i / 5) * 100; }
        surface.appendChild(makeWBTile(f, wb.id, surface));
      });
      (wb.refs || []).forEach(r => surface.appendChild(makeRefTile(r, wb.id, surface)));
      fitSurface(surface, wb.id);
    });

    if (wbs.some(wb => (wb.refs || []).length)) processEmbeds();

    wbBox.querySelectorAll('[data-wb-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = currentUser();
        if (!user || user.role === 'member') {
          openModal('Access Denied', [
            { key: '_info', label: 'Only admins and superadmins can delete workbenches', type: 'info' }
          ], () => false);
          return;
        }
        const id = btn.dataset.wbRemove;
        const wb = getWBs().find(w => w.id === id);
        const name = wb ? wb.name : 'this workbench';
        openModal('Delete Workbench', [
          { key: 'password', label: 'Enter your password to confirm', type: 'password', placeholder: 'Password' },
          { key: 'confirm', label: `Type "${name}" to confirm`, placeholder: name }
        ], d => {
          if (d.password !== user.password) {
            alert('Wrong password');
            return false;
          }
          if (d.confirm !== name) {
            alert('Name does not match');
            return false;
          }
          saveWBs(getWBs().filter(w => w.id !== id));
          renderWorkbenches();
        });
      });
    });

    wbBox.querySelectorAll('[data-wb-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wbId = btn.dataset.wbAdd;
        openModal('Add Item', [
          { key: 'files', label: 'Files', type: 'file', multiple: true },
          { key: 'url', label: 'URL (optional)', placeholder: 'Or paste a link from Twitter, YouTube, etc.' }
        ], d => {
          const picked = d.files && d.files.length > 0;
          if (!picked && !d.url) return false;
          const wbs = getWBs();
          const wb = wbs.find(w => w.id === wbId);
          if (!wb) return false;
          if (d.url) {
            wb.refs = wb.refs || [];
            const total = (wb.files || []).length + wb.refs.length;
            wb.refs.push({
              id: uid(), url: d.url, note: '',
              platform: detectPlatform(d.url),
              x: 12 + (total % 2) * 260,
              y: 12 + Math.floor(total / 2) * 240
            });
          }
          if (picked) {
            wb.files = wb.files || [];
            Array.from(d.files).forEach(f => {
              const count = wb.files.length;
              wb.files.push({
                id: uid(), name: f.name,
                x: 12 + (count % 5) * 100,
                y: 12 + Math.floor(count / 5) * 100
              });
            });
          }
          saveWBs(wbs);
          renderWorkbenches();
        });
      });
    });
  }

  function makeWBTile(file, wbId, surface) {
    const el = document.createElement('div');
    el.className = 'file-tile';
    el.dataset.fileId = file.id;
    el.style.left = (file.x || 0) + 'px';
    el.style.top = (file.y || 0) + 'px';
    if (viewOnly) {
      el.innerHTML = `<span class="file-name">${esc(file.name)}</span>`;
      return el;
    }
    el.innerHTML = `<span class="x">×</span><span class="file-name">${esc(file.name)}</span>`;

    el.querySelector('.x').addEventListener('click', e => {
      e.stopPropagation();
      const wbs = getWBs();
      const wb = wbs.find(w => w.id === wbId);
      if (wb) {
        wb.files = (wb.files || []).filter(f => f.id !== file.id);
        saveWBs(wbs);
      }
      el.remove();
      fitSurface(surface, wbId);
    });

    let drag = null;
    el.onpointerdown = e => {
      if (e.target.closest('.x')) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const sr = surface.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, ox: rect.left - sr.left, oy: rect.top - sr.top };
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
    };
    el.onpointermove = e => {
      if (!drag) return;
      const nx = Math.max(0, drag.ox + (e.clientX - drag.sx));
      const ny = Math.max(0, drag.oy + (e.clientY - drag.sy));
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';
      fitSurface(surface, wbId);
    };
    el.onpointerup = e => {
      if (!drag) return;
      el.releasePointerCapture(e.pointerId);
      el.classList.remove('dragging');
      const wbs = getWBs();
      const wb = wbs.find(w => w.id === wbId);
      if (wb) {
        const f = (wb.files || []).find(f => f.id === file.id);
        if (f) { f.x = parseInt(el.style.left); f.y = parseInt(el.style.top); saveWBs(wbs); }
      }
      drag = null;
    };

    return el;
  }

  function fitSurface(surface) {
    let maxBottom = 120;
    surface.querySelectorAll('.file-tile,.ref-tile').forEach(t => {
      const bottom = parseInt(t.style.top || 0) + t.offsetHeight + 16;
      if (bottom > maxBottom) maxBottom = bottom;
    });
    surface.style.minHeight = maxBottom + 'px';
  }

  function detectPlatform(url) {
    if (/youtu\.?be/i.test(url)) return 'youtube';
    if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
    if (/instagram\.com/i.test(url)) return 'instagram';
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/linkedin\.com/i.test(url)) return 'linkedin';
    if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
    return 'link';
  }

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.body.appendChild(s);
  }

  function getEmbedHTML(ref) {
    const url = ref.url;
    if (ref.platform === 'youtube') {
      const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ||
                url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
      if (m) return `<iframe src="https://www.youtube.com/embed/${m[1]}" width="480" height="270" allowfullscreen></iframe>`;
    }
    if (ref.platform === 'twitter') {
      const m = url.match(/status\/(\d+)/);
      if (m) return `<blockquote class="twitter-tweet"><a href="https://twitter.com/i/status/${m[1]}"></a></blockquote>`;
    }
    if (ref.platform === 'instagram') {
      const m = url.match(/\/(p|reel)\/([a-zA-Z0-9_-]+)/);
      if (m) return `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/${m[1]}/${m[2]}/" style="max-width:540px;width:100%;"></blockquote>`;
    }
    if (ref.platform === 'tiktok') {
      const m = url.match(/video\/(\d+)/);
      if (m) return `<blockquote class="tiktok-embed" cite="${esc(url)}" data-video-id="${m[1]}" style="max-width:605px;"><a href="${esc(url)}"></a></blockquote>`;
    }
    const label = ref.platform !== 'link' ? ref.platform : new URL(url).hostname;
    return `<a href="${esc(url)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px;font-size:12px;color:var(--accent);text-decoration:none;word-break:break-all;">${esc(label)}<br>${esc(url.slice(0,60))}</a>`;
  }

  function processEmbeds() {
    loadScript('https://www.instagram.com/embed.js');
    loadScript('https://platform.twitter.com/widgets.js');
    loadScript('https://www.tiktok.com/embed.js');
    setTimeout(() => {
      if (window.instgrm) window.instgrm.Embeds.process();
      if (window.twttr) window.twttr.widgets.load();
    }, 500);
  }

  function makeRefTile(ref, wbId, surface) {
    const el = document.createElement('div');
    el.className = `ref-tile ref-${ref.platform || 'link'}`;
    el.dataset.refId = ref.id;
    el.style.left = (ref.x || 0) + 'px';
    el.style.top = (ref.y || 0) + 'px';
    const expandSVG = `<svg viewBox="0 0 16 16"><polyline points="10,2 14,2 14,6"/><line x1="14" y1="2" x2="9" y2="7"/><polyline points="6,14 2,14 2,10"/><line x1="2" y1="14" x2="7" y2="9"/></svg>`;
    const shrinkSVG = `<svg viewBox="0 0 16 16"><polyline points="14,6 10,6 10,2"/><line x1="10" y1="6" x2="15" y2="1"/><polyline points="2,10 6,10 6,14"/><line x1="6" y1="10" x2="1" y2="15"/></svg>`;
    el.innerHTML = viewOnly
      ? `<div class="ref-toggle" data-ref-toggle>${expandSVG}</div><div class="ref-embed">${getEmbedHTML(ref)}</div>${ref.note ? `<div class="ref-note">${esc(ref.note)}</div>` : ''}`
      : `<span class="x">×</span><div class="ref-toggle" data-ref-toggle>${expandSVG}</div><div class="ref-embed">${getEmbedHTML(ref)}</div>${ref.note ? `<div class="ref-note">${esc(ref.note)}</div>` : ''}`;

    if (!viewOnly) el.querySelector('.x').addEventListener('click', e => {
      e.stopPropagation();
      const wbs = getWBs();
      const wb = wbs.find(w => w.id === wbId);
      if (wb) {
        wb.refs = (wb.refs || []).filter(r => r.id !== ref.id);
        saveWBs(wbs);
      }
      el.remove();
      fitSurface(surface, wbId);
    });

    const toggle = el.querySelector('[data-ref-toggle]');
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      const expanded = el.classList.toggle('expanded');
      toggle.innerHTML = expanded ? shrinkSVG : expandSVG;
      fitSurface(surface, wbId);
    });

    if (viewOnly) return el;

    let drag = null;
    el.onpointerdown = e => {
      if (e.target.closest('.x') || e.target.closest('.ref-toggle') || e.target.closest('iframe') || e.target.closest('a')) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const sr = surface.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, ox: rect.left - sr.left, oy: rect.top - sr.top };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    el.onpointermove = e => {
      if (!drag) return;
      el.style.left = Math.max(0, drag.ox + (e.clientX - drag.sx)) + 'px';
      el.style.top = Math.max(0, drag.oy + (e.clientY - drag.sy)) + 'px';
      fitSurface(surface, wbId);
    };
    el.onpointerup = e => {
      if (!drag) return;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
      const wbs = getWBs();
      const wb = wbs.find(w => w.id === wbId);
      if (wb) {
        const r = (wb.refs || []).find(r => r.id === ref.id);
        if (r) { r.x = parseInt(el.style.left); r.y = parseInt(el.style.top); saveWBs(wbs); }
      }
      drag = null;
    };

    return el;
  }

  renderWorkbenches();

  if (viewOnly) { wbAdd.style.display = 'none'; }
  else wbAdd.addEventListener('click', () => {
    openModal('New Workbench', [
      { key: 'name', label: 'Workbench name', placeholder: 'e.g. assets, copy, research...' }
    ], d => {
      if (!d.name) return false;
      const wbs = getWBs();
      wbs.push({ id: uid(), name: d.name, files: [] });
      saveWBs(wbs);
      renderWorkbenches();
    });
  });
}
