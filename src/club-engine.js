'use strict';
// Club life: investor takeover offers + dressing-room conflicts.
const U = require('./util');

const ID = 'club';
const OFFER_DAYS = 7;
const CONFLICT_DAYS = 6;
const CONFLICT_GAP = 14;

const OPTIONS = {
  playtime: [
    { id: 'start_a', fx: { a: 12, b: -6 }, swap: true },
    { id: 'back_b', fx: { a: -10, b: 4 } },
    { id: 'talk', cost: 5000, fx: { a: 4, b: 2 } },
  ],
  clash: [
    { id: 'side_a', fx: { a: 8, b: -10 } },
    { id: 'side_b', fx: { a: -10, b: 8 } },
    { id: 'fine_both', fx: { a: -3, b: -3, others: 3 } },
    { id: 'bootcamp', cost: 25000, fx: { all: 5 } },
  ],
  wage: [
    { id: 'bonus', cost: 'wage8', fx: { a: 10 } },
    { id: 'praise', fx: { a: 5, others: -2 } },
    { id: 'ignore', fx: { a: -10 } },
  ],
  captain: [
    { id: 'name', fx: { a: 10, others: 2 }, captain: 'a' },
    { id: 'vote', fx: { all: 3 }, captain: 'vote' },
    { id: 'refuse', fx: { a: -8 } },
  ],
};

function ensure(state) {
  const x = U.xstate(state);
  let c = x.club;
  if (!c || typeof c !== 'object') c = x.club = { investor: null, investorSeason: null, investorLog: [], conflict: null, conflictLog: [], lastConflict: '', captainId: null, seasonStart: state.currentDate };
  if (!Array.isArray(c.investorLog)) c.investorLog = [];
  if (!Array.isArray(c.conflictLog)) c.conflictLog = [];
  return c;
}

const es = (ctx) => ctx.lang === 'es';

// ---------- investor ----------
function hofClub(state) { return state.hof && state.hof.clubs && state.hof.clubs[String(state.userTeamId)]; }

function objectiveProgress(state, inv) {
  const c = hofClub(state);
  if (!c) return 0;
  const o = inv.objective;
  if (o.kind === 'series') {
    const s = c.seasons && c.seasons[String(inv.season)];
    return s ? U.num(s.series.w) : 0;
  }
  const titles = (c.titles || []).filter((t) => t.season === inv.season);
  if (o.kind === 'regional') return titles.filter((t) => t.kind === 'open').length;
  if (o.kind === 'major') return titles.filter((t) => t.kind === 'major' || t.kind === 'worlds').length;
  return 0;
}

function teamLevel(state) {
  const t = U.userTeam(state);
  const ids = t && Array.isArray(t.lineup) && t.lineup.length ? t.lineup : (t ? (t.playerIds || []).slice(0, 3) : []);
  const ps = ids.map((id) => U.playerOf(state, id)).filter(Boolean);
  return ps.length ? ps.reduce((s, p) => s + U.num(p.rating), 0) / ps.length : 60;
}

function makeOffer(state, r) {
  const t = U.userTeam(state);
  const lvl = teamLevel(state);
  const objective = lvl >= 85 ? { kind: 'major', n: 1 } : lvl >= 75 ? { kind: 'regional', n: 2 } : { kind: 'series', n: 20 };
  const amount = Math.round(U.clamp(U.num(t && t.budget) * 0.4, 150000, 4000000) / 10000) * 10000;
  const names = ['Nordlys Capital', 'Apex Ventures', 'Blue Comet Group', 'Halcyon Holdings', 'Ironclad Equity', 'Solstice Partners', 'Vantage Esports Fund'];
  return { status: 'offer', name: r.pick(names), season: U.num(state.season), amount, objective, offeredOn: state.currentDate, result: null };
}

function objectiveText(o, ctx) {
  if (o.kind === 'major') return es(ctx) ? 'ganar un Major o el Mundial esta temporada' : 'win a Major or the Worlds this season';
  if (o.kind === 'regional') return es(ctx) ? `ganar ${o.n} torneos regionales esta temporada` : `win ${o.n} regional events this season`;
  return es(ctx) ? `ganar ${o.n} series esta temporada` : `win ${o.n} series this season`;
}

function investorDay(state, day, c, ctx) {
  if (c.investor && (c.investor.status === 'offer' || c.investor.status === 'active')) return;
  if (c.investorSeason === state.season) return;
  if (U.daysBetween(c.seasonStart || day, day) < 30) return;
  const r = U.dayRng(state, ID, day, 'investor');
  if (!r.chance(0.006)) return;
  c.investor = makeOffer(state, r);
  c.investorSeason = state.season;
  const inv = c.investor;
  U.pushInbox(state, es(ctx) ? `${inv.name} quiere invertir en el club` : `${inv.name} want to invest in the club`,
    es(ctx) ? `Ofrecen ${U.fmtMoney(inv.amount)} a cambio de un objetivo: ${objectiveText(inv.objective, ctx)}. Si no se cumple, se llevan la mitad. Tenés ${OFFER_DAYS} días para responder en Club Life.`
      : `They offer ${U.fmtMoney(inv.amount)} with one demand: ${objectiveText(inv.objective, ctx)}. Miss it and they take half back. You have ${OFFER_DAYS} days to answer in Club Life.`, 'xtclublife');
}

function investorTick(state, c, ctx) {
  const inv = c.investor;
  if (!inv) return;
  if (inv.status === 'offer' && U.daysBetween(inv.offeredOn, state.currentDate) > OFFER_DAYS) {
    inv.status = 'declined';
    c.investorLog.unshift({ season: inv.season, name: inv.name, result: 'expired' });
  }
  if (inv.status === 'active' && objectiveProgress(state, inv) >= inv.objective.n) {
    const bonus = Math.round(inv.amount * 0.25);
    U.earn(state, bonus);
    inv.status = 'done';
    inv.result = 'success';
    c.investorLog.unshift({ season: inv.season, name: inv.name, result: 'success', amount: inv.amount, bonus });
    U.pushInbox(state, es(ctx) ? `${inv.name}: objetivo cumplido` : `${inv.name}: target met`,
      es(ctx) ? `Cumpliste el objetivo. Los inversores están felices y suman un bonus de ${U.fmtMoney(bonus)}.` : `Target met. The investors are delighted and add a ${U.fmtMoney(bonus)} bonus.`, 'xtclublife');
  }
}

function investorSeasonEnd(state, c, ctx, prevSeason) {
  const inv = c.investor;
  if (!inv || inv.status !== 'active' || inv.season !== prevSeason) return;
  const t = U.userTeam(state);
  const claw = Math.min(U.num(t && t.budget), Math.round(inv.amount * 0.5));
  if (t) t.budget = Math.round(U.num(t.budget) - claw);
  inv.status = 'done';
  inv.result = 'failed';
  c.investorLog.unshift({ season: inv.season, name: inv.name, result: 'failed', amount: inv.amount, clawback: claw });
  U.pushInbox(state, es(ctx) ? `${inv.name} se retira` : `${inv.name} pull out`,
    es(ctx) ? `No se cumplió el objetivo (${objectiveText(inv.objective, ctx)}). Los inversores se llevan ${U.fmtMoney(claw)}.` : `The target was missed (${objectiveText(inv.objective, ctx)}). The investors take back ${U.fmtMoney(claw)}.`, 'xtclublife');
}

// ---------- dressing room ----------
function squad(state) {
  const t = U.userTeam(state);
  const ps = U.rosterPlayers(state).filter((p) => !p.isUser && !p.absence);
  const lineup = new Set(t && Array.isArray(t.lineup) ? t.lineup : []);
  return { t, ps, starters: ps.filter((p) => lineup.has(p.id)), bench: ps.filter((p) => !lineup.has(p.id)) };
}

function conflictDay(state, day, c, ctx) {
  if (c.conflict) return;
  if (c.lastConflict && U.daysBetween(c.lastConflict, day) < CONFLICT_GAP) return;
  const { ps, starters, bench } = squad(state);
  if (ps.length < 2) return;
  const r = U.dayRng(state, ID, day, 'conflict');
  const unhappyBench = bench.filter((p) => U.num(p.morale) < 65);
  const p = 0.02 + (unhappyBench.length ? 0.03 : 0);
  if (!r.chance(p)) return;
  const kinds = [];
  if (bench.length && starters.length) kinds.push('playtime', 'playtime');
  if (starters.length >= 2) kinds.push('clash');
  kinds.push('wage');
  if (!c.captainId || !ps.some((x) => x.id === c.captainId)) kinds.push('captain');
  const kind = r.pick(kinds);
  let a; let b = null;
  if (kind === 'playtime') {
    a = (unhappyBench[0] || bench.slice().sort((x, y) => y.rating - x.rating)[0]);
    b = starters.slice().sort((x, y) => x.rating - y.rating)[0];
  } else if (kind === 'clash') {
    const s = starters.slice();
    a = s.splice(r.int(0, s.length - 1), 1)[0];
    b = s[r.int(0, s.length - 1)];
  } else if (kind === 'wage') {
    a = ps.slice().sort((x, y) => y.rating - x.rating)[0];
  } else {
    a = ps.slice().sort((x, y) => U.num(y.age) - U.num(x.age) || y.rating - x.rating)[0];
  }
  if (!a || (['playtime', 'clash'].includes(kind) && !b)) return;
  c.conflict = { kind, a: a.id, b: b ? b.id : null, date: day };
  c.lastConflict = day;
  U.pushInbox(state, es(ctx) ? 'Problemas en el vestuario' : 'Trouble in the dressing room',
    es(ctx) ? `Hay un conflicto con ${a.name}${b ? ' y ' + b.name : ''}. Resolvelo en Club Life antes de que empeore.` : `There's an issue involving ${a.name}${b ? ' and ' + b.name : ''}. Sort it out in Club Life before it gets worse.`, 'xtclublife');
}

function optionCost(state, kind, opt) {
  if (opt.cost === 'wage8') {
    const c = ensure(state);
    const a = U.playerOf(state, c.conflict && c.conflict.a);
    return Math.max(5000, Math.round(U.num(a && a.wage) * 8));
  }
  return U.num(opt.cost);
}

function applyConflict(state, c, opt, ctx) {
  const k = c.conflict;
  const a = U.playerOf(state, k.a);
  const b = k.b != null ? U.playerOf(state, k.b) : null;
  const { ps, t } = squad(state);
  const others = ps.filter((p) => p !== a && p !== b);
  const fx = opt.fx;
  if (fx.a) U.moraleDelta(ctx.engine, a, fx.a);
  if (fx.b && b) U.moraleDelta(ctx.engine, b, fx.b);
  if (fx.others) for (const p of others) U.moraleDelta(ctx.engine, p, fx.others);
  if (fx.all) for (const p of ps) U.moraleDelta(ctx.engine, p, fx.all);
  if (opt.swap && t && Array.isArray(t.lineup) && a && b) {
    const i = t.lineup.indexOf(b.id);
    if (i !== -1 && !t.lineup.includes(a.id)) t.lineup[i] = a.id;
  }
  if (opt.captain === 'a' && a) c.captainId = a.id;
  if (opt.captain === 'vote') {
    const top = ps.slice().sort((x, y) => U.num(y.morale) - U.num(x.morale))[0];
    if (top) c.captainId = top.id;
  }
}

function conflictTick(state, c, ctx) {
  const k = c.conflict;
  if (!k) return;
  const a = U.playerOf(state, k.a);
  const b = k.b != null ? U.playerOf(state, k.b) : null;
  const gone = !a || a.teamId !== state.userTeamId || (k.b != null && (!b || b.teamId !== state.userTeamId));
  if (gone) { c.conflict = null; return; }
  if (U.daysBetween(k.date, state.currentDate) > CONFLICT_DAYS) {
    U.moraleDelta(ctx.engine, a, -6);
    if (b) U.moraleDelta(ctx.engine, b, -6);
    c.conflictLog.unshift({ date: k.date, kind: k.kind, a: a.name, b: b ? b.name : null, choice: 'ignored' });
    c.conflict = null;
  }
  if (c.conflictLog.length > 12) c.conflictLog.length = 12;
}

// ---------- lifecycle ----------
function init(state) { ensure(state); }

function onSeason(state, ctx, prev) {
  const c = ensure(state);
  investorSeasonEnd(state, c, ctx, prev);
  c.seasonStart = state.currentDate;
}

function onDay(state, day, ctx) {
  if (!ctx.manager) return;
  const c = ensure(state);
  investorDay(state, day, c, ctx);
  conflictDay(state, day, c, ctx);
}

function onTick(state, ctx) {
  const c = ensure(state);
  investorTick(state, c, ctx);
  conflictTick(state, c, ctx);
}

function command(state, cmd, ctx) {
  if (!ctx.manager) return { ok: false, error: 'Only available in manager careers.' };
  const c = ensure(state);
  if (cmd.op === 'investor') {
    const inv = c.investor;
    if (!inv || inv.status !== 'offer') return { ok: false, error: 'No investor offer pending.' };
    if (cmd.accept) {
      U.earn(state, inv.amount);
      inv.status = 'active';
      inv.acceptedOn = state.currentDate;
    } else {
      inv.status = 'declined';
      c.investorLog.unshift({ season: inv.season, name: inv.name, result: 'declined' });
    }
    return { ok: true };
  }
  if (cmd.op === 'resolve') {
    const k = c.conflict;
    if (!k) return { ok: false, error: 'No conflict pending.' };
    const opt = (OPTIONS[k.kind] || []).find((o) => o.id === cmd.option);
    if (!opt) return { ok: false, error: 'Unknown option.' };
    const cost = optionCost(state, k.kind, opt);
    if (cost) { const pay = U.spend(state, cost); if (!pay.ok) return pay; }
    applyConflict(state, c, opt, ctx);
    const a = U.playerOf(state, k.a);
    const b = k.b != null ? U.playerOf(state, k.b) : null;
    c.conflictLog.unshift({ date: k.date, kind: k.kind, a: a ? a.name : '?', b: b ? b.name : null, choice: opt.id, cost });
    c.conflict = null;
    return { ok: true };
  }
  return { ok: false, error: 'Unknown club command.' };
}

function snapshot(state, ctx) {
  const c = ensure(state);
  let investor = null;
  if (c.investor && ['offer', 'active'].includes(c.investor.status)) {
    const inv = c.investor;
    investor = {
      status: inv.status, name: inv.name, amount: inv.amount, objective: inv.objective,
      progress: objectiveProgress(state, inv),
      expiresIn: inv.status === 'offer' ? Math.max(0, OFFER_DAYS - U.daysBetween(inv.offeredOn, state.currentDate)) : null,
    };
  }
  let conflict = null;
  if (c.conflict) {
    const k = c.conflict;
    const a = U.playerOf(state, k.a);
    const b = k.b != null ? U.playerOf(state, k.b) : null;
    conflict = {
      kind: k.kind,
      a: a ? { name: a.name, morale: Math.round(U.num(a.morale)), rating: a.rating } : null,
      b: b ? { name: b.name, morale: Math.round(U.num(b.morale)), rating: b.rating } : null,
      expiresIn: Math.max(0, CONFLICT_DAYS - U.daysBetween(k.date, state.currentDate)),
      options: (OPTIONS[k.kind] || []).map((o) => ({ id: o.id, cost: optionCost(state, k.kind, o), fx: o.fx })),
    };
  }
  const cap = c.captainId != null ? U.playerOf(state, c.captainId) : null;
  const t = U.userTeam(state);
  return {
    enabled: ctx.manager,
    budget: t ? U.num(t.budget) : 0,
    investor,
    investorLog: c.investorLog.slice(0, 6),
    conflict,
    conflictLog: c.conflictLog.slice(0, 8),
    captain: cap && cap.teamId === state.userTeamId ? cap.name : null,
    squad: U.rosterPlayers(state).filter((p) => !p.isUser).map((p) => ({ name: p.name, morale: Math.round(U.num(p.morale)), rating: p.rating, starter: !!(t && (t.lineup || []).includes(p.id)) })),
  };
}

module.exports = { id: ID, OPTIONS, init, onSeason, onDay, onTick, command, snapshot, _test: { makeOffer, objectiveProgress } };
