'use strict';
// Academy (cantera) + B team + Development League.
// Prospects live in state.xtra.academy until promoted; only then do they become real Hub players.
const U = require('./util');

const ID = 'academy';
const LINK = 'xtacademy';
const LEVELS = [
  null,
  { upgrade: 0, upkeep: 400, slots: 8, intake: 3, potBonus: 0, growth: 1.0 },
  { upgrade: 40000, upkeep: 900, slots: 10, intake: 4, potBonus: 4, growth: 1.15 },
  { upgrade: 120000, upkeep: 1800, slots: 12, intake: 5, potBonus: 8, growth: 1.3 },
];
const B_MAX = 4;
const ACADEMY_MAX_AGE = 18;
const B_MAX_AGE = 21;
const TRIAL_COST = 15000;
const TRIAL_COOLDOWN = 30;
const INTENSITY = { light: { growth: 0.75, morale: 2 }, normal: { growth: 1, morale: 0 }, intense: { growth: 1.3, morale: -3 } };
const STYLES = ['striker', 'playmaker', 'anchor'];

const SYL_A = ['ze', 'kai', 'vex', 'ryn', 'lu', 'mo', 'tak', 'nix', 'sol', 'fyr', 'jax', 'eli', 'dro', 'kyo', 'ari', 'bly', 'cru', 'dax', 'gho', 'hex', 'iro', 'jun', 'kez', 'lyx', 'mav', 'nox', 'oki', 'pax', 'quin', 'rho', 'sky', 'tov', 'umi', 'vyn', 'wex', 'yuk', 'zor', 'bren', 'cael', 'dusk'];
const SYL_B = ['', '', 'o', 'ix', 'en', 'yy', 'z', 'ster', 'ito', 'ky', 'on', 'ro', 'x', 'ie', 'ah', 'us', 'el', 'ra', 'ux', 'iz'];

function genName(r, taken) {
  for (let i = 0; i < 20; i++) {
    let n = r.pick(SYL_A) + r.pick(SYL_B);
    if (r.chance(0.25)) n += r.pick(SYL_A).slice(0, 2);
    if (r.chance(0.2)) n += r.int(1, 99);
    if (r.chance(0.35)) n = n.charAt(0).toUpperCase() + n.slice(1);
    if (!taken.has(n.toLowerCase())) return n;
  }
  return 'Prospect' + r.int(100, 999);
}

function ensure(state) {
  const x = U.xstate(state);
  let a = x.academy;
  if (!a || typeof a !== 'object') {
    a = x.academy = { level: 1, intensity: 'normal', nextId: 1, prospects: [], league: null, trophies: [], lastTrial: '', unpaid: false, history: [] };
  }
  if (!Array.isArray(a.prospects)) a.prospects = [];
  if (!Array.isArray(a.trophies)) a.trophies = [];
  if (!Array.isArray(a.history)) a.history = [];
  if (!LEVELS[a.level]) a.level = 1;
  if (!INTENSITY[a.intensity]) a.intensity = 'normal';
  return a;
}

function regionNations(state) {
  const t = U.userTeam(state);
  const nats = [];
  for (const p of state.players) {
    if (!p || !p.nation) continue;
    const pt = U.teamOf(state, p.teamId);
    if (pt && t && pt.region === t.region) nats.push(p.nation);
  }
  return nats.length ? nats : ['Argentina'];
}

function takenNames(state, a) {
  const s = new Set(state.players.map((p) => String(p.name || '').toLowerCase()));
  for (const p of a.prospects) s.add(String(p.name).toLowerCase());
  return s;
}

function genProspect(state, a, r, opts) {
  const LV = LEVELS[a.level];
  const age = (opts && opts.age) || r.int(14, 16);
  let pot = r.int(58, 84) + LV.potBonus + (r.chance(0.08) ? r.int(5, 10) : 0) + ((opts && opts.potBonus) || 0);
  pot = U.clamp(pot, 55, 96);
  const rating = U.clamp(38 + r() * 12 + (age - 14) * 3 + (pot - 70) * 0.15, 35, pot - 4);
  return {
    id: 'p' + (a.nextId++),
    name: genName(r, takenNames(state, a)),
    nation: r.pick(regionNations(state)),
    age,
    rating: Math.round(rating * 100) / 100,
    pot,
    seed: r.int(0, 999),
    style: r.pick(STYLES),
    peakAge: r.int(20, 24),
    morale: 75,
    squad: 'academy',
    joined: state.currentDate,
    weeks: 0,
    played: false,
    stats: { games: 0, wins: 0, goals: 0, assists: 0, saves: 0, mvps: 0 },
  };
}

function intake(state, a, r, n) {
  const LV = LEVELS[a.level];
  const free = LV.slots - a.prospects.filter((p) => p.squad === 'academy').length;
  const k = Math.max(0, Math.min(n, free));
  const names = [];
  for (let i = 0; i < k; i++) {
    const p = genProspect(state, a, r);
    a.prospects.push(p);
    names.push(p.name);
  }
  return names;
}

// ---------- Development League ----------
function makeLeague(state, r) {
  const t = U.userTeam(state);
  const rivals = state.teams
    .filter((x) => x && x.id !== state.userTeamId && (!t || x.region === t.region))
    .slice();
  for (let i = rivals.length - 1; i > 0; i--) { const j = r.int(0, i); [rivals[i], rivals[j]] = [rivals[j], rivals[i]]; }
  const teams = [{ id: 'B', name: ((t && (t.abbrev || t.name)) || 'Club') + ' B', strength: 0, mine: true }];
  for (const rv of rivals.slice(0, 7)) teams.push({ id: 'r' + rv.id, name: (rv.abbrev || rv.name) + ' Academy', strength: r.int(43, 57) });
  let k = 1;
  while (teams.length < 8) teams.push({ id: 'x' + k, name: 'Academy ' + (k++), strength: r.int(43, 55) });
  // circle method, double round robin
  const ids = teams.map((x) => x.id);
  const rounds = [];
  const arr = ids.slice();
  for (let rd = 0; rd < arr.length - 1; rd++) {
    const pairs = [];
    for (let i = 0; i < arr.length / 2; i++) pairs.push(rd % 2 ? [arr[i], arr[arr.length - 1 - i]] : [arr[arr.length - 1 - i], arr[i]]);
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  const second = rounds.map((pairs) => pairs.map(([h, w]) => [w, h]));
  const table = {};
  for (const id of ids) table[id] = { w: 0, l: 0, gw: 0, gl: 0 };
  return {
    season: U.num(state.season),
    teams,
    rounds: rounds.concat(second).map((pairs) => pairs.map(([home, away]) => ({ home, away, hw: null, aw: null }))),
    round: 0,
    table,
    done: false,
    champion: null,
  };
}

function bStrength(a) {
  const b = a.prospects.filter((p) => p.squad === 'b').sort((x, y) => y.rating - x.rating).slice(0, 3);
  const vals = b.map((p) => p.rating * (0.9 + 0.1 * (p.morale / 100)));
  while (vals.length < 3) vals.push(42);
  return { lineup: b, s: vals.reduce((s, v) => s + v, 0) / 3 };
}

function simSeries(sa, sb, r) {
  const p = 1 / (1 + Math.exp(-(sa - sb) / 5));
  let aw = 0;
  let bw = 0;
  const games = [];
  while (aw < 3 && bw < 3) {
    const aWin = r() < p;
    const wg = r.int(1, 5);
    const lg = r.int(0, wg - 1);
    games.push(aWin ? [wg, lg] : [lg, wg]);
    if (aWin) aw++; else bw++;
  }
  return { aw, bw, games };
}

function creditStats(lineup, games, mineHome, won, r) {
  if (!lineup.length) return;
  const w = lineup.map((p) => Math.max(1, p.rating - 30));
  const tot = w.reduce((s, v) => s + v, 0);
  const pickW = () => { let x = r() * tot; for (let i = 0; i < lineup.length; i++) { x -= w[i]; if (x <= 0) return lineup[i]; } return lineup[lineup.length - 1]; };
  for (const p of lineup) { p.stats.games += games.length; p.played = true; }
  for (const g of games) {
    const mine = mineHome ? g[0] : g[1];
    const theirs = mineHome ? g[1] : g[0];
    for (let i = 0; i < mine; i++) {
      const sc = pickW();
      sc.stats.goals++;
      if (r.chance(0.6) && lineup.length > 1) { let as = pickW(); if (as === sc) as = lineup.find((x) => x !== sc); as.stats.assists++; }
    }
    for (const p of lineup) p.stats.saves += r.int(0, Math.min(3, theirs + 1));
    if (mine > theirs) for (const p of lineup) p.stats.wins++;
  }
  if (won) {
    const mvp = lineup.slice().sort((x, y) => (y.stats.goals + y.stats.assists) - (x.stats.goals + x.stats.assists))[0];
    if (mvp) mvp.stats.mvps++;
  }
}

function playRound(state, a, r, ctx) {
  const L = a.league;
  if (!L || L.done) return;
  const round = L.rounds[L.round];
  if (!round) return;
  const mine = bStrength(a);
  const str = (id) => (id === 'B' ? mine.s : (L.teams.find((t) => t.id === id) || {}).strength || 50);
  for (const m of round) {
    const res = simSeries(str(m.home), str(m.away), r);
    m.hw = res.aw; m.aw = res.bw;
    const hT = L.table[m.home]; const aT = L.table[m.away];
    const hWon = res.aw > res.bw;
    hT[hWon ? 'w' : 'l']++; aT[hWon ? 'l' : 'w']++;
    hT.gw += res.aw; hT.gl += res.bw; aT.gw += res.bw; aT.gl += res.aw;
    if (m.home === 'B' || m.away === 'B') {
      const mineHome = m.home === 'B';
      creditStats(mine.lineup, res.games, mineHome, mineHome ? hWon : !hWon, r);
    }
  }
  // rivals drift a little through the season
  for (const t of L.teams) if (!t.mine) t.strength = U.clamp(t.strength + (r() - 0.45) * 0.5, 40, 66);
  L.round++;
  if (L.round >= L.rounds.length) {
    L.done = true;
    const order = standings(L);
    L.champion = order[0].id;
    const myPos = order.findIndex((x) => x.id === 'B') + 1;
    a.history.push({ season: L.season, pos: myPos, w: L.table.B.w, l: L.table.B.l });
    const es = ctx.lang === 'es';
    if (L.champion === 'B') {
      a.trophies.push({ season: L.season, name: 'Development League', date: state.currentDate });
      U.pushInbox(state, es ? '¡El Equipo B es campeón!' : 'The B team are champions!',
        es ? `El Equipo B ganó la Liga de Desarrollo (${L.table.B.w}-${L.table.B.l}). Los juveniles ganan confianza.` : `The B team won the Development League (${L.table.B.w}-${L.table.B.l}). The kids are full of confidence.`, LINK);
      for (const p of a.prospects) p.morale = U.clamp(p.morale + 10, 0, 100);
    } else {
      U.pushInbox(state, es ? 'Terminó la Liga de Desarrollo' : 'Development League finished',
        es ? `El Equipo B terminó ${myPos}º de ${L.teams.length}.` : `The B team finished ${myPos}${['st', 'nd', 'rd'][myPos - 1] || 'th'} of ${L.teams.length}.`, LINK);
    }
  }
}

function standings(L) {
  return L.teams
    .map((t) => ({ id: t.id, name: t.name, mine: !!t.mine, ...L.table[t.id] }))
    .sort((x, y) => y.w - x.w || (y.gw - y.gl) - (x.gw - x.gl) || y.gw - x.gw);
}

// ---------- weekly development ----------
function weekly(state, a, day, ctx) {
  const LV = LEVELS[a.level];
  const r = U.dayRng(state, ID, day);
  const pay = U.spend(state, LV.upkeep);
  a.unpaid = !pay.ok;
  const inten = INTENSITY[a.unpaid ? 'light' : a.intensity];
  playRound(state, a, r, ctx);
  const es = ctx.lang === 'es';
  for (const p of a.prospects) {
    const room = p.pot - p.rating;
    const ageF = p.age <= 16 ? 1.1 : p.age <= 18 ? 1 : 0.8;
    const moraleF = 0.7 + 0.3 * (p.morale / 100);
    let d = (0.18 + 0.06 * a.level) * LV.growth * inten.growth * ageF * moraleF * U.clamp(room / 15, 0.1, 1.2);
    if (p.played) d += 0.12;
    if (a.unpaid) d *= 0.5;
    d *= 0.8 + r() * 0.4;
    p.rating = Math.round(Math.min(p.pot, p.rating + Math.max(0, d)) * 100) / 100;
    p.morale = U.clamp(p.morale + inten.morale + (p.played ? 1 : 0) + (r() - 0.5) * 2, 10, 100);
    p.played = false;
    p.weeks++;
    if (!p.readyNotified && p.rating >= 70) {
      p.readyNotified = true;
      U.pushInbox(state, es ? `${p.name} está listo` : `${p.name} is ready`,
        es ? `El juvenil ${p.name} (${p.age}) llegó a ${Math.floor(p.rating)} de nivel. Ya puede competir con el primer equipo.` : `Academy prospect ${p.name} (${p.age}) reached a ${Math.floor(p.rating)} rating and is ready for first-team action.`, LINK);
    }
  }
}

// The B team needs 3 players to compete: top it up with the oldest academy kids.
function fillB(a) {
  const moved = [];
  const pool = a.prospects.filter((p) => p.squad === 'academy').sort((x, y) => y.age - x.age || y.rating - x.rating);
  while (a.prospects.filter((p) => p.squad === 'b').length < 3 && pool.length) {
    const p = pool.shift();
    p.squad = 'b';
    moved.push(p.name);
  }
  return moved;
}

// ---------- lifecycle ----------
function init(state, ctx) {
  const a = ensure(state);
  if (!a.prospects.length && !a.seeded) {
    a.seeded = true;
    intake(state, a, U.dayRng(state, ID, state.currentDate, 'seed'), LEVELS[a.level].intake + 2);
  }
  fillB(a);
  if (!a.league) a.league = makeLeague(state, U.dayRng(state, ID, state.currentDate, 'league'));
}

function onSeason(state, ctx) {
  const a = ensure(state);
  const r = U.dayRng(state, ID, state.currentDate, 'season');
  const es = ctx.lang === 'es';
  const gone = [];
  for (const p of a.prospects.slice()) {
    p.age++;
    p.stats = { games: 0, wins: 0, goals: 0, assists: 0, saves: 0, mvps: 0 };
    if (p.squad === 'academy' && p.age > ACADEMY_MAX_AGE) {
      if (a.prospects.filter((x) => x.squad === 'b').length < B_MAX) p.squad = 'b';
      else { a.prospects.splice(a.prospects.indexOf(p), 1); gone.push(p.name); }
    } else if (p.squad === 'b' && p.age > B_MAX_AGE) {
      a.prospects.splice(a.prospects.indexOf(p), 1); gone.push(p.name);
    }
  }
  const names = intake(state, a, r, LEVELS[a.level].intake);
  fillB(a);
  a.league = makeLeague(state, r);
  if (names.length) {
    U.pushInbox(state, es ? 'Nueva camada en la cantera' : 'New academy intake',
      (es ? `Se suman a la cantera: ${names.join(', ')}.` : `Joining the academy: ${names.join(', ')}.`) +
      (gone.length ? (es ? `\n\nSe fueron por edad: ${gone.join(', ')}.` : `\n\nLeft for age reasons: ${gone.join(', ')}.`) : ''), LINK);
  }
}

function onDay(state, day, ctx) {
  if (!ctx.manager) return;
  const a = ensure(state);
  if (U.weekday(day) === 1) weekly(state, a, day, ctx);
}

// ---------- commands ----------
function rosterMax(ctx) { return (ctx.engine && Number(ctx.engine.ROSTER_MAX)) || 6; }

function makePlayer(state, p, ctx) {
  const team = U.userTeam(state);
  const tmpl = U.rosterPlayers(state).find((x) => !x.isUser) || {};
  const rating = U.clamp(p.rating, 40, 99);
  const pl = {
    id: (state.nextId = U.num(state.nextId) + 1),
    name: p.name,
    teamId: state.userTeamId,
    rating: Math.floor(rating),
    age: p.age,
    form: 0,
    isUser: false,
    nation: p.nation,
    retired: false,
    absence: null,
    morale: U.clamp(Math.round(p.morale), 50, 100),
    moraleStage: 'happy',
    wantsOut: false,
    refusing: false,
    benchedRun: 0,
    peakAge: Math.max(p.peakAge, p.age + 1),
    contractSeasons: 3,
    season: { games: 0, goals: 0, assists: 0, saves: 0, shots: 0, mvps: 0, wins: 0, losses: 0 },
    career: { games: 0, goals: 0, assists: 0, saves: 0, shots: 0, mvps: 0, wins: 0, losses: 0 },
    potential: Math.max(Math.floor(rating), p.pot),
    followers: 300 + Math.round(p.stats.goals * 25),
    ratingExact: rating,
    wage: 100,
    titles: [],
    xtAcademy: true,
  };
  if (tmpl.econ) pl.econ = tmpl.econ;
  if (team && team.region) pl.home = team.region;
  try { if (ctx.engine && typeof ctx.engine.wageFor === 'function') pl.wage = Math.max(1, Math.round(ctx.engine.wageFor(pl, state)) || 100); } catch { /* keep default */ }
  return pl;
}

function sellFee(p) {
  return Math.round((Math.pow(Math.max(0, p.rating - 40), 2) * 35 + Math.max(0, p.pot - p.rating) * 1500 + 2000) / 500) * 500;
}

function command(state, cmd, ctx) {
  if (!ctx.manager) return { ok: false, error: 'The academy is only available in manager careers.' };
  const a = ensure(state);
  const p = cmd.id ? a.prospects.find((x) => x.id === cmd.id) : null;
  const es = ctx.lang === 'es';
  switch (cmd.op) {
    case 'intensity':
      if (!INTENSITY[cmd.value]) return { ok: false, error: 'Bad intensity.' };
      a.intensity = cmd.value;
      return { ok: true };
    case 'upgrade': {
      const next = LEVELS[a.level + 1];
      if (!next) return { ok: false, error: 'Academy already at max level.' };
      const pay = U.spend(state, next.upgrade);
      if (!pay.ok) return pay;
      a.level++;
      return { ok: true };
    }
    case 'trial': {
      if (a.lastTrial && U.daysBetween(a.lastTrial, state.currentDate) < TRIAL_COOLDOWN) return { ok: false, error: 'Trials were held recently.' };
      if (a.prospects.filter((x) => x.squad === 'academy').length >= LEVELS[a.level].slots) return { ok: false, error: 'The academy is full.' };
      const pay = U.spend(state, TRIAL_COST);
      if (!pay.ok) return pay;
      a.lastTrial = state.currentDate;
      const np = genProspect(state, a, U.dayRng(state, ID, state.currentDate, 'trial' + a.nextId), { potBonus: 3 });
      a.prospects.push(np);
      return { ok: true, name: np.name };
    }
    case 'to_b':
      if (!p) return { ok: false, error: 'Prospect not found.' };
      if (a.prospects.filter((x) => x.squad === 'b').length >= B_MAX) return { ok: false, error: 'The B team is full (' + B_MAX + ').' };
      p.squad = 'b';
      return { ok: true };
    case 'to_academy':
      if (!p) return { ok: false, error: 'Prospect not found.' };
      if (p.age > ACADEMY_MAX_AGE) return { ok: false, error: 'Too old for the academy.' };
      if (a.prospects.filter((x) => x.squad === 'academy').length >= LEVELS[a.level].slots) return { ok: false, error: 'The academy is full.' };
      p.squad = 'academy';
      return { ok: true };
    case 'promote': {
      if (!p) return { ok: false, error: 'Prospect not found.' };
      const team = U.userTeam(state);
      if (!team) return { ok: false, error: 'No club.' };
      if ((team.playerIds || []).length >= rosterMax(ctx)) return { ok: false, error: es ? 'La plantilla está llena.' : 'The first-team roster is full.' };
      const pl = makePlayer(state, p, ctx);
      state.players.push(pl);
      team.playerIds.push(pl.id);
      a.prospects.splice(a.prospects.indexOf(p), 1);
      a.graduates = (a.graduates || []).concat([{ pid: pl.id, name: pl.name, date: state.currentDate, rating: pl.rating }]);
      U.pushInbox(state, es ? `${pl.name} debuta en el primer equipo` : `${pl.name} joins the first team`,
        es ? `${pl.name} (${pl.age}) sube desde la cantera con ${pl.rating} de nivel. Contrato de 3 temporadas.` : `${pl.name} (${pl.age}) is promoted from the academy with a ${pl.rating} rating, on a 3-season deal.`, 'squad');
      return { ok: true, pid: pl.id };
    }
    case 'sell': {
      if (!p) return { ok: false, error: 'Prospect not found.' };
      const fee = sellFee(p);
      U.earn(state, fee);
      a.prospects.splice(a.prospects.indexOf(p), 1);
      return { ok: true, fee };
    }
    case 'release':
      if (!p) return { ok: false, error: 'Prospect not found.' };
      a.prospects.splice(a.prospects.indexOf(p), 1);
      return { ok: true };
    default:
      return { ok: false, error: 'Unknown academy command.' };
  }
}

function potRange(a, p) {
  const w = U.clamp(12 - 3 * a.level - Math.floor(p.weeks / 6), 1, 12);
  const lo = Math.max(Math.floor(p.rating), p.pot - Math.floor(w * ((p.seed % 100) / 100)));
  return [lo, Math.min(99, lo + w)];
}

function snapshot(state, ctx) {
  const a = ensure(state);
  const LV = LEVELS[a.level];
  const next = LEVELS[a.level + 1] || null;
  const team = U.userTeam(state);
  const L = a.league;
  const lastRound = L && L.round > 0 ? L.rounds[L.round - 1] : null;
  const nextRound = L && !L.done ? L.rounds[L.round] : null;
  const nm = (id) => (L ? (L.teams.find((t) => t.id === id) || {}).name : id);
  const fmtMatch = (m) => ({ home: nm(m.home), away: nm(m.away), hw: m.hw, aw: m.aw, mine: m.home === 'B' || m.away === 'B' });
  const trialIn = a.lastTrial ? Math.max(0, TRIAL_COOLDOWN - U.daysBetween(a.lastTrial, state.currentDate)) : 0;
  return {
    enabled: ctx.manager,
    level: a.level,
    maxLevel: LEVELS.length - 1,
    upkeep: LV.upkeep,
    slots: LV.slots,
    nextUpgrade: next ? next.upgrade : null,
    intensity: a.intensity,
    unpaid: a.unpaid,
    budget: team ? U.num(team.budget) : 0,
    roster: team ? (team.playerIds || []).length : 0,
    rosterMax: rosterMax(ctx),
    trialCost: TRIAL_COST,
    trialIn,
    bMax: B_MAX,
    prospects: a.prospects.slice().sort((x, y) => (x.squad === y.squad ? y.rating - x.rating : x.squad === 'b' ? -1 : 1)).map((p) => {
      const [lo, hi] = potRange(a, p);
      return { id: p.id, name: p.name, nation: p.nation, age: p.age, rating: Math.floor(p.rating), progress: Math.round((p.rating % 1) * 100), potLo: lo, potHi: hi, style: p.style, morale: Math.round(p.morale), squad: p.squad, weeks: p.weeks, stats: p.stats, fee: sellFee(p) };
    }),
    league: L ? {
      season: L.season,
      round: L.round,
      rounds: L.rounds.length,
      done: L.done,
      table: standings(L),
      last: lastRound ? lastRound.map(fmtMatch) : [],
      next: nextRound ? nextRound.filter((m) => m.home === 'B' || m.away === 'B').map(fmtMatch) : [],
      strength: Math.round(bStrength(a).s),
    } : null,
    trophies: a.trophies,
    history: a.history,
    graduates: a.graduates || [],
  };
}

module.exports = { id: ID, LEVELS, init, onSeason, onDay, command, snapshot, _test: { makeLeague, simSeries, genProspect, weekly, standings, sellFee, ensure } };
