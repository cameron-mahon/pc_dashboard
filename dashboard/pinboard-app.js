import { requireAuth } from './auth.js';
import { initFloatingChat } from './chat.js';
import { initUserBar } from './userbar.js';
import { initSidebar } from './sidebar.js';
import { initRecs } from './recs.js';
import { initPinboard } from './pinboard.js';

if (requireAuth()) {
  initSidebar();
  initUserBar();
  initFloatingChat();
  initRecs();
  initPinboard();
}
