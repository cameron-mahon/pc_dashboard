import { requireAuth } from './auth.js';
import { initFloatingChat } from './chat.js';
import { initMarketing } from './marketing-page.js';
import { initUserBar } from './userbar.js';
import { initSidebar } from './sidebar.js';
import { initRecs } from './recs.js';

if (requireAuth()) {
  initSidebar();
  initUserBar();
  initFloatingChat();
  initRecs();
  initMarketing();
}
