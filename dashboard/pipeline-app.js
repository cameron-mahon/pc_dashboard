import { requireAuth } from './auth.js';
import { initFloatingChat } from './chat.js';
import { initPipeline } from './pipeline-page.js';
import { initSurface } from './surface.js';
import { initUserBar } from './userbar.js';
import { initSidebar } from './sidebar.js';

if (requireAuth()) {
  initSidebar();
  initUserBar();
  initFloatingChat();
  initPipeline();
  initSurface('pipeline');
}
