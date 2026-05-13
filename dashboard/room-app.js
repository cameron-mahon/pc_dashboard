import { requireAuth } from './auth.js';
import { get } from './store.js';
import { initFloatingChat } from './chat.js';
import { initSurface } from './surface.js';
import { initUserBar } from './userbar.js';
import { initSidebar } from './sidebar.js';

if (requireAuth()) {
  initSidebar();
  initUserBar();
  initFloatingChat();

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('id');

  if (!roomId) {
    window.location.href = 'index.html';
  } else {
    const rooms = get('rooms', []);
    const room = rooms.find(r => r.id === roomId);
    document.title = room ? room.name : 'Room';

    initSurface(roomId,
      document.querySelector('[data-room-surface]'),
      document.querySelector('[data-room-file-add]')
    );
  }
}
