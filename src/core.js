'use strict';
// Module dispatcher for RL Career Extras (pure: testable without Electron).
// A module: { id, init, onSeason, onDay, onTick, snapshot, command, wrapEngine }  (all optional but id)
const hof = require('./hof-engine');
const U = require('./util');

const MODULES = [
  require('./academy-engine'), require('./matchday-engine'), require('./club-engine'),
  require('./world-engine'), require('./circuit-engine'), require('./freestyle-engine'), require('./talk-engine'),
  require('./travel-engine'), require('./awards-engine'), require('./sponsor-engine'), require('./wellbeing-engine'),
  require('./y-engine'), require('./prospects-engine'), require('./drama-engine'), require('./ranking-engine'), require('./caster-engine'),
  require('./editor-engine'), require('./staff-engine'), require('./recruit-engine'), require('./matchsim-engine'), require('./extras-engine'), require('./mycareer-engine'),
];
const MAX_CATCHUP_DAYS = 400;

function makeCtx(engine, opts) {
  return {
    engine: engine || null,
    log: (opts && opts.log) || (() => {}),
    lang: (opts && opts.lang) || 'en',
    manager: true,
  };
}

// Mod manager: modules can be switched off per career (state.xtra.mods.off[id] = true).
function modsOf(state) {
  const x = U.xstate(state);
  if (!x.mods || typeof x.mods !== 'object') x.mods = { off: {} };
  if (!x.mods.off || typeof x.mods.off !== 'object') x.mods.off = {};
  return x.mods;
}
function isOn(state, m) { return !modsOf(state).off[m.id]; }
function active(state) { return MODULES.filter((m) => isOn(state, m)); }

function safe(ctx, label, fn) {
  try { return fn(); } catch (e) { ctx.log(label + ' err: ' + (e && e.stack || e)); return undefined; }
}

function tick(state, ctx) {
  if (!U.isCareer(state)) return;
  safe(ctx, 'hof', () => { const f = hof.update(state); if (f.length) ctx.log('hof unlocked: ' + f.join(', ')); });
  ctx.manager = U.isManager(ctx.engine, state);
  const x = U.xstate(state);
  if (x.careerKey !== U.careerKey(state) || !x.lastDay) {
    x.careerKey = U.careerKey(state);
    x.lastDay = state.currentDate;
    x.lastSeason = state.season;
    for (const m of active(state)) if (m.init) safe(ctx, m.id + '.init', () => m.init(state, ctx));
    x.inited = {};
    for (const m of MODULES) x.inited[m.id] = true;
  }
  // modules added in a later version of the addon still get their first init on existing careers
  if (!x.inited || typeof x.inited !== 'object') {
    x.inited = {};
    for (const m of MODULES) if (x[m.id] != null) x.inited[m.id] = true;
  }
  for (const m of active(state)) {
    if (x.inited[m.id]) continue;
    x.inited[m.id] = true;
    if (m.init) safe(ctx, m.id + '.init', () => m.init(state, ctx));
  }
  if (state.season !== x.lastSeason) {
    const prev = x.lastSeason;
    x.lastSeason = state.season;
    for (const m of active(state)) if (m.onSeason) safe(ctx, m.id + '.onSeason', () => m.onSeason(state, ctx, prev));
  }
  let n = U.daysBetween(x.lastDay, state.currentDate);
  if (n < 0) { x.lastDay = state.currentDate; n = 0; }
  if (n > MAX_CATCHUP_DAYS) { x.lastDay = U.addDays(state.currentDate, -MAX_CATCHUP_DAYS); n = MAX_CATCHUP_DAYS; }
  for (let i = 0; i < n; i++) {
    const day = U.addDays(x.lastDay, 1);
    for (const m of active(state)) if (m.onDay) safe(ctx, m.id + '.onDay', () => m.onDay(state, day, ctx));
    x.lastDay = day;
  }
  for (const m of active(state)) if (m.onTick) safe(ctx, m.id + '.onTick', () => m.onTick(state, ctx));
}

function snapshot(state, ctx) {
  if (!U.isCareer(state)) return null;
  const out = { manager: U.isManager(ctx.engine, state), mods: MODULES.map((m) => ({ id: m.id, on: isOn(state, m) })) };
  for (const m of MODULES) if (m.snapshot) out[m.id] = isOn(state, m) ? safe(ctx, m.id + '.snapshot', () => m.snapshot(state, ctx)) || null : null;
  return out;
}

function command(state, cmd, ctx) {
  if (!U.isCareer(state)) return { ok: false, error: 'No career loaded.' };
  if (!cmd || typeof cmd !== 'object') return { ok: false, error: 'Bad command.' };
  if (cmd.lang) ctx.lang = String(cmd.lang).startsWith('es') ? 'es' : 'en';
  ctx.manager = U.isManager(ctx.engine, state);
  if (cmd.m === 'mods') return modsCommand(state, cmd, ctx);
  const m = MODULES.find((x) => x.id === cmd.m);
  if (!m || !m.command) return { ok: false, error: 'Unknown module ' + cmd.m };
  if (!isOn(state, m)) return { ok: false, error: (ctx.lang === 'es' ? 'Ese módulo está apagado en el gestor de mods.' : 'That module is switched off in the mod manager.') };
  const res = safe(ctx, m.id + '.command', () => m.command(state, cmd, ctx));
  return res || { ok: false, error: 'Command failed (see log).' };
}

function modsCommand(state, cmd, ctx) {
  const mods = modsOf(state);
  const ids = cmd.op === 'all' ? MODULES.map((m) => m.id) : [String(cmd.id || '')];
  const turnOn = cmd.op === 'all' ? !!cmd.value : cmd.value != null ? !!cmd.value : !!mods.off[ids[0]];
  for (const id of ids) {
    const m = MODULES.find((x) => x.id === id);
    if (!m) return { ok: false, error: 'Unknown module ' + id };
    const was = isOn(state, m);
    if (turnOn) delete mods.off[id]; else mods.off[id] = true;
    // coming back on: let the module catch up with the present (schedules, seasons) instead of replaying days
    if (turnOn && !was && m.init) safe(ctx, m.id + '.init', () => m.init(state, ctx));
  }
  return { ok: true, on: turnOn };
}

function wrapEngine(engine, api) {
  for (const m of MODULES) if (m.wrapEngine) m.wrapEngine(engine, api);
}

module.exports = { MODULES, makeCtx, tick, snapshot, command, wrapEngine, isOn };
