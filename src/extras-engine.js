'use strict';
// Quality-of-life settings for a career, written for RL Career Extras:
//  - free auto-training: fills the training plan with the players who can still grow (optionally skipping the ones
//    at their potential) and catches up on sessions missed during multi-day simulations;
//  - inbox filters: categories of messages that are marked as read automatically;
//  - profile title: one of the titles your player has won, shown next to your name in the add-on;
//  - performance mode during real matches (applied by the Hub process, see inproc.js).
// Theme and pop-up settings live in the window (ui-common.js), since they only change how things look.
const U = require('./util');
const Perks = require('./perks');

const ID = 'extras';
const COOLDOWN = 7;
const SLOTS = 5;
const INBOX_KINDS = {
  extras: (m) => m.type === 'board' && /^xt/.test(String(m.link || '')),
  news: (m) => m.type === 'news',
  promises: (m) => /^promise_/.test(String(m.type || '')),
  scouting: (m) => m.type === 'scout_report',
  transfers: (m) => /^(transfer_|offer_|contract_)/.test(String(m.type || '')),
};
const TITLE_NAMES = {
  en: { worlds_champion: 'World Champion', worlds_contender: 'Worlds contender', major_champion: 'Major Champion', major_contender: 'Major contender', regional_champion: 'Regional Champion', contender: 'RLCS contender', challenger: 'RLCS challenger', solo_champion: '1v1 Champion', world_cup: 'World Cup Champion' },
  es: { worlds_champion: 'Campeón del Mundo', worlds_contender: 'Mundialista', major_champion: 'Campeón de Major', major_contender: 'Jugó un Major', regional_champion: 'Campeón regional', contender: 'Contender RLCS', challenger: 'Challenger RLCS', solo_champion: 'Campeón 1v1', world_cup: 'Campeón de la Copa del Mundo' },
};

function ensure(state) {
  state.xtra = state.xtra || {};
  const x = state.xtra.extras || (state.xtra.extras = {});
  x.autotrain = Object.assign({ on: false, skipCapped: true, catchUp: true, sessions: 0 }, x.autotrain || {});
  x.inbox = Object.assign({ extras: false, news: false, promises: false, scouting: false, transfers: false }, x.inbox || {});
  x.perf = x.perf !== false;
  return x;
}

// ---------- auto-training ----------
function room(p) { return U.num(p.potential) - U.num(p.ratingExact != null ? p.ratingExact : p.rating); }
function fillPlan(state, eng, skipCapped) {
  if (typeof eng.trainableIds !== 'function' || typeof eng.setTrainingSlot !== 'function') return false;
  let list = eng.trainableIds(state).map((id) => U.playerOf(state, id)).filter(Boolean);
  if (skipCapped) list = list.filter((p) => room(p) > 0.05);
  if (!list.length) return false;
  // most room to grow first, then the youngest
  list.sort((a, b) => room(b) - room(a) || U.num(a.age) - U.num(b.age));
  for (let i = 0; i < SLOTS; i++) eng.setTrainingSlot(state, i, list[i % list.length].id, null);
  return true;
}
function autoTrain(state, ctx) {
  const x = ensure(state);
  const eng = ctx.engine;
  const want = x.autotrain.on || Perks.perk(state, 'assistant', 'autoTrain');
  if (!want || !eng || typeof eng.trainingReady !== 'function' || typeof eng.runTraining !== 'function') return 0;
  if (eng.isPlayerCareer && eng.isPlayerCareer(state)) return 0;
  const t = state.training || {};
  // sessions missed while several days were simulated at once (one per cooldown), three at most
  let missed = 1;
  if (x.autotrain.catchUp && t.lastDate) missed = U.clamp(Math.floor(U.daysBetween(t.lastDate, state.currentDate) / COOLDOWN), 1, 3);
  let ran = 0;
  for (let i = 0; i < missed; i++) {
    if (i > 0) t.lastDate = U.addDays(state.currentDate, -60); // make the extra session available
    if (!eng.trainingReady(state)) break;
    if (!fillPlan(state, eng, x.autotrain.skipCapped)) break;
    // the Hub draws some of a session's details at random: give it a generator seeded by career and day
    const r = eng.runTraining(state, U.dayRng(state, ID, state.currentDate, 'train' + i));
    if (!r || !r.ok) break;
    ran++;
  }
  if (ran) {
    x.autotrain.sessions += ran;
    x.autotrain.last = state.currentDate;
  }
  return ran;
}

// ---------- inbox filters ----------
function filterInbox(state) {
  const x = ensure(state);
  const on = Object.keys(INBOX_KINDS).filter((k) => x.inbox[k]);
  if (!on.length || !Array.isArray(state.inbox)) return 0;
  let n = 0;
  for (const m of state.inbox) {
    if (!m || !m.unread) continue;
    // never hide something that still needs an answer
    if (m.needsReply || m.resolved === false && /^(offer_in|contract_expiring)$/.test(String(m.type))) continue;
    if (on.some((k) => INBOX_KINDS[k](m))) { m.unread = false; n++; }
  }
  return n;
}

function init(state) { ensure(state); }
function onTick(state, ctx) {
  try { autoTrain(state, ctx); } catch (e) { ctx.log('auto-train: ' + e.message); }
  filterInbox(state);
}

function titlesOf(state, lang) {
  const me = state.players.find((p) => p && p.isUser);
  const N = TITLE_NAMES[lang === 'es' ? 'es' : 'en'];
  return ((me && me.titles) || []).map((t, i) => ({ i, k: t.k, y: t.y, host: t.h || null, name: (N[t.k] || String(t.k).replace(/_/g, ' ')) + ' ' + t.y + (t.h ? ' · ' + t.h : '') }));
}

function command(state, cmd, ctx) {
  const x = ensure(state);
  const es = ctx.lang === 'es';
  if (cmd.op === 'autotrain') {
    for (const k of ['on', 'skipCapped', 'catchUp']) if (cmd[k] !== undefined) x.autotrain[k] = !!cmd[k];
    const ran = x.autotrain.on ? autoTrain(state, ctx) : 0;
    return { ok: true, ran };
  }
  if (cmd.op === 'inbox') {
    if (!INBOX_KINDS[cmd.kind]) return { ok: false, error: 'Unknown category.' };
    x.inbox[cmd.kind] = !!cmd.value;
    return { ok: true, cleared: filterInbox(state) };
  }
  if (cmd.op === 'perf') { x.perf = !!cmd.value; return { ok: true }; }
  if (cmd.op === 'title') {
    const list = titlesOf(state, ctx.lang);
    if (cmd.index == null || cmd.index === '') { delete x.title; return { ok: true }; }
    const t = list.find((v) => v.i === Number(cmd.index));
    if (!t) return { ok: false, error: es ? 'Ese título no es tuyo.' : 'You have not won that title.' };
    x.title = { k: t.k, y: t.y, host: t.host };
    return { ok: true, name: t.name };
  }
  return { ok: false, error: 'Unknown extras command.' };
}

function profileTitle(state, lang) {
  const x = state && state.xtra && state.xtra.extras;
  if (!x || !x.title) return null;
  const N = TITLE_NAMES[lang === 'es' ? 'es' : 'en'];
  return (N[x.title.k] || x.title.k) + ' ' + x.title.y;
}

function snapshot(state, ctx) {
  const x = ensure(state);
  const me = state.players.find((p) => p && p.isUser);
  return {
    autotrain: x.autotrain, assistantAuto: !!Perks.perk(state, 'assistant', 'autoTrain'), inbox: x.inbox, perf: x.perf,
    me: me ? me.name : null, titles: titlesOf(state, ctx.lang), title: profileTitle(state, ctx.lang),
    manager: !(ctx.engine && typeof ctx.engine.isPlayerCareer === 'function' && ctx.engine.isPlayerCareer(state)),
  };
}

module.exports = { id: ID, init, onTick, command, snapshot, profileTitle, _test: { autoTrain, filterInbox, fillPlan } };
