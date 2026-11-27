'use strict';
// Match simulation helpers for your own series:
//  - "Simulate next game": the Hub simulates one game of today's series and you play the next one(s) live;
//  - "Simulate the rest": you left a live game early; from the score and clock the live observer saw, the
//    remaining minutes are simulated and the game is recorded with that final score.
// Both go through the Hub's own simulateNextGame, so stats, scorers and the series bookkeeping are the Hub's.
// For "the rest" the final score is chosen here and fed to it through the random numbers its Poisson draw uses.
const U = require('./util');

const ID = 'matchsim';
const FULL = 300; // seconds in a regulation game

function ensure(state) {
  state.xtra = state.xtra || {};
  return state.xtra.matchsim || (state.xtra.matchsim = { live: null, log: [] });
}
const isMine = (state, f) => f && (f.homeId === state.userTeamId || f.awayId === state.userTeamId);

// today's series, not finished yet
function todaysFixture(state) {
  if (state.pendingMatch != null) {
    const f = (state.fixtures || []).find((x) => x && x.id === Number(state.pendingMatch));
    if (f && !f.played) return f;
  }
  return (state.fixtures || []).find((f) => isMine(state, f) && !f.played && f.date && f.date <= state.currentDate) || null;
}

// random numbers that make the Hub's Poisson draw return exactly `gh` and `ga` (and pick the overtime winner)
function riggedRng(gh, ga, otHome) {
  const q = [];
  for (let i = 0; i < gh; i++) q.push(0.9999);
  q.push(0);
  for (let i = 0; i < ga; i++) q.push(0.9999);
  q.push(0);
  if (gh === ga) q.push(otHome ? 0 : 0.9999);
  return () => (q.length ? q.shift() : Math.random());
}

function lineupRating(state, ctx, team, fx) {
  const eng = ctx.engine;
  let ids = [];
  try { ids = eng.lineupFor(state, team, fx) || []; } catch { ids = []; }
  if (!ids.length) ids = (team.lineup || team.playerIds || []).slice(0, 3);
  const r = ids.map((id) => U.playerOf(state, id)).filter(Boolean).map((p) => { try { return Number(eng.effRating(p)) || U.num(p.rating); } catch { return U.num(p.rating); } });
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 70;
}

function poisson(lambda, r) {
  const L = Math.exp(-lambda); let k = 0; let p = 1;
  do { k++; p *= r(); } while (p > L && k < 30);
  return k - 1;
}

// final score from the score and clock when the user left, home/away oriented
function finishFrom(state, ctx, fx, homeGoals, awayGoals, remaining, r) {
  const H = U.teamOf(state, fx.homeId); const A = U.teamOf(state, fx.awayId);
  const rh = lineupRating(state, ctx, H, fx); const ra = lineupRating(state, ctx, A, fx);
  const left = U.clamp(Number(remaining) || 0, 0, FULL) / FULL;
  const lh = U.clamp(2.3 * Math.exp((rh - ra) / 12), 0.3, 6) * left;
  const la = U.clamp(2.3 * Math.exp((ra - rh) / 12), 0.3, 6) * left;
  const gh = homeGoals + poisson(lh, r);
  const ga = awayGoals + poisson(la, r);
  const otHome = r() < 1 / (1 + Math.exp(-(rh - ra) / 8));
  return { gh, ga, ot: gh === ga, otHome };
}

function command(state, cmd, ctx) {
  const es = ctx.lang === 'es';
  const eng = ctx.engine;
  if (!eng || typeof eng.simulateNextGame !== 'function') return { ok: false, error: es ? 'Esta versión del Hub no lo permite.' : 'This Hub version does not support it.' };
  const fx = todaysFixture(state);
  if (!fx) return { ok: false, error: es ? 'No tenés una serie para hoy.' : 'You have no series today.' };
  const m = ensure(state);
  if (cmd.op === 'nextGame') {
    const g = eng.simulateNextGame(state, fx, U.dayRng(state, ID, state.currentDate, 'g' + (fx.games || []).length));
    if (!g) return { ok: false, error: es ? 'No se pudo simular.' : 'Could not simulate.' };
    m.log.unshift({ date: state.currentDate, fx: fx.id, kind: 'game', score: [g.homeGoals, g.awayGoals] });
    return { ok: true, score: [g.homeGoals, g.awayGoals], ot: !!g.overtime, seriesOver: !!fx.played, wins: [fx.homeWins, fx.awayWins] };
  }
  if (cmd.op === 'rest') {
    const L = m.live;
    if (!L || L.fx !== fx.id || L.ended) return { ok: false, error: es ? 'No hay un game en vivo sin terminar.' : 'There is no unfinished live game.' };
    const played = (fx.games || []).filter((x) => x && x.homeGoals != null).length;
    if (played !== L.games) return { ok: false, error: es ? 'Ese game ya quedó registrado.' : 'That game is already recorded.' };
    const blueIsHome = L.blueIsHome !== false;
    const hg = blueIsHome ? L.score[0] : L.score[1];
    const ag = blueIsHome ? L.score[1] : L.score[0];
    const f = finishFrom(state, ctx, fx, hg, ag, L.remaining, U.dayRng(state, ID, state.currentDate, 'rest' + played));
    const g = eng.simulateNextGame(state, fx, riggedRng(f.gh, f.ga, f.otHome));
    if (!g) return { ok: false, error: es ? 'No se pudo simular.' : 'Could not simulate.' };
    L.ended = true;
    m.log.unshift({ date: state.currentDate, fx: fx.id, kind: 'rest', from: [hg, ag], left: L.remaining, score: [g.homeGoals, g.awayGoals] });
    return { ok: true, from: [hg, ag], score: [g.homeGoals, g.awayGoals], ot: !!g.overtime, seriesOver: !!fx.played, wins: [fx.homeWins, fx.awayWins] };
  }
  return { ok: false, error: 'Unknown match command.' };
}

// called by the live caster with what the observer sees, so "simulate the rest" knows where the game stood
function liveUpdate(state, ev, ctx) {
  if (!state || !ev) return;
  const m = ensure(state);
  const fx = todaysFixture(state);
  if (!fx) return;
  const games = (fx.games || []).filter((x) => x && x.homeGoals != null).length;
  if (ev.k === 'start' || !m.live || m.live.fx !== fx.id || m.live.games !== games) {
    if (ev.k !== 'start' && ev.k !== 'goal' && ev.k !== 'kickoff' && ev.k !== 'clock') return;
    m.live = { fx: fx.id, games, score: [0, 0], remaining: FULL, ended: false, left: false, blueIsHome: ctx && ctx.blueIsHome !== false };
  }
  if (Array.isArray(ev.score)) m.live.score = ev.score.slice(0, 2);
  if (ev.remaining != null) m.live.remaining = Number(ev.remaining);
  if (ev.k === 'clock' && ev.left != null) m.live.remaining = Number(ev.left);
  if (ev.k === 'overtime') m.live.remaining = 0;
  if (ev.k === 'end') m.live.ended = true;
  if (ev.k === 'idle' && !m.live.ended) m.live.left = true;
  m.live.at = Date.now();
}

function snapshot(state) {
  const m = ensure(state);
  const fx = todaysFixture(state);
  const L = m.live && fx && m.live.fx === fx.id && !m.live.ended ? m.live : null;
  return {
    today: fx ? { id: fx.id, wins: [fx.homeWins, fx.awayWins], bestOf: fx.bestOf, home: (U.teamOf(state, fx.homeId) || {}).name, away: (U.teamOf(state, fx.awayId) || {}).name, games: (fx.games || []).filter((x) => x && x.homeGoals != null).length } : null,
    unfinished: L && L.left ? { score: L.score, remaining: Math.round(L.remaining) } : null,
    log: m.log.slice(0, 5),
  };
}

module.exports = { id: ID, command, snapshot, liveUpdate, _test: { riggedRng, finishFrom, todaysFixture } };
