import { requireAuth } from './auth.js';
import { initFloatingChat } from './chat.js';
import { initPipeline } from './pipeline-page.js';
import { initSurface } from './surface.js';
import { initUserBar } from './userbar.js';
import { initSidebar } from './sidebar.js';
import { initRecs } from './recs.js';

if (requireAuth()) {
  initSidebar();
  initUserBar();
  initFloatingChat();
  initRecs();
  initPipeline();
  initSurface('pipeline');
}
