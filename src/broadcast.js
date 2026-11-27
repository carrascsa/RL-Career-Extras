'use strict';
// Broadcast overlay: a transparent, click-through, always-on-top window over Rocket League (which must run in
// borderless or windowed mode) that shows the end-of-game screens. Main process only.
const fs = require('fs');
const path = require('path');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

// The Hub stores team logos as "custom:<hash>" (an image in %APPDATA%\rl-career-hub\custom-art) or as a path of
// its own bundled art. The overlay gets them as data URLs so it never needs file access.
function logoDataUrl(ref) {
  if (!ref) return null;
  const files = [];
  const m = /^custom:([a-f0-9]{6,})$/i.exec(String(ref));
  if (m) {
    const dir = path.join(require('./util').userData(), 'custom-art');
    for (const ext of ['.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif']) files.push(path.join(dir, m[1] + ext));
  } else {
    const rel = String(ref).replace(/^[\\/]+/, '');
    const res = process.resourcesPath || '';
    files.push(path.join(res, 'app.asar', 'renderer', rel), path.join(res, 'app.asar', rel), path.join(res, 'app.asar', 'renderer', 'art', rel));
  }
  for (const f of files) {
    try {
      if (!fs.existsSync(f)) continue;
      const mime = MIME[path.extname(f).toLowerCase()] || 'image/png';
      return `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
    } catch { /* try the next one */ }
  }
  return null;
}

function createBroadcast(opts = {}) {
  const log = opts.log || (() => {});
  let win = null;
  let ready = null;
  let hideTimer = null;

  function ensure() {
    const { BrowserWindow, screen } = require('electron');
    if (win && !win.isDestroyed()) return win;
    const b = screen.getPrimaryDisplay().bounds;
    win = new BrowserWindow({
      x: b.x, y: b.y, width: b.width, height: b.height,
      transparent: true, frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
      focusable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false, backgroundColor: '#00000000',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true);
    ready = new Promise((res) => win.webContents.once('did-finish-load', res));
    win.loadFile(path.join(__dirname, 'overlay', 'endscreen.html'));
    win.on('closed', () => { win = null; ready = null; });
    return win;
  }

  // data: from broadcast-data.buildEndScreen. Shown after `delay` seconds so the game's own winner banner plays first.
  async function showEnd(data, o = {}) {
    try {
      const timing = { series: o.series || 5, sheet: o.sheet || 11 };
      for (const t of data.teams || []) t.logoUrl = logoDataUrl(t.logo);
      const w = ensure();
      await ready;
      if (hideTimer) clearTimeout(hideTimer);
      await new Promise((r) => setTimeout(r, (o.delay == null ? 3 : o.delay) * 1000));
      if (w.isDestroyed()) return;
      const b = require('electron').screen.getPrimaryDisplay().bounds;
      w.setBounds(b);
      w.showInactive();
      w.setAlwaysOnTop(true, 'screen-saver');
      await w.webContents.executeJavaScript(`window.xtShowEnd(${JSON.stringify(data)}, ${JSON.stringify(timing)})`);
      log('broadcast: end screens shown (' + (data.teams || []).map((t) => t.name).join(' vs ') + ')');
      hideTimer = setTimeout(() => { if (win && !win.isDestroyed()) win.hide(); }, (timing.series + timing.sheet + 1.5) * 1000);
    } catch (e) {
      log('broadcast failed: ' + (e && e.message));
    }
  }

  function hide() {
    if (hideTimer) clearTimeout(hideTimer);
    if (win && !win.isDestroyed()) { win.webContents.executeJavaScript('window.xtHide && window.xtHide()').catch(() => {}); setTimeout(() => { if (win && !win.isDestroyed()) win.hide(); }, 900); }
  }

  function destroy() { if (win && !win.isDestroyed()) win.destroy(); win = null; }

  return { showEnd, hide, destroy };
}

module.exports = { createBroadcast, logoDataUrl };
