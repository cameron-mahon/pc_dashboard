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

  const floater = document.getElementById('lobby-float');
  if (floater) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX;
    let curY = targetY;
    const speed = 0.8;
    const half = 150;
    const mv = document.getElementById('lobby-model');
    let freakout = false;
    let mouseActive = false;

    document.addEventListener('mousemove', e => {
      targetX = e.clientX;
      targetY = e.clientY;
      mouseActive = true;
    });

    floater.style.left = '0px';
    floater.style.top = '0px';
    function tick() {
      const dx = targetX - curX;
      const dy = targetY - curY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        curX += (dx / dist) * Math.min(speed, dist);
        curY += (dy / dist) * Math.min(speed, dist);
      }
      const lookX = targetX - curX;
      const lookY = targetY - curY;
      const lookDist = Math.sqrt(lookX * lookX + lookY * lookY) || 1;
      const theta = Math.atan2(lookX, Math.abs(lookY) || 1) * (180 / Math.PI) + 180;
      const phi = 90 + (lookY / lookDist) * 60;
      if (mv && !freakout) {
        mv.cameraOrbit = `${theta}deg ${phi}deg 150%`;
      }
      floater.style.transform = `translate(${curX - half}px, ${curY - half}px) scale(0.27)`;

      const creatureRadius = half * 0.27;
      const cursorOnCreature = mouseActive
        && Math.abs(targetX - curX) < creatureRadius
        && Math.abs(targetY - curY) < creatureRadius;
      if (cursorOnCreature && dist < 10 && mv) {
        if (!freakout) freakout = true;
        const t = (Math.random() - 0.5) * 2160;
        const p = (Math.random() - 0.5) * 1440;
        const z = 50 + Math.random() * 300;
        mv.cameraOrbit = `${t}deg ${p}deg ${z}%`;
        mv.fieldOfView = `${10 + Math.random() * 120}deg`;
        floater.style.transform = `translate(${curX - half}px, ${curY - half}px) rotate(${(Math.random() - 0.5) * 90}deg) scale(${0.5 + Math.random() * 2})`;
      } else if (freakout && mv) {
        freakout = false;
        mv.cameraOrbit = '0deg 75deg 150%';
        mv.fieldOfView = '45deg';
      }

      requestAnimationFrame(tick);
    }
    tick();
  }
}
