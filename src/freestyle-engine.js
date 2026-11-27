'use strict';
// Freestyle division: sign freestylers, train them, earn followers and sponsor money with clips,
// and compete in judged freestyle tournaments (battle brackets) against a persistent pool of rivals.
const U = require('./util');

const ID = 'freestyle';
const LINK = 'xtcircuit';
const ROSTER_MAX = 3;
const OPEN_COST = 15000;
const MARKET_DAYS = 28;
const RIVALS = 28;
const FOCUS = ['tech', 'creat', 'content'];
const RISK = { safe: { mean: -3, sd: 3, bail: 0 }, balanced: { mean: 0, sd: 6, bail: 0.05 }, risky: { mean: 5, sd: 9, bail: 0.14 } };
const MOVES = ['flip-reset chains', 'ceiling flicks', 'air-roll double taps', 'wall-to-air dribbles', 'helicopter resets', 'directional air-roll shots', 'pogo dribbles', 'zap-dash combos', 'backboard redirects', 'stall resets'];
const COMPS = [
  { tier: 'C', every: 30, name: 'Freestyle Clash', pool: 1000, size: 8 },
  { tier: 'B', every: 70, offset: 20, name: 'Skyline Freestyle Open', pool: 5000, size: 8 },
  { tier: 'A', every: 140, offset: 55, name: 'Aerial Arts Cup', pool: 15000, size: 8 },
  { tier: 'S', every: 0, name: 'Freestyle World Showcase', pool: 40000, size: 8, invite: 8 },
];
const SYL = ['aero', 'flip', 'zap', 'nova', 'reset', 'sky', 'loop', 'ceil', 'spin', 'dash', 'volt', 'drift', 'wav', 'lux', 'kite', 'echo', 'blitz', 'orbit', 'pixel', 'ghost'];
const SUF = ['', 'z', 'y', 'x', 'o', 'er', 'ix', 'io', 'ex', 'ly'];

function ensure(state) {
  const x = U.xstate(state);
  let f = x.freestyle;
  if (!f || typeof f !== 'object') f = x.freestyle = { open: false, nextId: 1, roster: [], market: [], marketDay: '', rivals: [], events: [], log: [], trophies: [], season: null, viral: [] };
  for (const k of ['roster', 'market', 'rivals', 'events', 'log', 'trophies', 'viral']) if (!Array.isArray(f[k])) f[k] = [];
  return f;
}

const es = (ctx) => ctx && ctx.lang === 'es';
const econ = (state) => (state.economy === 'real' || state.real ? 1 : 40);
const round1 = (v) => Math.round(v * 10) / 10;

function takenNames(state, f) {
  const s = new Set(state.players.map((p) => String(p.name || '').toLowerCase()));
  for (const p of f.roster.concat(f.market, f.rivals)) s.add(String(p.name).toLowerCase());
  return s;
}
function genName(r, taken) {
  for (let i = 0; i < 30; i++) {
    let n = r.pick(SYL) + r.pick(SUF);
    if (r.chance(0.3)) n = n.charAt(0).toUpperCase() + n.slice(1);
    if (r.chance(0.25)) n += r.int(1, 99);
    if (!taken.has(n.toLowerCase())) { taken.add(n.toLowerCase()); return n; }
  }
  return 'fs' + r.int(100, 999);
}

function nations(state) {
  const t = U.userTeam(state);
  const n = state.players.filter((p) => p && p.nation && U.teamOf(state, p.teamId) && t && U.teamOf(state, p.teamId).region === t.region).map((p) => p.nation);
  return n.length ? n : ['Argentina'];
}

function genFreestyler(state, f, r, lo, hi, taken) {
  const base = r.int(lo, hi);
  const fs = {
    id: 'f' + (f.nextId++), name: genName(r, taken), nation: r.pick(nations(state)), age: r.int(16, 27),
    tech: U.clamp(base + r.int(-8, 8), 30, 97), creat: U.clamp(base + r.int(-8, 8), 30, 97), cons: U.clamp(base + r.int(-12, 6), 25, 95),
    hype: Math.round((500 + Math.pow(base / 10, 4) * (0.6 + r())) / 10) * 10,
    move: r.pick(MOVES), focus: 'tech', morale: 75, points: 0,
  };
  fs.wage = Math.round(((fs.tech + fs.creat) * 4 + fs.hype / 120) * econ(state) / 10) * 10;
  fs.fee = Math.round(((fs.tech + fs.creat) * 90 + fs.hype * 0.4) * econ(state) / 100) * 100;
  return fs;
}

const skill = (fs) => fs.tech * 0.45 + fs.creat * 0.45 + fs.cons * 0.1;

function refreshMarket(state, f, day) {
  const r = U.dayRng(state, ID, day, 'market');
  const taken = takenNames(state, f);
  f.market = [];
  for (let i = 0; i < 5; i++) f.market.push(genFreestyler(state, f, r, i === 0 ? 62 : 42, i === 0 ? 84 : 72, taken));
  f.marketDay = day;
}

function seedRivals(state, f) {
  if (f.rivals.length) return;
  const r = U.rng(U.careerKey(state) + '|fsrivals');
  const taken = takenNames(state, f);
  for (let i = 0; i < RIVALS; i++) f.rivals.push(genFreestyler(state, f, r, i < 6 ? 78 : 50, i < 6 ? 92 : 80, taken));
}

// ---------- schedule ----------
function schedule(state, f) {
  f.season = U.num(state.season);
  f.events = f.events.filter((e) => e.status !== 'done' && e.status !== 'upcoming');
  const evs = (state.events || []).filter((e) => e && e.startDate);
  const end = evs.reduce((m, e) => (String(e.endDate || e.startDate) > m ? String(e.endDate || e.startDate) : m), String(state.currentDate));
  const start = U.addDays(state.currentDate, 6);
  const span = U.daysBetween(start, end);
  const r = U.rng(U.careerKey(state) + '|fsplan|' + f.season);
  let n = 1;
  for (const c of COMPS) {
    const days = [];
    if (!c.every) { if (span > 20) days.push(U.addDays(end, -8)); } else for (let d = c.offset || 10; d < span - 5; d += c.every) days.push(U.addDays(start, d + r.int(-3, 3)));
    for (const d of days) {
      f.events.push({ id: 'fs' + f.season + '-' + n++, season: f.season, tier: c.tier, name: c.name + (c.every && c.every <= 30 ? ' #' + n : ''), date: d, pool: c.pool * econ(state), size: c.size, invite: c.invite || 0, status: 'upcoming', entries: null, risk: 'balanced', rounds: [], result: null });
    }
  }
  f.events.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- weekly ----------
function weekly(state, f, day, ctx) {
  const r = U.dayRng(state, ID, day, 'week');
  const team = U.userTeam(state);
  let income = 0; let wages = 0;
  for (const fs of f.roster) {
    const ageF = fs.age < 22 ? 1.2 : fs.age < 26 ? 1 : 0.7;
    const g = (k, foc) => { const cap = 99; const gain = (foc ? 0.9 : 0.25) * ageF * (1 - fs[k] / 110) * (0.6 + r()); fs[k] = round1(Math.min(cap, fs[k] + gain)); };
    g('tech', fs.focus === 'tech');
    g('creat', fs.focus === 'creat');
    fs.cons = round1(Math.min(97, fs.cons + 0.15 * (0.5 + r())));
    const views = fs.hype * (0.4 + fs.creat / 120) * (fs.focus === 'content' ? 2 : 1) * (0.6 + r() * 0.8);
    fs.hype = Math.round(fs.hype + views * 0.012);
    income += Math.round(fs.hype / 1000 * 22 * econ(state));
    wages += fs.wage;
    if (team) team.followers = Math.round(U.num(team.followers) + views * 0.0015);
    if (r.chance(fs.focus === 'content' ? 0.06 : 0.025)) {
      const boost = Math.round(fs.hype * (0.2 + r() * 0.4));
      fs.hype += boost;
      if (team) team.followers = Math.round(U.num(team.followers) + boost * 0.15);
      f.viral.unshift({ date: day, name: fs.name, move: fs.move, gain: boost });
      if (f.viral.length > 8) f.viral.length = 8;
      U.pushInbox(state, es(ctx) ? `¡Clip viral de ${fs.name}!` : `${fs.name} went viral!`,
        es(ctx) ? `Un clip de ${fs.name} con ${fs.move} explotó en redes: +${boost} de hype y nuevos seguidores para el club.` : `A clip of ${fs.name} pulling off ${fs.move} blew up: +${boost} hype and new followers for the club.`, LINK);
    }
    fs.age += 1 / 52;
  }
  for (const rv of f.rivals) { rv.tech = round1(Math.min(98, rv.tech + 0.12 * r())); rv.creat = round1(Math.min(98, rv.creat + 0.12 * r())); }
  if (f.roster.length) {
    U.earn(state, income);
    const pay = U.spend(state, wages);
    if (!pay.ok) for (const fs of f.roster) fs.morale = U.clamp(fs.morale - 8, 0, 100);
    f.lastWeek = { income, wages };
    if (Array.isArray(state.ledger) && income) state.ledger.push({ date: day, kind: 'sponsor', amount: income, note: 'Freestyle content' });
  }
}

// ---------- competitions ----------
function routine(fs, risk, r) {
  const R = RISK[risk] || RISK.balanced;
  if (r.chance(R.bail * (1.4 - fs.cons / 100))) return { score: round1(skill(fs) * 0.55), bail: true };
  const g = (r() + r() + r() - 1.5) * 2 * R.sd * (1.25 - fs.cons / 130);
  return { score: round1(U.clamp(skill(fs) + R.mean + g, 10, 105)), bail: false };
}

function lockEvent(state, f, ev, ctx) {
  const r = U.rng(U.careerKey(state) + '|fsfield|' + ev.id);
  let mine = [];
  if (f.open && f.roster.length) {
    if (ev.entries === null) mine = f.roster.slice().sort((a, b) => skill(b) - skill(a)).slice(0, 1).map((x) => x.id); // auto-enter the best one
    else mine = ev.entries.filter((id) => f.roster.some((x) => x.id === id));
  }
  if (ev.invite) {
    const all = f.rivals.concat(f.roster).sort((a, b) => b.points - a.points || skill(b) - skill(a)).slice(0, ev.invite).map((x) => x.id);
    mine = mine.filter((id) => all.includes(id));
  }
  const rivals = f.rivals.slice().sort((a, b) => (ev.tier === 'S' || ev.tier === 'A' ? skill(b) - skill(a) : r() - 0.5));
  const field = mine.map((id) => ({ id, mine: true }));
  for (const rv of rivals) { if (field.length >= ev.size) break; field.push({ id: rv.id, mine: false }); }
  ev.field = field;
  ev.entries = mine;
  ev.status = 'locked';
}

function byId(f, id) { return f.roster.find((x) => x.id === id) || f.rivals.find((x) => x.id === id) || null; }

function runEvent(state, f, ev, ctx) {
  const r = U.rng(U.careerKey(state) + '|fsrun|' + ev.id);
  let alive = ev.field.slice().sort(() => r() - 0.5);
  ev.rounds = [];
  while (alive.length > 1) {
    const rd = [];
    const next = [];
    for (let i = 0; i < alive.length; i += 2) {
      const a = alive[i]; const b = alive[i + 1];
      if (!b) { next.push(a); continue; }
      const fa = byId(f, a.id); const fb = byId(f, b.id);
      const ra = routine(fa, a.mine ? ev.risk : 'balanced', r);
      const rb = routine(fb, b.mine ? ev.risk : 'balanced', r);
      const w = ra.score >= rb.score ? a : b;
      rd.push({ a: fa.name, b: fb.name, sa: ra.score, sb: rb.score, ba: ra.bail, bb: rb.bail, w: (w === a ? fa : fb).name, mine: a.mine || b.mine });
      next.push(w);
    }
    ev.rounds.push(rd);
    alive = next;
  }
  const champ = byId(f, alive[0].id);
  ev.champion = champ.name;
  // places: 1 champion, 2 finalist, 3 semis, 5 quarters
  const placeOf = (fsId) => {
    const name = byId(f, fsId).name;
    const n = ev.rounds.length;
    if (name === champ.name) return 1;
    for (let k = n - 1; k >= 0; k--) if (ev.rounds[k].some((m) => (m.a === name || m.b === name) && m.w !== name)) return k === n - 1 ? 2 : k === n - 2 ? 3 : 5;
    return 5;
  };
  const PTS = { S: [400, 250, 150, 80], A: [200, 120, 70, 35], B: [90, 55, 30, 15], C: [40, 25, 12, 6] }[ev.tier];
  const SH = { 1: 0.5, 2: 0.25, 3: 0.1, 5: 0.0125 };
  for (const en of ev.field) {
    const fs = byId(f, en.id);
    const pl = placeOf(en.id);
    fs.points = U.num(fs.points) + PTS[pl === 1 ? 0 : pl === 2 ? 1 : pl === 3 ? 2 : 3];
  }
  const results = [];
  for (const en of ev.field.filter((x) => x.mine)) {
    const fs = byId(f, en.id);
    const pl = placeOf(en.id);
    const prize = Math.round(ev.pool * SH[pl]);
    U.earn(state, prize);
    if (prize && Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'prize', amount: prize, note: ev.name });
    fs.hype = Math.round(fs.hype * (1 + ({ S: 0.25, A: 0.12, B: 0.06, C: 0.03 }[ev.tier]) * (pl === 1 ? 1 : pl === 2 ? 0.5 : 0.2)));
    fs.morale = U.clamp(fs.morale + (pl === 1 ? 8 : pl === 2 ? 3 : pl === 3 ? 0 : -3), 0, 100);
    results.push({ name: fs.name, place: pl, prize });
    if (pl === 1) {
      f.trophies.unshift({ season: ev.season, date: state.currentDate, name: ev.name, tier: ev.tier, who: fs.name });
      const team = U.userTeam(state);
      if (team) team.followers = Math.round(U.num(team.followers) * (1 + ({ S: 2, A: 0.8, B: 0.3, C: 0.1 }[ev.tier]) / 100));
      if (ev.tier === 'S' || ev.tier === 'A') U.pushNews(state, ctx, ev.id, { category: 'club', teamId: state.userTeamId, headline: es(ctx) ? `${fs.name} gana el ${ev.name}` : `${fs.name} wins the ${ev.name}`, body: es(ctx) ? `El freestyler de ${(team && team.name) || ''} se impuso con ${fs.move}.` : `${(team && team.name) || ''}'s freestyler took the title with ${fs.move}.` });
    }
  }
  ev.result = results;
  ev.status = 'done';
  f.log.unshift({ season: ev.season, date: state.currentDate, name: ev.name, tier: ev.tier, champion: ev.champion, results });
  if (f.log.length > 30) f.log.length = 30;
  if (results.length) {
    U.pushInbox(state, es(ctx) ? `${ev.name}: resultados` : `${ev.name}: results`, results.map((x) => `${x.name}: ${x.place === 1 ? (es(ctx) ? 'campeón' : 'champion') : '#' + x.place}${x.prize ? ' (' + U.fmtMoney(x.prize) + ')' : ''}`).join(' · '), LINK);
  }
}

function dayStep(state, day, ctx) {
  const f = ensure(state);
  if (!f.marketDay || U.daysBetween(f.marketDay, day) >= MARKET_DAYS) refreshMarket(state, f, day);
  if (f.open && U.weekday(day) === 1) weekly(state, f, day, ctx);
  for (const ev of f.events) {
    if (ev.status === 'done') continue;
    const d = U.daysBetween(day, ev.date);
    if (ev.status === 'upcoming' && d <= 1) lockEvent(state, f, ev, ctx);
    if (ev.status === 'locked' && d <= 0) runEvent(state, f, ev, ctx);
  }
}

// ---------- lifecycle ----------
function init(state, ctx) {
  const f = ensure(state);
  seedRivals(state, f);
  if (!f.marketDay) refreshMarket(state, f, state.currentDate);
  if (f.season !== U.num(state.season)) schedule(state, f);
}
function onSeason(state, ctx) {
  const f = ensure(state);
  seedRivals(state, f);
  for (const rv of f.rivals) rv.points = Math.round(U.num(rv.points) * 0.4);
  for (const fs of f.roster) fs.points = Math.round(U.num(fs.points) * 0.4);
  schedule(state, f);
}
function onDay(state, day, ctx) { dayStep(state, day, ctx); }
function onTick(state, ctx) { const f = ensure(state); if (f.season !== U.num(state.season)) { seedRivals(state, f); schedule(state, f); } }

function command(state, cmd, ctx) {
  if (!ctx.manager) return { ok: false, error: 'Only available in manager careers.' };
  const f = ensure(state);
  if (cmd.op === 'open') {
    if (f.open) return { ok: false, error: 'Already open.' };
    const pay = U.spend(state, OPEN_COST * econ(state));
    if (!pay.ok) return pay;
    f.open = true;
    f.opened = state.currentDate;
    return { ok: true };
  }
  if (!f.open) return { ok: false, error: 'Open the freestyle division first.' };
  if (cmd.op === 'sign') {
    const fs = f.market.find((x) => x.id === cmd.id);
    if (!fs) return { ok: false, error: 'Not on the market any more.' };
    if (f.roster.length >= ROSTER_MAX) return { ok: false, error: `Roster full (${ROSTER_MAX}).` };
    const pay = U.spend(state, fs.fee);
    if (!pay.ok) return pay;
    f.market = f.market.filter((x) => x !== fs);
    fs.joined = state.currentDate;
    f.roster.push(fs);
    return { ok: true };
  }
  const fs = f.roster.find((x) => x.id === cmd.id);
  if (cmd.op === 'release') {
    if (!fs) return { ok: false, error: 'Unknown freestyler.' };
    f.roster = f.roster.filter((x) => x !== fs);
    fs.points = Math.round(U.num(fs.points) * 0.5);
    f.rivals.push(fs);
    return { ok: true };
  }
  if (cmd.op === 'focus') {
    if (!fs || !FOCUS.includes(cmd.value)) return { ok: false, error: 'Bad focus.' };
    fs.focus = cmd.value;
    return { ok: true };
  }
  if (cmd.op === 'entry') {
    const ev = f.events.find((e) => e.id === cmd.event);
    if (!ev || ev.status !== 'upcoming') return { ok: false, error: 'Entries are closed.' };
    if (cmd.risk) { if (!RISK[cmd.risk]) return { ok: false, error: 'Bad risk.' }; ev.risk = cmd.risk; }
    if (cmd.toggle) {
      const cur = ev.entries === null ? f.roster.slice().sort((a, b) => skill(b) - skill(a)).slice(0, 1).map((x) => x.id) : ev.entries.slice();
      const i = cur.indexOf(cmd.toggle);
      if (i === -1) { if (!f.roster.some((x) => x.id === cmd.toggle)) return { ok: false, error: 'Unknown freestyler.' }; cur.push(cmd.toggle); } else cur.splice(i, 1);
      ev.entries = cur;
    }
    return { ok: true };
  }
  return { ok: false, error: 'Unknown freestyle command.' };
}

function view(fs) {
  return { id: fs.id, name: fs.name, nation: fs.nation, age: Math.floor(fs.age), tech: Math.round(fs.tech), creat: Math.round(fs.creat), cons: Math.round(fs.cons), skill: Math.round(skill(fs)), hype: fs.hype, move: fs.move, focus: fs.focus, wage: fs.wage, fee: fs.fee, morale: Math.round(fs.morale), points: fs.points };
}

function snapshot(state, ctx) {
  const f = ensure(state);
  const ranking = f.rivals.concat(f.roster).slice().sort((a, b) => b.points - a.points || skill(b) - skill(a)).slice(0, 12).map((x) => ({ name: x.name, points: x.points, skill: Math.round(skill(x)), mine: f.roster.includes(x) }));
  const autoPick = f.roster.slice().sort((a, b) => skill(b) - skill(a)).slice(0, 1).map((x) => x.id);
  return {
    enabled: ctx.manager, open: f.open, openCost: OPEN_COST * econ(state), rosterMax: ROSTER_MAX,
    roster: f.roster.map(view), market: f.market.map(view),
    marketIn: Math.max(0, MARKET_DAYS - U.daysBetween(f.marketDay || state.currentDate, state.currentDate)),
    events: f.events.filter((e) => e.season === U.num(state.season)).map((e) => ({ id: e.id, tier: e.tier, name: e.name, date: e.date, inDays: U.daysBetween(state.currentDate, e.date), pool: e.pool, status: e.status, risk: e.risk, entries: e.entries === null ? autoPick : e.entries, auto: e.entries === null, invite: e.invite, rounds: e.rounds, champion: e.champion || null, result: e.result })),
    ranking, trophies: f.trophies.slice(0, 20), viral: f.viral.slice(0, 5), lastWeek: f.lastWeek || null,
  };
}

module.exports = { id: ID, init, onSeason, onDay, onTick, command, snapshot, _test: { ensure, refreshMarket, schedule, weekly, lockEvent, runEvent, routine, skill } };
