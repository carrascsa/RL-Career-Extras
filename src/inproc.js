'use strict';
// RL Career Extras — runs inside the RL Career Hub main process (loaded through the inspector by launcher.js).
// Wraps engine/league.js exports and the IPC handlers; never edits game files.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const hof = require('./hof-engine');
const core = require('./core');
const U = require('./util');

const TESTED_VERSIONS = ['0.2.0-beta.33'];
const HOF_PREFIX = 'hof:';
const XT_PREFIX = 'xt:';
const UI_FILES = ['ui-common.js', 'hof-ui.js', 'academy-ui.js', 'clublife-ui.js', 'circuit-ui.js', 'world-ui.js', 'caster-ui.js'];

let liveState = null;
let log = () => {};
let ctx = core.makeCtx(null, {});

function sameCareer(a, b) {
  return a && b && a.userTeamId === b.userTeamId && a.userPlayerId === b.userPlayerId && a.startDate === b.startDate;
}

function remember(st) { if (U.isCareer(st)) liveState = st; }

function tick(st) {
  if (!U.isCareer(st)) return;
  try { core.tick(st, ctx); } catch (e) { log('tick err: ' + (e && e.stack || e)); }
}

function readHubLanguage() {
  try {
    const f = path.join(U.userData(), 'language.json');
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return String(j.language || 'en').startsWith('es') ? 'es' : 'en';
  } catch { return 'en'; }
}

function wrapEngine(engine) {
  if (engine.__careerExtras) return false;
  engine.__careerExtras = true;
  if (!ctx.engine) ctx = core.makeCtx(engine, { log: (m) => log(m), lang: ctx.lang });

  // Before AND after: startNextSeason wipes the season's fixtures, so they must be read first.
  for (const name of ['advance', 'startNextSeason', 'simulateFixture', 'simulateNextGame', 'applyUserResult', 'forfeitUserSeries']) {
    const orig = engine[name];
    if (typeof orig !== 'function') continue;
    engine[name] = function xtWrapped(state, ...rest) {
      remember(state);
      tick(state);
      const out = orig.call(this, state, ...rest);
      tick(state);
      return out;
    };
  }
  for (const name of ['playerView', 'repairInvariants', 'staffList']) {
    const orig = engine[name];
    if (typeof orig !== 'function') continue;
    engine[name] = function xtRemember(state, ...rest) { remember(state); return orig.call(this, state, ...rest); };
  }

  // Command channel from the renderer: window.hub.placeBet({ kind: 'hof:{...}' | 'xt:{...}' })
  const origBet = engine.placeBet;
  if (typeof origBet === 'function') {
    engine.placeBet = function xtPlaceBet(state, kind, ...rest) {
      if (typeof kind === 'string' && (kind.startsWith(HOF_PREFIX) || kind.startsWith(XT_PREFIX))) {
        remember(state);
        try {
          const isHof = kind.startsWith(HOF_PREFIX);
          const cmd = JSON.parse(kind.slice(isHof ? HOF_PREFIX.length : XT_PREFIX.length));
          const res = isHof ? hof.applyCommand(state, cmd) : core.command(state, cmd, ctx);
          tick(state);
          return res;
        } catch (e) {
          return { ok: false, error: 'Career Extras: ' + e.message };
        }
      }
      return origBet.call(this, state, kind, ...rest);
    };
  }
  core.wrapEngine(engine, { log, lang: () => ctx.lang });
  return true;
}

function patchResult(out) {
  if (!out || typeof out !== 'object' || !U.isCareer(out.career)) return out;
  if (!sameCareer(liveState, out.career)) liveState = out.career;
  const st = liveState;
  tick(st);
  try {
    out.hof = hof.buildSnapshot(st);
    out.xtra = core.snapshot(st, ctx);
  } catch (e) {
    log('snapshot err: ' + (e && e.stack || e));
  }
  return out;
}

function installIpcHook() {
  const { ipcMain } = require('electron');
  const wrap = (ch, fn) => {
    if (typeof fn !== 'function' || fn.__xtWrap) return fn;
    const wrapped = async function xtIpc(ev, ...args) {
      if (ch === 'close-career') liveState = null;
      else if (liveState) tick(liveState);
      const out = await fn.call(this, ev, ...args);
      return patchResult(out);
    };
    wrapped.__xtWrap = true;
    return wrapped;
  };
  if (ipcMain && ipcMain._invokeHandlers && typeof ipcMain._invokeHandlers.entries === 'function') {
    for (const [ch, fn] of Array.from(ipcMain._invokeHandlers.entries())) ipcMain._invokeHandlers.set(ch, wrap(ch, fn));
  }
  if (ipcMain && typeof ipcMain.handle === 'function' && !ipcMain.__xtHandleWrap) {
    ipcMain.__xtHandleWrap = true;
    const origHandle = ipcMain.handle.bind(ipcMain);
    ipcMain.handle = (ch, fn) => origHandle(ch, wrap(ch, fn));
  }
}

// Pro caster voices and crowd: pre-recorded clips (src/voice) handed to the window once per page load,
// the index first and then one file per call (about 25 MB in all, too much for a single message).
async function pushVoice(wc) {
  try {
    const dir = path.join(__dirname, 'voice');
    const mf = path.join(dir, 'manifest.json');
    if (!fs.existsSync(mf)) return;
    const manifest = JSON.parse(fs.readFileSync(mf, 'utf8'));
    const r = await wc.executeJavaScript('window.__xtVoice && window.__xtVoice(' + JSON.stringify({ manifest }) + ')');
    const amb = Object.values(manifest.amb || {}).flat();
    let sent = 0;
    for (const f of [...amb, ...manifest.files]) {
      const p = path.join(dir, f + '.mp3');
      if (!fs.existsSync(p) || wc.isDestroyed()) continue;
      await wc.executeJavaScript('window.__xtVoiceFile && window.__xtVoiceFile(' + JSON.stringify(f) + ',' + JSON.stringify(fs.readFileSync(p).toString('base64')) + ')');
      sent++;
    }
    log('pro voice -> ' + r + ', ' + sent + ' files');
  } catch (e) {
    log('pro voice failed: ' + (e && e.message));
  }
}

function installUiHook() {
  const { app, BrowserWindow } = require('electron');
  const uiSrc = UI_FILES.map((f) => {
    const p = path.join(__dirname, f);
    return fs.existsSync(p) ? '\n;' + fs.readFileSync(p, 'utf8') : '';
  }).join('\n');
  const injected = new WeakMap();
  const inject = (wc) => {
    try {
      const url = wc.getURL();
      if (!/renderer[\\/]index\.html/.test(url)) return;
      if (injected.get(wc) === url) return;
      injected.set(wc, url);
      wc.executeJavaScript(uiSrc + '\n;[window.__xtCommon ? "common" : "-", window.__hallOfFameUI ? "hof" : "-", window.__xtAcademyUI ? "academy" : "-", window.__xtClubLifeUI ? "clublife" : "-", window.__xtCircuitUI ? "circuit" : "-", window.__xtWorldUi ? "world" : "-", window.__xtCasterUi ? "caster" : "-"].join("+");')
        .then((r) => { log('ui inject -> ' + r); return pushVoice(wc); })
        .catch((e) => { injected.delete(wc); log('ui inject failed: ' + e.message); });
    } catch (e) {
      log('ui inject error: ' + e.message);
    }
  };
  const watch = (win) => {
    if (!win || !win.webContents) return;
    inject(win.webContents);
    win.webContents.on('did-start-navigation', (_e, _u, inPlace, mainFrame) => { if (mainFrame && !inPlace) injected.delete(win.webContents); });
    win.webContents.on('did-finish-load', () => inject(win.webContents));
    win.webContents.on('dom-ready', () => inject(win.webContents));
  };
  BrowserWindow.getAllWindows().forEach(watch);
  app.on('browser-window-created', (_e, win) => watch(win));
}

// Live caster: the observer runs beside real matches and the Hub window speaks the lines.
let live = null;
function startLiveCaster() {
  try {
    const { app, BrowserWindow } = require('electron');
    const python = path.join(process.resourcesPath || '', 'python', 'python.exe');
    const hubWindow = () => BrowserWindow.getAllWindows().find((w) => w && w.webContents && /renderer[\\/]index\.html/.test(w.webContents.getURL()));
    const broadcast = require('./broadcast').createBroadcast({ log });
    ctx.broadcast = broadcast; // for the preview button in the Caster tab
    const perf = require('./perf').createPerf({
      log,
      enabled: () => { const x = liveState && liveState.xtra && liveState.xtra.extras; return !x || x.perf !== false; },
      calm: (on) => { const w = hubWindow(); if (w) w.webContents.executeJavaScript('window.__xtMatchCalm && window.__xtMatchCalm(' + (on ? 'true' : 'false') + ')').catch(() => {}); },
    });
    live = require('./live-caster').createLive({
      python,
      log,
      onEnd: (data) => broadcast.showEnd(data),
      onMatch: (on) => perf.set(on),
      lang: () => ctx.lang,
      getState: () => liveState,
      send: (payload) => {
        const w = hubWindow();
        if (!w) return;
        w.webContents.executeJavaScript('window.__xtLive && window.__xtLive(' + JSON.stringify(payload) + ')').catch((e) => log('live send failed: ' + e.message));
      },
    });
    live.start();
    const stop = () => { if (live) live.stop(); broadcast.destroy(); perf.set(false); };
    app.on('before-quit', stop);
    app.on('will-quit', stop);
    process.on('exit', stop);
  } catch (e) {
    log('live caster failed to start: ' + (e && e.stack || e));
  }
}

function findEngine() {
  const key = Object.keys(Module._cache).find((k) => /engine[\\/]league\.js$/.test(k));
  return key ? { key, engine: Module._cache[key].exports } : null;
}

function attach(opts = {}) {
  const logFile = opts.log || path.join(process.env.TEMP || '.', 'rlcareerextras.log');
  log = (m) => { try { fs.appendFileSync(logFile, new Date().toISOString() + ' ' + m + '\n'); } catch { } };
  const found = findEngine();
  if (!found) return 'wait';
  const { engine, key } = found;
  if (!engine || typeof engine.advance !== 'function' || typeof engine.placeBet !== 'function') return 'wait';
  if (engine.__careerExtras) return 'already';
  let version = '?';
  try { version = require('electron').app.getVersion(); } catch { }
  if (!TESTED_VERSIONS.includes(version) && !opts.force) {
    log('refusing to attach: RL Career Hub ' + version + ' is not a tested version (' + TESTED_VERSIONS.join(', ') + ')');
    return 'error: RL Career Hub ' + version + ' not tested (run with --force to try anyway)';
  }
  try {
    ctx = core.makeCtx(engine, { log, lang: readHubLanguage() });
    wrapEngine(engine);
    installIpcHook();
    installUiHook();
    startLiveCaster();
    log('attached to ' + key + ' (hub ' + version + ', lang ' + ctx.lang + ')');
    return 'wrapped';
  } catch (e) {
    log('attach failed: ' + e.stack);
    return 'error: ' + e.message;
  }
}

module.exports = {
  attach, wrapEngine, patchResult,
  // test hooks
  _ctx: () => ctx,
  _setLog: (fn) => { log = fn; },
};
