'use strict';
// Player wellbeing: a fatigue meter fed by official series, circuit events and streaming.
// Streaming brings money and followers; too much load leads to burnout (morale drops, even time off).
const U = require('./util');
const Perks = require('./perks');

const ID = 'wellbeing';
const LINK = 'xtclublife';
const STREAM = {
  off: { fatigue: 0, pay: 0, grow: 0, morale: 0 },
  casual: { fatigue: 0.8, pay: 0.0012, grow: 0.008, morale: 1 },
  heavy: { fatigue: 2.1, pay: 0.0035, grow: 0.022, morale: 2 },
};
const REST = 1.6; // fatigue recovered per day
const PER_SERIES = 7;
const PER_CIRCUIT = 8;
const VACATION_GAP = 30;
const WARN = 80;
const BURN = 95;

function ensure(state) {
  const x = U.xstate(state);
  let w = x.wellbeing;
  if (!w || typeof w !== 'object') w = x.wellbeing = { p: {}, log: [] };
  if (!w.p || typeof w.p !== 'object') w.p = {};
  if (!Array.isArray(w.log)) w.log = [];
  return w;
}
function rec(w, id) { return w.p[id] || (w.p[id] = { fatigue: 20, stream: 'off', vacation: '', warned: false, earned: 0 }); }

const es = (ctx) => ctx && ctx.lang === 'es';
const econ = (state) => (state.economy === 'real' || state.real ? 1 : 40);

function playedOn(state, day) {
  const ids = new Set();
  for (const fx of state.fixtures || []) {
    if (!fx || !fx.played || fx.date !== day) continue;
    if (fx.homeId !== state.userTeamId && fx.awayId !== state.userTeamId) continue;
    for (const g of fx.games || []) for (const l of (g.homeLines || []).concat(g.awayLines || [])) if (l && l.id != null) ids.add(l.id);
  }
  return ids;
}

function circuitOn(state, day) {
  const c = U.xstate(state).circuit;
  return new Set(c && Array.isArray(c.played) ? c.played.filter((x) => x.date === day).map((x) => x.pid) : []);
}

function dayStep(state, day, ctx) {
  const W = ensure(state);
  const roster = U.rosterPlayers(state).filter((p) => !p.isUser);
  const played = playedOn(state, day);
  const circ = circuitOn(state, day);
  const monday = U.weekday(day) === 1;
  let income = 0;
  for (const p of roster) {
    const r = rec(W, p.id);
    const S = STREAM[r.stream] || STREAM.off;
    // better facilities mean better recovery: +8% rest per facility tier
    let f = r.fatigue - REST * (1 + 0.08 * Perks.facilityTier(state, ctx)) + S.fatigue;
    if (played.has(p.id)) f += PER_SERIES;
    if (circ.has(p.id)) f += PER_CIRCUIT;
    if (p.absence) f -= REST; // time off heals
    r.fatigue = Math.round(U.clamp(f, 0, 100) * 10) / 10;
    if (monday) {
      if (S.pay) {
        const pay = Math.round(U.num(p.followers) * S.pay * econ(state) / 7 * 7);
        income += pay;
        r.earned = U.num(r.earned) + pay;
        p.followers = Math.round(U.num(p.followers) * (1 + S.grow));
        if (S.morale) U.moraleDelta(ctx.engine, p, S.morale);
      }
      if (r.fatigue >= WARN) U.moraleDelta(ctx.engine, p, -3);
      if (r.fatigue >= BURN && !p.absence && U.dayRng(state, ID, day, 'burn' + p.id).chance(0.25)) {
        const until = U.addDays(day, 5);
        p.absence = { reason: es(ctx) ? 'agotamiento (burnout), necesita un descanso' : 'burnout, needs a break', cat: 'setup', since: day, until, days: 5 };
        r.fatigue = 55;
        W.log.unshift({ date: day, name: p.name, kind: 'burnout' });
        U.pushInbox(state, es(ctx) ? `${p.name} está quemado` : `${p.name} has burned out`,
          es(ctx) ? `${p.name} acumuló demasiado cansancio y se toma 5 días. Revisá su carga en Club Life → Bienestar.` : `${p.name} hit his limit and is taking 5 days off. Check his load in Club Life → Wellbeing.`, LINK);
      }
    }
    if (r.fatigue >= WARN && !r.warned) {
      r.warned = true;
      U.pushInbox(state, es(ctx) ? `${p.name} está muy cansado` : `${p.name} is exhausted`,
        es(ctx) ? `Su cansancio llegó a ${Math.round(r.fatigue)}. Bajale el streaming o dale vacaciones antes de que se queme.` : `His fatigue is at ${Math.round(r.fatigue)}. Cut his streaming or give him a break before he burns out.`, LINK);
    }
    if (r.fatigue < WARN - 15) r.warned = false;
  }
  if (income) {
    U.earn(state, income);
    if (Array.isArray(state.ledger)) state.ledger.push({ date: day, kind: 'sponsor', amount: income, note: 'Player streams' });
    W.lastIncome = income;
  }
  if (W.log.length > 12) W.log.length = 12;
}

function nextMatchIn(state) {
  const me = state.userTeamId;
  const fx = (state.fixtures || []).filter((f) => f && !f.played && (f.homeId === me || f.awayId === me) && f.date >= state.currentDate).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  return fx ? U.daysBetween(state.currentDate, fx.date) : null;
}

function init(state) { ensure(state); }
function onDay(state, day, ctx) { if (ctx.manager) dayStep(state, day, ctx); }

function command(state, cmd, ctx) {
  if (!ctx.manager) return { ok: false, error: 'Only available in manager careers.' };
  const W = ensure(state);
  const p = U.playerOf(state, Number(cmd.pid));
  if (!p || p.teamId !== state.userTeamId || p.isUser) return { ok: false, error: 'Pick one of your players.' };
  const r = rec(W, p.id);
  if (cmd.op === 'stream') {
    if (!STREAM[cmd.value]) return { ok: false, error: 'Bad streaming option.' };
    r.stream = cmd.value;
    return { ok: true };
  }
  if (cmd.op === 'vacation') {
    if (r.vacation && U.daysBetween(r.vacation, state.currentDate) < VACATION_GAP) return { ok: false, error: es(ctx) ? `Ya tuvo vacaciones hace poco (cada ${VACATION_GAP} días).` : `He had a break recently (every ${VACATION_GAP} days).` };
    const n = nextMatchIn(state);
    if (n != null && n <= 3) return { ok: false, error: es(ctx) ? 'Hay partido en menos de 4 días.' : 'There is a match in less than 4 days.' };
    r.vacation = state.currentDate;
    r.fatigue = Math.max(0, r.fatigue - 45);
    U.moraleDelta(ctx.engine, p, 6);
    W.log.unshift({ date: state.currentDate, name: p.name, kind: 'vacation' });
    return { ok: true };
  }
  return { ok: false, error: 'Unknown wellbeing command.' };
}

function snapshot(state, ctx) {
  const W = ensure(state);
  const n = nextMatchIn(state);
  return {
    enabled: ctx.manager, warn: WARN, burn: BURN, nextMatchIn: n, lastIncome: W.lastIncome || 0,
    players: U.rosterPlayers(state).filter((p) => !p.isUser).map((p) => {
      const r = rec(W, p.id);
      return { id: p.id, name: p.name, fatigue: Math.round(r.fatigue), stream: r.stream, followers: U.num(p.followers), earned: U.num(r.earned), absent: !!p.absence,
        vacationIn: r.vacation ? Math.max(0, VACATION_GAP - U.daysBetween(r.vacation, state.currentDate)) : 0 };
    }),
    log: W.log.slice(0, 6),
  };
}

module.exports = { id: ID, STREAM, init, onDay, command, snapshot, _test: { ensure, dayStep } };
