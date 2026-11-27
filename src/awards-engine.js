'use strict';
// Season awards (given when the World Championship ends, from the Hub's own season stats)
// and a mid-season All-Star game voted by the fans.
const U = require('./util');

const ID = 'awards';
const LINK = 'xtcircuit';
const MIN_GAMES = 12;
const WEST = ['na', 'sam', 'oce'];
const CAMPAIGN_COST = 5000;
const CACHE = new WeakMap();
const played = (state) => (state.fixtures || []).reduce((n, f) => n + (f && f.played ? 1 : 0), 0);

function ensure(state) {
  const x = U.xstate(state);
  let a = x.awards;
  if (!a || typeof a !== 'object') a = x.awards = { given: {}, history: [], allstar: null, allstarLog: [] };
  if (!a.given || typeof a.given !== 'object') a.given = {};
  if (!Array.isArray(a.history)) a.history = [];
  if (!Array.isArray(a.allstarLog)) a.allstarLog = [];
  return a;
}

const es = (ctx) => ctx && ctx.lang === 'es';
const econ = (state) => (state.economy === 'real' || state.real ? 1 : 40);

function stats(p) { const s = p && p.season; return s && typeof s === 'object' ? s : null; }
function score(p) {
  const s = stats(p);
  if (!s || U.num(s.games) < 1) return 0;
  const g = U.num(s.games);
  const per = (U.num(s.goals) + U.num(s.assists) * 0.75 + U.num(s.saves) * 0.6 + U.num(s.mvps) * 4) / g;
  const wr = (U.num(s.wins) + U.num(s.losses)) ? U.num(s.wins) / (U.num(s.wins) + U.num(s.losses)) : 0.5;
  return per * Math.min(1, g / 25) * (0.6 + 0.4 * wr);
}

function clubPlayers(state) {
  return state.players.filter((p) => p && !p.retired && p.teamId != null && U.teamOf(state, p.teamId) && !U.teamOf(state, p.teamId).national);
}

function teamSeries(state) {
  const out = {};
  for (const fx of state.fixtures || []) {
    if (!fx || !fx.played || fx.homeId == null || fx.awayId == null) continue;
    const hw = U.num(fx.homeWins) > U.num(fx.awayWins);
    for (const [id, won] of [[fx.homeId, hw], [fx.awayId, !hw]]) {
      const o = out[id] || (out[id] = { w: 0, l: 0 });
      if (won) o.w++; else o.l++;
    }
  }
  return out;
}

function teamStrength(state, t) {
  const ids = Array.isArray(t.lineup) && t.lineup.length ? t.lineup : (t.playerIds || []).slice(0, 3);
  const ps = ids.map((id) => U.playerOf(state, id)).filter(Boolean);
  return ps.length ? ps.reduce((s, p) => s + U.num(p.rating), 0) / ps.length : 50;
}

function pv(state, p, extra) {
  const t = U.teamOf(state, p.teamId);
  return Object.assign({ pid: p.id, name: p.name, team: t ? t.name : '?', teamId: p.teamId, mine: p.teamId === state.userTeamId }, extra || {});
}

function compute(state) {
  const ps = clubPlayers(state).filter((p) => stats(p) && U.num(stats(p).games) >= MIN_GAMES);
  if (ps.length < 6) return null;
  const by = (f) => ps.slice().sort((a, b) => f(b) - f(a))[0];
  const ranked = ps.slice().sort((a, b) => score(b) - score(a));
  const mvp = ranked[0];
  const scorer = by((p) => U.num(stats(p).goals));
  const playmaker = by((p) => U.num(stats(p).assists));
  const wall = by((p) => U.num(stats(p).saves));
  const youngs = ps.filter((p) => U.num(p.age) <= 18);
  const rookie = youngs.length ? youngs.sort((a, b) => score(b) - score(a))[0] : null;
  // coach of the year: biggest overperformance (win rate vs strength percentile)
  const series = teamSeries(state);
  const teams = state.teams.filter((t) => t && !t.national && series[t.id] && series[t.id].w + series[t.id].l >= 10);
  const str = teams.map((t) => ({ t, s: teamStrength(state, t) })).sort((a, b) => a.s - b.s);
  let coach = null;
  str.forEach((x, i) => {
    const r = series[x.t.id];
    const wr = r.w / (r.w + r.l);
    const exp = str.length > 1 ? 0.25 + 0.5 * (i / (str.length - 1)) : 0.5;
    const over = wr - exp;
    if (!coach || over > coach.over) coach = { teamId: x.t.id, team: x.t.name, over, w: r.w, l: r.l, mine: x.t.id === state.userTeamId };
  });
  const s = (p) => stats(p);
  return {
    mvp: pv(state, mvp, { value: Math.round(score(mvp) * 10) / 10, stat: `${s(mvp).goals}G ${s(mvp).assists}A ${s(mvp).saves}S ${s(mvp).mvps} MVP` }),
    scorer: pv(state, scorer, { value: U.num(s(scorer).goals) }),
    playmaker: pv(state, playmaker, { value: U.num(s(playmaker).assists) }),
    wall: pv(state, wall, { value: U.num(s(wall).saves) }),
    rookie: rookie ? pv(state, rookie, { value: Math.round(score(rookie) * 10) / 10, age: rookie.age }) : null,
    coach,
    team: ranked.slice(0, 3).map((p) => pv(state, p, { value: Math.round(score(p) * 10) / 10 })),
  };
}

const LABEL = {
  mvp: { en: 'Player of the Season', es: 'Jugador de la temporada' },
  scorer: { en: 'Top scorer', es: 'Goleador' },
  playmaker: { en: 'Playmaker of the Season', es: 'Asistidor de la temporada' },
  wall: { en: 'The Wall (most saves)', es: 'La Muralla (más atajadas)' },
  rookie: { en: 'Rookie of the Season', es: 'Revelación de la temporada' },
  coach: { en: 'Coach of the Season', es: 'DT de la temporada' },
  team: { en: 'Team of the Season', es: 'Equipo ideal' },
};

function give(state, ctx, season) {
  const A = ensure(state);
  const res = compute(state);
  A.given[season] = true;
  if (!res) return;
  A.history.unshift({ season, awards: res });
  if (A.history.length > 12) A.history.length = 12;
  const lang = es(ctx) ? 'es' : 'en';
  const mine = [];
  for (const k of ['mvp', 'scorer', 'playmaker', 'wall', 'rookie']) {
    const w = res[k];
    if (!w || !w.mine) continue;
    const p = U.playerOf(state, w.pid);
    if (p) { U.moraleDelta(ctx.engine, p, k === 'mvp' ? 10 : 6); p.followers = Math.round(U.num(p.followers) * (k === 'mvp' ? 1.15 : 1.06)); }
    mine.push(`${LABEL[k][lang]}: ${w.name}`);
  }
  for (const w of res.team) if (w.mine) { const p = U.playerOf(state, w.pid); if (p) U.moraleDelta(ctx.engine, p, 3); }
  if (res.coach && res.coach.mine) mine.push(LABEL.coach[lang]);
  const team = U.userTeam(state);
  if (team && mine.length) team.followers = Math.round(U.num(team.followers) * (1 + 0.01 * mine.length));
  U.pushNews(state, ctx, 'awards' + season, {
    category: 'club', teamId: res.mvp.teamId, playerId: res.mvp.pid,
    headline: es(ctx) ? `${res.mvp.name} es el Jugador de la temporada ${season}` : `${res.mvp.name} named Player of Season ${season}`,
    body: es(ctx) ? `${res.mvp.name} (${res.mvp.team}) se lleva el premio mayor. Goleador: ${res.scorer.name}. DT de la temporada: ${res.coach ? res.coach.team : '-'}.` : `${res.mvp.name} (${res.mvp.team}) takes the top prize. Top scorer: ${res.scorer.name}. Coach of the Season: ${res.coach ? res.coach.team : '-'}.`,
  });
  U.pushInbox(state, es(ctx) ? `Premios de la temporada ${season}` : `Season ${season} awards`,
    (mine.length ? (es(ctx) ? 'Premios para tu club: ' : 'Awards for your club: ') + mine.join(' · ') + '. ' : '') + (es(ctx) ? 'Mirá todos en Circuit → Premios.' : 'See them all in Circuit → Awards.'), LINK);
}

// ---------- All-Star ----------
function allStarDate(state) {
  const majors = (state.events || []).filter((e) => e && e.kind === 'major').sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  if (!majors.length) return null;
  return U.addDays(majors[0].endDate || majors[0].startDate, 9);
}

function votes(state, p, A) {
  const base = Math.sqrt(Math.max(0, U.num(p.followers))) * (1 + score(p) / 4) + U.num(p.rating) * 5;
  return Math.round(base * (A.allstar && A.allstar.campaign === p.id ? 1.35 : 1));
}

function ballot(state, A) {
  const ps = clubPlayers(state).filter((p) => U.num(p.rating) >= 60);
  const side = (p) => (WEST.includes((U.teamOf(state, p.teamId) || {}).region) ? 'west' : 'east');
  const out = { west: [], east: [] };
  for (const p of ps) out[side(p)].push({ pid: p.id, name: p.name, team: (U.teamOf(state, p.teamId) || {}).name, votes: votes(state, p, A), mine: p.teamId === state.userTeamId, r: U.num(p.rating) });
  for (const k of ['west', 'east']) out[k].sort((a, b) => b.votes - a.votes);
  return out;
}

function allStarDay(state, day, ctx) {
  const A = ensure(state);
  const date = allStarDate(state);
  if (!date) return;
  if (!A.allstar || A.allstar.season !== U.num(state.season)) {
    if (U.daysBetween(day, date) > 14) return;
    A.allstar = { season: U.num(state.season), date, status: 'voting', campaign: null, result: null };
    U.pushInbox(state, es(ctx) ? 'Abrió la votación del All-Star' : 'All-Star voting is open',
      es(ctx) ? `Los hinchas eligen a los 3 titulares de cada conferencia (Oeste: NA, SAM, OCE · Este: el resto) para el All-Star del ${date}. Podés hacer campaña por uno de tus jugadores en Circuit → Premios.` : `Fans pick 3 starters per conference (West: NA, SAM, OCE · East: the rest) for the All-Star game on ${date}. You can campaign for one of your players in Circuit → Awards.`, LINK);
  }
  const S = A.allstar;
  if (S.status !== 'voting' || U.daysBetween(day, S.date) > 0) return;
  const b = ballot(state, A);
  const west = b.west.slice(0, 3);
  const east = b.east.slice(0, 3);
  if (west.length < 3 || east.length < 3) { S.status = 'cancelled'; return; }
  const r = U.dayRng(state, ID, day, 'allstar');
  const sw = west.reduce((s, p) => s + p.r, 0) / 3;
  const se = east.reduce((s, p) => s + p.r, 0) / 3;
  const pW = 1 / (1 + Math.exp(-(sw - se) / 6));
  let w = 0; let e = 0; const games = [];
  while (w < 3 && e < 3) {
    const westWins = r() < pW;
    const hi = r.int(4, 9); const lo = r.int(2, hi - 1);
    games.push(westWins ? [hi, lo] : [lo, hi]);
    if (westWins) w++; else e++;
  }
  const winners = w > e ? west : east;
  const mvp = r.pick(winners);
  S.status = 'done';
  S.result = { west, east, w, e, games, mvp: mvp.name, winner: w > e ? 'west' : 'east' };
  const mine = west.concat(east).filter((p) => p.mine);
  for (const m of mine) {
    const p = U.playerOf(state, m.pid);
    if (p) { U.moraleDelta(ctx.engine, p, m.pid === mvp.pid ? 7 : 5); p.followers = Math.round(U.num(p.followers) * 1.05); }
  }
  const team = U.userTeam(state);
  if (team && mine.length) team.followers = Math.round(U.num(team.followers) * (1 + 0.005 * mine.length));
  A.allstarLog.unshift({ season: S.season, west: west.map((p) => p.name), east: east.map((p) => p.name), score: `${w}-${e}`, mvp: mvp.name, mine: mine.map((p) => p.name) });
  if (A.allstarLog.length > 10) A.allstarLog.length = 10;
  U.pushNews(state, ctx, 'allstar' + S.season, {
    category: 'club', teamId: (U.playerOf(state, mvp.pid) || {}).teamId,
    headline: es(ctx) ? `All-Star: gana el ${w > e ? 'Oeste' : 'Este'} ${Math.max(w, e)}-${Math.min(w, e)}, ${mvp.name} MVP` : `All-Star: ${w > e ? 'West' : 'East'} win ${Math.max(w, e)}-${Math.min(w, e)}, ${mvp.name} MVP`,
    body: es(ctx) ? `Oeste: ${west.map((p) => p.name).join(', ')}. Este: ${east.map((p) => p.name).join(', ')}.` : `West: ${west.map((p) => p.name).join(', ')}. East: ${east.map((p) => p.name).join(', ')}.`,
  });
  if (mine.length) U.pushInbox(state, 'All-Star', (es(ctx) ? 'Jugaron por tu club: ' : 'Your players at the All-Star: ') + mine.map((p) => p.name).join(', ') + (mine.some((p) => p.pid === mvp.pid) ? (es(ctx) ? ' ¡y salió MVP!' : ' — and took MVP!') : '.'), LINK);
}

// ---------- lifecycle ----------
function init(state) { ensure(state); }
function onDay(state, day, ctx) { allStarDay(state, day, ctx); }
function onTick(state, ctx) {
  const A = ensure(state);
  const season = U.num(state.season);
  if (A.given[season]) return;
  const worlds = (state.events || []).find((e) => e && e.kind === 'worlds');
  if (worlds && worlds.stage === 'done') give(state, ctx, season);
}

function command(state, cmd, ctx) {
  if (!ctx.manager) return { ok: false, error: 'Only available in manager careers.' };
  const A = ensure(state);
  if (cmd.op === 'campaign') {
    const S = A.allstar;
    if (!S || S.status !== 'voting') return { ok: false, error: 'All-Star voting is not open.' };
    if (S.campaign) return { ok: false, error: 'You already ran a campaign this season.' };
    const p = U.playerOf(state, Number(cmd.pid));
    if (!p || p.teamId !== state.userTeamId) return { ok: false, error: 'Pick one of your players.' };
    const pay = U.spend(state, CAMPAIGN_COST * econ(state));
    if (!pay.ok) return pay;
    S.campaign = p.id;
    return { ok: true };
  }
  return { ok: false, error: 'Unknown awards command.' };
}

function snapshot(state, ctx) {
  const A = ensure(state);
  const S = A.allstar && A.allstar.season === U.num(state.season) ? A.allstar : null;
  let allstar = null;
  const date = allStarDate(state);
  if (S) {
    const b = S.status === 'voting' ? ballot(state, A) : null;
    allstar = { status: S.status, date: S.date, inDays: U.daysBetween(state.currentDate, S.date), campaign: S.campaign ? (U.playerOf(state, S.campaign) || {}).name : null, result: S.result,
      west: b ? b.west.slice(0, 6) : null, east: b ? b.east.slice(0, 6) : null,
      myPlayers: U.rosterPlayers(state).filter((p) => !p.isUser).map((p) => ({ id: p.id, name: p.name })) };
  }
  // live race for the current season (cached per day: the Hub asks for snapshots constantly)
  let c = CACHE.get(state);
  if (!c || c.date !== state.currentDate || c.n !== played(state)) { c = { date: state.currentDate, n: played(state), live: compute(state) }; CACHE.set(state, c); }
  const live = c.live;
  return {
    enabled: ctx.manager, season: U.num(state.season), labels: LABEL,
    live, history: A.history.slice(0, 6), allstar, allstarDate: date, allstarPast: !!date && !S && date < state.currentDate, allstarLog: A.allstarLog.slice(0, 5),
    campaignCost: CAMPAIGN_COST * econ(state),
  };
}

module.exports = { id: ID, init, onDay, onTick, command, snapshot, _test: { compute, score, give, ballot, allStarDate, ensure } };
