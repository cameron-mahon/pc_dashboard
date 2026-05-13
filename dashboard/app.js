import { requireAuth } from './auth.js';
import { initInlineChat } from './chat.js';
import { initLobby } from './lobby.js';
import { initUserBar } from './userbar.js';
import { initSidebar } from './sidebar.js';
import '@google/model-viewer';

if (requireAuth()) {
  initSidebar();
  initUserBar();
  initInlineChat();
  initLobby();
}
