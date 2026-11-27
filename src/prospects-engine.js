'use strict';
// More prospects ("promesas"): every season a new class of teenage talents appears as free agents
// in every region, plus the odd mid-season breakout from ranked. They are real Hub players, so any
// club (yours included) can sign them through the Hub's own transfer screens.
const U = require('./util');

const ID = 'prospects';
const PER_REGION = [2, 4];        // per region, per season
const BREAKOUT_GAP = 40;          // days between mid-season breakouts
const MAX_CREATED = 400;          // hard cap so a very long career doesn't bloat the save

const PRE = ['ky', 'zy', 've', 'no', 'ra', 'lu', 'ex', 'sk', 'tr', 'fl', 'dr', 'ch', 'mi', 'ja', 'ko', 'sa', 'th', 'xa', 'ni', 'be', 'ar', 'ze', 'qu', 'vo', 'ty', 'ma', 'el', 'ro', 'gh', 'pi'];
const MID = ['n', 'r', 'x', 'l', 'v', 'k', 'z', 'm', 'st', 'th', 'sh', 'nd', 'lt', 'rk', 'zz', 'ck'];
const END = ['o', 'y', 'ix', 'en', 'a', 'us', 'ie', 'er', 'on', 'ii', 'ar', 'is', 'ey', 'el', 'ox', 'yn', 'zo', 'ka'];
const WORDS = ['Nova', 'Drift', 'Blaze', 'Echo', 'Frost', 'Pulse', 'Vortex', 'Zephyr', 'Rogue', 'Comet', 'Raven', 'Saber', 'Nyx', 'Jolt', 'Halo', 'Cinder', 'Flux', 'Onyx', 'Lynx', 'Kairo'];

function ensure(state) {
  const x = U.xstate(state);
  let p = x.prospects;
  if (!p || typeof p !== 'object') p = x.prospects = { classes: {}, created: [], lastBreakout: '', log: [] };
  if (!p.classes || typeof p.classes !== 'object') p.classes = {};
  if (!Array.isArray(p.created)) p.created = [];
  if (!Array.isArray(p.log)) p.log = [];
  return p;
}

function genTag(r, taken) {
  for (let i = 0; i < 30; i++) {
    let n;
    const k = r();
    if (k < 0.55) n = r.pick(PRE) + r.pick(MID) + r.pick(END);
    else if (k < 0.8) n = r.pick(WORDS) + (r.chance(0.5) ? r.pick(END) : '');
    else n = r.pick(PRE) + r.pick(END) + r.int(1, 99);
    if (r.chance(0.3)) n = n.charAt(0).toUpperCase() + n.slice(1);
    else if (r.chance(0.15)) n = n.toUpperCase();
    if (r.chance(0.08)) n += '.';
    if (n.length >= 3 && !taken.has(n.toLowerCase())) { taken.add(n.toLowerCase()); return n; }
  }
  return 'Rookie' + r.int(100, 9999);
}

function nationsByRegion(state) {
  const out = {};
  for (const p of state.players) {
    if (!p || !p.nation) continue;
    const t = U.teamOf(state, p.teamId);
    const reg = (t && t.region) || p.home;
    if (!reg) continue;
    (out[reg] || (out[reg] = [])).push(p.nation);
  }
  return out;
}

function regionsOf(state) {
  const rs = Array.isArray(state.regions) && state.regions.length ? state.regions.map((r) => r.id) : [];
  return rs.length ? rs : [...new Set(state.teams.map((t) => t && t.region).filter(Boolean))];
}

function makeProspect(state, r, region, nations, taken, ctx, opts) {
  const age = (opts && opts.age) || r.int(15, 18);
  let pot = r.chance(0.1) ? r.int(95, 99) : r.int(82, 94);
  if (opts && opts.potBonus) pot += opts.potBonus;
  pot = U.clamp(pot, 78, 99);
  const rating = U.clamp(55 + (age - 15) * 4 + r() * 8 + (pot - 85) * 0.25, 52, pot - 6);
  const tmpl = state.players.find((p) => p && p.econ) || {};
  const pl = {
    id: (state.nextId = U.num(state.nextId) + 1),
    name: genTag(r, taken),
    teamId: -1,
    rating: Math.floor(rating),
    age,
    form: 0,
    isUser: false,
    nation: (nations && nations.length) ? r.pick(nations) : 'United States',
    retired: false,
    absence: null,
    morale: 75,
    moraleStage: 'happy',
    wantsOut: false,
    refusing: false,
    benchedRun: 0,
    peakAge: r.int(20, 24),
    contractSeasons: 0,
    season: { games: 0, goals: 0, assists: 0, saves: 0, shots: 0, mvps: 0, wins: 0, losses: 0 },
    career: { games: 0, goals: 0, assists: 0, saves: 0, shots: 0, mvps: 0, wins: 0, losses: 0 },
    potential: pot,
    followers: r.int(300, 4000) + (pot >= 94 ? r.int(5000, 25000) : 0),
    ratingExact: rating,
    wage: 300,
    titles: [],
    freeAgent: true,
    home: region,
    xtProspect: true,
  };
  if (tmpl.econ) pl.econ = tmpl.econ;
  try { if (ctx.engine && typeof ctx.engine.wageFor === 'function') pl.wage = Math.max(1, Math.round(ctx.engine.wageFor(pl, state)) || 300); } catch { /* default */ }
  return pl;
}

function announce(state, r, pl, ctx, breakout) {
  const es = ctx.lang === 'es';
  const reg = (state.regions || []).find((x) => x.id === pl.home);
  const where = reg ? reg.short || reg.name : '';
  const text = breakout
    ? r.pick([`${pl.name} (${pl.age}, ${pl.nation}) just hit #1 on the ${where} ranked ladder. Pro teams are calling 📞`, `A ${pl.age}-year-old nobody had heard of, ${pl.name}, is destroying ${where} ranked right now 👀`, `Clip of the week: ${pl.name}, ${pl.age}, from ${pl.nation}. Remember the name.`])
    : r.pick([`Scouts are raving about ${pl.name} (${pl.age}, ${pl.nation}). Next big thing? 👀`, `${where} wonderkid alert 🚨 ${pl.name}, ${pl.age}, is a free agent and every top org knows it`, `${pl.name} (${pl.age}) — mechanics already pro level. Who signs this kid first?`]);
  U.yPost(state, r, { kind: 'media', name: 'RL Insider', followers: 180000, verified: true, club: '', text, hype: 1.2 });
  U.pushNews(state, ctx, 'prospect' + pl.id, {
    category: 'transfer', teamId: null,
    headline: es ? `Promesa: ${pl.name} (${pl.age}) llama la atención` : `Prospect watch: ${pl.name} (${pl.age}) turns heads`,
    body: es ? `${pl.name}, de ${pl.nation}, es agente libre con un techo enorme. Más de un club ya preguntó por su situación.` : `${pl.name}, from ${pl.nation}, is a free agent with a huge ceiling. Several clubs have already asked about the situation.`,
  });
}

function seedClass(state, P, season, ctx) {
  if (P.classes[season]) return;
  if (P.created.length >= MAX_CREATED) { P.classes[season] = []; return; }
  const r = U.rng(U.careerKey(state) + '|' + ID + '|class|' + season);
  const nat = nationsByRegion(state);
  const taken = new Set(state.players.map((p) => String(p && p.name || '').toLowerCase()));
  const ids = [];
  for (const reg of regionsOf(state)) {
    const n = r.int(PER_REGION[0], PER_REGION[1]);
    for (let i = 0; i < n; i++) {
      const pl = makeProspect(state, r, reg, nat[reg], taken, ctx);
      state.players.push(pl);
      ids.push(pl.id);
      P.created.push(pl.id);
    }
  }
  P.classes[season] = ids;
  const best = ids.map((id) => U.playerOf(state, id)).filter(Boolean).sort((a, b) => b.potential - a.potential).slice(0, 2);
  for (const pl of best) announce(state, r, pl, ctx, false);
  P.log.unshift({ date: state.currentDate, kind: 'class', season, n: ids.length, best: best.map((p) => p.name) });
  if (P.log.length > 20) P.log.length = 20;
}

function init(state, ctx) {
  const P = ensure(state);
  seedClass(state, P, state.season, ctx);
}
function onSeason(state, ctx) {
  const P = ensure(state);
  seedClass(state, P, state.season, ctx);
}

function onDay(state, day, ctx) {
  const P = ensure(state);
  if (P.created.length >= MAX_CREATED) return;
  if (P.lastBreakout && U.daysBetween(P.lastBreakout, day) < BREAKOUT_GAP) return;
  if (!P.lastBreakout) { P.lastBreakout = day; return; }
  const r = U.dayRng(state, ID, day, 'breakout');
  if (!r.chance(0.08)) return;
  P.lastBreakout = day;
  const regs = regionsOf(state);
  const reg = r.pick(regs);
  const taken = new Set(state.players.map((p) => String(p && p.name || '').toLowerCase()));
  const pl = makeProspect(state, r, reg, nationsByRegion(state)[reg], taken, ctx, { potBonus: 3 });
  state.players.push(pl);
  P.created.push(pl.id);
  announce(state, r, pl, ctx, true);
  P.log.unshift({ date: day, kind: 'breakout', name: pl.name, age: pl.age, region: reg });
  if (P.log.length > 20) P.log.length = 20;
}

function snapshot(state) {
  const P = ensure(state);
  const mine = new Set(P.created);
  const young = state.players.filter((p) => p && !p.retired && !p.isUser && U.num(p.age) <= 20 && U.num(p.potential) >= 80)
    .sort((a, b) => U.num(b.potential) - U.num(a.potential) || U.num(b.rating) - U.num(a.rating));
  const isFa = (p) => !U.teamOf(state, p.teamId);
  const radar = young.filter(isFa).slice(0, 30).concat(young.filter((p) => !isFa(p)).slice(0, 25))
    .map((p) => {
      const t = U.teamOf(state, p.teamId);
      return { id: p.id, name: p.name, age: p.age, nation: p.nation, rating: U.num(p.rating), pot: U.num(p.potential), team: t ? t.name : null, mine: !!t && t.id === state.userTeamId, region: (t && t.region) || p.home || '', fresh: mine.has(p.id), wage: U.num(p.wage) };
    });
  return { radar, log: P.log.slice(0, 8), created: P.created.length };
}

module.exports = { id: ID, init, onSeason, onDay, snapshot, _test: { makeProspect, genTag } };
