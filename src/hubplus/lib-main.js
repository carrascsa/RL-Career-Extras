'use strict';
// RL Career Extras library for RLC Hub Addon Manager (main process). Does for the Addon Manager what inproc.js does
// for the standalone launcher: game engine hooks, per-save data, commands from the window, the live caster and the
// broadcast window. Each feature is its own addon (features.js); this library runs a feature only for the saves
// that picked it (hub.has).
const fs = require('fs');
const path = require('path');

module.exports = function (hub) {
  const SRC = path.join(hub.dir, 'src');
  const U = require(path.join(SRC, 'util'));
  const core = require(path.join(SRC, 'core'));
  const hof = require(path.join(SRC, 'hof-engine'));
  const { BY_GATE } = require(path.join(SRC, 'hubplus', 'features'));
  const log = (m) => hub.log(String(m));

  // ---------- where the Hub keeps its data in the Addon Manager's copy of the game ----------
  let userData = null;
  try { userData = hub.electron.app.getPath('userData'); } catch { userData = null; }
  if (userData) U.setUserData(userData);
  const lang = () => {
    try { const j = JSON.parse(fs.readFileSync(path.join(U.userData(), 'language.json'), 'utf8')); return String(j.language || 'en').startsWith('es') ? 'es' : 'en'; } catch { return 'en'; }
  };

  // ---------- features = the addons picked for this save ----------
  U.setGate((state, gate) => {
    const id = BY_GATE[gate];
    return id ? hub.has(state, id) : true;
  });

  // ---------- per-save data: state.xtra / state.hof live in hub.data(state) ----------
  // Our modules read state.xtra and state.hof; here those are views of the Addon Manager's per-save object, so the
  // data is saved where it expects it (state.hubPlusData["rlce-lib"]) and nowhere else.
  const bound = new WeakSet();
  function bind(state) {
    if (!state || typeof state !== 'object' || bound.has(state)) return state;
    const box = hub.data(state);
    for (const key of ['xtra', 'hof']) {
      const own = Object.getOwnPropertyDescriptor(state, key);
      // a save made with the standalone RL Career Extras: move its data in once
      if (own && 'value' in own && own.value && typeof own.value === 'object' && box[key] == null) box[key] = own.value;
      delete state[key];
      Object.defineProperty(state, key, {
        configurable: true, enumerable: false,
        get() { return hub.data(state)[key]; },
        set(v) { hub.data(state)[key] = v; },
      });
    }
    bound.add(state);
    return state;
  }

  const ctx = core.makeCtx(hub.engine, { log, lang: lang() });
  const tick = (state) => {
    if (!U.isCareer(state)) return;
    bind(state);
    try { core.tick(state, ctx); } catch (e) { log('tick err: ' + (e && e.stack || e)); }
  };

  // ---------- game engine hooks (limited to saves with this library by the Addon Manager) ----------
  const engine = hub.engine;
  for (const name of ['advance', 'startNextSeason', 'simulateFixture', 'simulateNextGame', 'applyUserResult', 'forfeitUserSeries']) {
    const orig = engine[name];
    if (typeof orig !== 'function') continue;
    engine[name] = function (state, ...rest) {
      tick(state);
      const out = orig.call(this, state, ...rest);
      tick(state);
      return out;
    };
  }
  core.wrapEngine(engine, { log, lang: () => ctx.lang });

  // ---------- what the window receives ----------
  hub.onSnapshot((snap, state) => {
    if (!U.isCareer(state)) return;
    ctx.lang = lang();
    tick(state);
    try {
      snap.xtra = core.snapshot(state, ctx);
      snap.hof = hub.has(state, BY_GATE.hof) ? hof.buildSnapshot(state) : null;
    } catch (e) { log('snapshot err: ' + (e && e.stack || e)); }
  });

  // ---------- commands from the window (hubPlus.call("rlce-lib", ...)) ----------
  const READ_ONLY = new Set(['editor:list', 'editor:get', 'caster:script']);
  hub.action('cmd', (payload, state) => {
    bind(state);
    if (payload && payload.lang) ctx.lang = String(payload.lang).startsWith('es') ? 'es' : 'en';
    const res = core.command(state, payload || {}, ctx);
    tick(state);
    return READ_ONLY.has(`${payload && payload.m}:${payload && payload.op}`) ? Object.assign({ save: false }, res) : res;
  });
  hub.action('hof', (payload, state) => { bind(state); return hof.applyCommand(state, payload || {}); });

  // caster voices and crowd sounds: the files live in the Live caster addon's folder
  const voiceDir = () => {
    const dirs = [path.join(hub.dir, '..', BY_GATE.live, 'voice'), path.join(hub.dir, 'voice'), path.join(SRC, 'voice')];
    return dirs.find((d) => fs.existsSync(path.join(d, 'manifest.json'))) || null;
  };
  hub.action('voiceManifest', () => {
    const d = voiceDir();
    if (!d) return { save: false, manifest: null };
    return { save: false, manifest: JSON.parse(fs.readFileSync(path.join(d, 'manifest.json'), 'utf8')) };
  });
  hub.action('voiceFile', (payload) => {
    const d = voiceDir();
    const name = String((payload && payload.file) || '');
    if (!d || !/^[\w/-]+$/.test(name) || name.includes('..')) return { save: false, data: null };
    const f = path.join(d, name + '.mp3');
    return { save: false, data: fs.existsSync(f) ? fs.readFileSync(f).toString('base64') : null };
  });

  // ---------- live caster, broadcast screens and performance mode (one set for the whole app) ----------
  try {
    const { app, BrowserWindow } = hub.electron;
    const hubWindow = () => BrowserWindow.getAllWindows().find((w) => w && w.webContents && /renderer[\\/]index\.html/.test(w.webContents.getURL()));
    const broadcast = require(path.join(SRC, 'broadcast')).createBroadcast({ log });
    ctx.broadcast = broadcast;
    const perf = require(path.join(SRC, 'perf')).createPerf({
      log,
      enabled: () => { const st = hub.state(); const x = st && hub.has(st, BY_GATE.extras) && st.xtra && st.xtra.extras; return !!x && x.perf !== false; },
      calm: (on) => { const w = hubWindow(); if (w) w.webContents.executeJavaScript('window.__xtMatchCalm && window.__xtMatchCalm(' + (on ? 'true' : 'false') + ')').catch(() => {}); },
    });
    const python = path.join(process.resourcesPath || '', 'python', 'python.exe');
    const live = require(path.join(SRC, 'live-caster')).createLive({
      python, log,
      lang: () => ctx.lang,
      // only a save that picked our addons (never create our data in someone else's save)
      getState: () => { const st = hub.state(); return st && hub.isOn(st) ? bind(st) : null; },
      onEnd: (data) => broadcast.showEnd(data),
      onMatch: (on) => perf.set(on),
      send: (payload) => { const w = hubWindow(); if (w) w.webContents.executeJavaScript('window.__xtLive && window.__xtLive(' + JSON.stringify(payload) + ')').catch((e) => log('live send failed: ' + e.message)); },
    });
    live.start();
    const stop = () => { live.stop(); broadcast.destroy(); perf.set(false); };
    app.on('before-quit', stop);
    app.on('will-quit', stop);
  } catch (e) {
    log('live services failed to start: ' + (e && e.stack || e));
  }

  log('RL Career Extras library ready (' + Object.keys(BY_GATE).length + ' features)');
};
