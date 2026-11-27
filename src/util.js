'use strict';
// Shared helpers for RL Career Extras modules (pure, no Electron).

function hashStr(s) {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// Deterministic RNG (mulberry32) so a given day always produces the same events.
function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashStr(seed);
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  return r;
}

function careerKey(state) {
  return [state.startDate, state.userTeamId, state.userPlayerId].join('|');
}

function dayRng(state, mod, day, extra) {
  return rng(careerKey(state) + '|' + mod + '|' + day + '|' + (extra || ''));
}

function parseDay(d) { return Date.parse(String(d) + 'T00:00:00Z'); }
function daysBetween(a, b) {
  const da = parseDay(a); const db = parseDay(b);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  return Math.round((db - da) / 86400000);
}
function addDays(d, n) {
  const t = parseDay(d);
  if (!Number.isFinite(t)) return d;
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}
function weekday(d) { const t = parseDay(d); return Number.isFinite(t) ? new Date(t).getUTCDay() : 0; }

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function isCareer(state) {
  return !!(state && typeof state === 'object' && Array.isArray(state.players) && Array.isArray(state.teams) && state.userTeamId != null);
}
function teamOf(state, id) {
  if (id == null) return null;
  return state.teams.find((t) => t && t.id === id)
    || ((state.intl && Array.isArray(state.intl.teams) ? state.intl.teams : []).find((t) => t && t.id === id)) || null;
}
function playerOf(state, id) { return state.players.find((p) => p && p.id === id) || null; }
function userTeam(state) { return teamOf(state, state.userTeamId); }
function rosterPlayers(state) {
  const t = userTeam(state);
  return t ? (t.playerIds || []).map((id) => playerOf(state, id)).filter((p) => p && !p.retired) : [];
}

function xstate(state) {
  if (!state.xtra || typeof state.xtra !== 'object') state.xtra = { v: 1 };
  return state.xtra;
}

function fmtMoney(n) {
  const v = Math.round(num(n));
  const a = Math.abs(v);
  const s = a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M' : a >= 1e3 ? (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(a);
  return (v < 0 ? '-$' : '$') + s;
}

function spend(state, amount) {
  const t = userTeam(state);
  if (!t) return { ok: false, error: 'No club.' };
  const a = Math.round(num(amount));
  if (num(t.budget) < a) return { ok: false, error: 'Not enough budget (' + fmtMoney(a) + ' needed).' };
  t.budget = Math.round(num(t.budget) - a);
  return { ok: true };
}
function earn(state, amount) {
  const t = userTeam(state);
  if (t) t.budget = Math.round(num(t.budget) + num(amount));
}

// Native Hub inbox message. Type "board" never blocks advancing days.
function pushInbox(state, title, body, link) {
  if (!Array.isArray(state.inbox)) return;
  state.nextId = num(state.nextId) + 1;
  state.inbox.push({ id: state.nextId, date: state.currentDate, unread: true, resolved: false, type: 'board', title: String(title), body: String(body), link: link || 'inbox' });
}

// Engine-aware morale change (uses the Hub's ego scaling when available).
function moraleDelta(engine, p, delta) {
  if (!p || !delta) return;
  if (engine && typeof engine.adjustMorale === 'function') {
    try { engine.adjustMorale(p, delta); return; } catch { /* fall through */ }
  }
  p.morale = clamp(Math.round((num(p.morale == null ? 70 : p.morale) + delta) * 10) / 10, 0, 100);
}

// Native Hub news item ({ category, teamId, headline, body }).
function pushNews(state, ctx, key, item) {
  try {
    if (ctx && ctx.engine && typeof ctx.engine.pushNews === 'function') ctx.engine.pushNews(state, rng(careerKey(state) + '|news|' + key), item);
  } catch (e) { if (ctx && ctx.log) ctx.log('pushNews err: ' + e.message); }
}

// Native Hub chat thread with a player (shows up in the Hub's own messages).
function chatThread(state, playerId) {
  if (!Array.isArray(state.chats)) return null;
  let th = state.chats.find((c) => c && c.playerId === playerId);
  if (!th) {
    th = { playerId, unread: 0, lastDate: state.currentDate, topicDates: {}, variants: {}, lastContact: state.currentDate, pending: null, listedNoticeActive: false, startRun: 0, matchDate: null, recalled: false, messages: [] };
    state.chats.push(th);
  }
  if (!Array.isArray(th.messages)) th.messages = [];
  return th;
}
function chatPush(state, playerId, from, text) {
  const th = chatThread(state, playerId);
  if (!th) return;
  th.messages.push({ from, text: String(text), date: state.currentDate });
  if (th.messages.length > 30) th.messages.splice(0, th.messages.length - 30);
  th.lastDate = state.currentDate;
}

// ---------- Y (the Hub's social network: state.social.posts, newest first) ----------
function handleOf(name) {
  const h = String(name || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  return h || 'user' + (hashStr(name) % 9999);
}
// Engagement scales with the author's reach, like the Hub's own posts.
function engagement(r, followers, hype) {
  const f = Math.max(200, num(followers));
  const views = Math.round(f * (0.05 + r() * 0.12) * (hype || 1) + 80);
  const likes = Math.round(views * (0.02 + r() * 0.05));
  return { views, likes, reposts: Math.round(likes * (0.06 + r() * 0.12)), replies: Math.round(likes * (0.04 + r() * 0.08)) };
}
// post: { kind: 'player'|'club'|'media'|'fan', player?, team?, name?, handle?, followers?, verified?, text, hype?, targetId? }
function yPost(state, r, post) {
  if (!state || !post || !post.text) return null;
  if (!state.social || typeof state.social !== 'object') state.social = { posts: [], prompt: null };
  if (!Array.isArray(state.social.posts)) state.social.posts = [];
  const pl = post.player || null;
  const tm = post.team || (pl ? teamOf(state, pl.teamId) : null);
  let name = post.name;
  let followers = post.followers;
  let authorId = -1;
  if (post.kind === 'player' && pl) { name = name || pl.name; followers = followers != null ? followers : num(pl.followers); authorId = pl.id; }
  if (post.kind === 'club' && tm) { name = name || tm.name; followers = followers != null ? followers : num(tm.followers); }
  if (post.kind === 'media') authorId = -50;
  followers = Math.max(50, Math.round(num(followers) || 800));
  state.nextId = num(state.nextId) + 1;
  const item = Object.assign({
    id: state.nextId,
    date: state.currentDate,
  }, engagement(r, followers, post.hype), {
    kind: post.kind || 'fan',
    authorId,
    name: String(name || 'RL Fan'),
    handle: post.handle || handleOf(name),
    club: post.club != null ? post.club : tm ? tm.name : '',
    followers,
    verified: post.verified != null ? !!post.verified : followers > 20000,
    text: String(post.text),
    xt: post.tag || true,
  });
  if (tm && post.kind !== 'fan') item.clubId = tm.id;
  if (post.kind === 'fan') item.viewer = true;
  if (post.targetId != null) { item.targetId = post.targetId; item.mention = true; }
  state.social.posts.unshift(item);
  return item;
}

function isManager(engine, state) {
  try { return !(engine && typeof engine.isPlayerCareer === 'function' && engine.isPlayerCareer(state)); } catch { return true; }
}

module.exports = { hashStr, rng, dayRng, careerKey, daysBetween, addDays, weekday, clamp, num, isCareer, teamOf, playerOf, userTeam, rosterPlayers, xstate, fmtMoney, spend, earn, pushInbox, pushNews, chatThread, chatPush, moraleDelta, isManager, handleOf, yPost };
