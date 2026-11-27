'use strict';
// RL Hall of Fame — pure engine (no Electron). Works on the RL Career Hub career state object.
// Everything it stores lives in state.hof, which the Hub saves together with the career.

const SCHEMA = 1;
const TOP_N = 10;
const KEEP_KEYS_DAYS = 420;

const ACHIEVEMENTS = [
  { key: 'first_win', icon: '🏁', metric: 'seriesWins', target: 1 },
  { key: 'series_50', icon: '📈', metric: 'seriesPlayed', target: 50 },
  { key: 'series_100', icon: '💯', metric: 'seriesPlayed', target: 100 },
  { key: 'goals_100', icon: '⚽', metric: 'goalsFor', target: 100 },
  { key: 'goals_500', icon: '🚀', metric: 'goalsFor', target: 500 },
  { key: 'streak_5', icon: '🔥', metric: 'bestStreak', target: 5 },
  { key: 'streak_10', icon: '☄️', metric: 'bestStreak', target: 10 },
  { key: 'sweep', icon: '🧹', metric: 'sweeps', target: 1 },
  { key: 'comeback', icon: '🔄', metric: 'comebacks', target: 1 },
  { key: 'clean_sheet', icon: '🧱', metric: 'cleanSheets', target: 1 },
  { key: 'hattrick', icon: '🎩', metric: 'hattricks', target: 1 },
  { key: 'five_goals', icon: '🖐️', metric: 'fiveGoalGames', target: 1 },
  { key: 'first_final', icon: '🥈', metric: 'finalsReached', target: 1 },
  { key: 'first_title', icon: '🏆', metric: 'titles', target: 1 },
  { key: 'titles_5', icon: '🗄️', metric: 'titles', target: 5 },
  { key: 'major_title', icon: '🌍', metric: 'majorTitles', target: 1 },
  { key: 'worlds_title', icon: '👑', metric: 'worldsTitles', target: 1 },
  { key: 'centurion', icon: '🎯', metric: 'playerMaxGoals', target: 100 },
  { key: 'first_legend', icon: '🏛️', metric: 'legends', target: 1 },
];

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function daysBetween(a, b) {
  const da = Date.parse(a + 'T00:00:00Z');
  const db = Date.parse(b + 'T00:00:00Z');
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  return Math.round((db - da) / 86400000);
}

function yearOf(date) { return Number(String(date || '').slice(0, 4)) || 0; }

function isCareer(state) {
  return !!(state && typeof state === 'object' && Array.isArray(state.players) && Array.isArray(state.teams) && state.userTeamId != null);
}

function teamOf(state, id) {
  if (id == null) return null;
  const t = state.teams.find((x) => x && x.id === id);
  if (t) return t;
  const intl = state.intl && Array.isArray(state.intl.teams) ? state.intl.teams : [];
  return intl.find((x) => x && x.id === id) || null;
}

function teamName(state, id) {
  const t = teamOf(state, id);
  return t ? String(t.name || t.abbrev || '#' + id) : '#' + id;
}

function playerOf(state, id) {
  return state.players.find((p) => p && p.id === id) || null;
}

function eventOf(state, id) {
  return id == null ? null : (state.events || []).find((e) => e && e.id === id) || null;
}

function ensure(state) {
  let h = state.hof;
  if (!h || typeof h !== 'object' || h.v !== SCHEMA) {
    h = state.hof = { v: SCHEMA, since: state.currentDate || '', clubs: {}, seenFx: {}, seenEv: {}, unseen: [] };
  }
  if (!h.clubs || typeof h.clubs !== 'object') h.clubs = {};
  if (!h.seenFx || typeof h.seenFx !== 'object') h.seenFx = {};
  if (!h.seenEv || typeof h.seenEv !== 'object') h.seenEv = {};
  if (!Array.isArray(h.unseen)) h.unseen = [];
  return h;
}

function clubBucket(state, h, teamId) {
  const k = String(teamId);
  let c = h.clubs[k];
  if (!c) {
    c = h.clubs[k] = {
      teamId,
      name: teamName(state, teamId),
      since: state.currentDate || '',
      series: { w: 0, l: 0 },
      games: { w: 0, l: 0 },
      goals: { f: 0, a: 0 },
      streak: { cur: 0, best: 0, bestTo: '' },
      counts: { sweeps: 0, comebacks: 0, cleanSheets: 0, hattricks: 0, fiveGoalGames: 0 },
      titles: [],
      finals: [],
      records: {},
      players: {},
      seasons: {},
      h2h: {},
      ach: {},
      legends: [],
    };
  }
  c.name = teamName(state, teamId) || c.name;
  return c;
}

function seasonBucket(c, state, date) {
  const k = String(state.season != null ? state.season : yearOf(date));
  if (!c.seasons[k]) {
    c.seasons[k] = { season: num(state.season), year: yearOf(date), series: { w: 0, l: 0 }, games: { w: 0, l: 0 }, goals: { f: 0, a: 0 }, titles: [], scorers: {} };
  }
  return c.seasons[k];
}

function playerBucket(c, line) {
  const k = String(line.id);
  if (!c.players[k]) {
    c.players[k] = { id: line.id, name: line.name || '#' + line.id, games: 0, wins: 0, goals: 0, assists: 0, saves: 0, shots: 0, points: 0, mvps: 0, titles: 0, first: '', last: '', bestGoals: 0 };
  }
  const p = c.players[k];
  if (line.name) p.name = line.name;
  return p;
}

function setRecord(c, key, value, entry) {
  const cur = c.records[key];
  if (!cur || value > cur.value) c.records[key] = { value, ...entry };
}

function unlock(h, c, key, date) {
  if (c.ach[key]) return false;
  c.ach[key] = date || '';
  h.unseen.push({ teamId: c.teamId, key, date: date || '' });
  if (h.unseen.length > 40) h.unseen.splice(0, h.unseen.length - 40);
  return true;
}

function fixtureKey(fx) {
  return [fx.id, fx.date, fx.homeId, fx.awayId].join('|');
}

function processFixture(state, h, fx) {
  const clubId = state.userTeamId;
  const home = fx.homeId === clubId;
  const games = Array.isArray(fx.games) ? fx.games.filter(Boolean) : [];
  if (!games.length) return false;
  const c = clubBucket(state, h, clubId);
  const s = seasonBucket(c, state, fx.date);
  const oppId = home ? fx.awayId : fx.homeId;
  const opp = teamName(state, oppId);
  const ev = eventOf(state, fx.eventId);
  const evName = ev ? ev.name : '';
  const ctx = { opp, oppId, date: fx.date, event: evName };
  if (fx.date && (!c.firstFx || fx.date < c.firstFx)) c.firstFx = fx.date;

  let mw = 0;
  let ow = 0;
  let wasDown02 = false;
  const seenInSeries = new Set();
  for (const g of games) {
    const mg = num(home ? g.homeGoals : g.awayGoals);
    const og = num(home ? g.awayGoals : g.homeGoals);
    const won = mg > og;
    if (won) mw++; else ow++;
    if (ow >= 2 && mw === 0) wasDown02 = true;
    c.games[won ? 'w' : 'l']++;
    s.games[won ? 'w' : 'l']++;
    c.goals.f += mg; c.goals.a += og;
    s.goals.f += mg; s.goals.a += og;
    if (won) {
      setRecord(c, 'biggestWin', mg - og, { score: mg + '-' + og, ...ctx });
      if (og === 0) c.counts.cleanSheets++;
    } else {
      setRecord(c, 'worstLoss', og - mg, { score: mg + '-' + og, ...ctx });
    }
    setRecord(c, 'mostGoalsGame', mg, { score: mg + '-' + og, ...ctx });
    const lines = (home ? g.homeLines : g.awayLines) || [];
    for (const ln of lines) {
      if (!ln || ln.id == null) continue;
      const p = playerBucket(c, ln);
      const goals = num(ln.goals);
      p.games++;
      if (won) p.wins++;
      p.goals += goals;
      p.assists += num(ln.assists);
      p.saves += num(ln.saves);
      p.shots += num(ln.shots);
      p.points += num(ln.points);
      if (!p.first) p.first = fx.date;
      p.last = fx.date;
      if (goals > p.bestGoals) p.bestGoals = goals;
      s.scorers[ln.id] = num(s.scorers[ln.id]) + goals;
      seenInSeries.add(ln.id);
      const who = { pid: ln.id, name: p.name, ...ctx };
      setRecord(c, 'playerGoalsGame', goals, who);
      setRecord(c, 'playerSavesGame', num(ln.saves), who);
      setRecord(c, 'playerPointsGame', num(ln.points), who);
      if (goals >= 3) c.counts.hattricks++;
      if (goals >= 5) c.counts.fiveGoalGames++;
    }
  }

  const myWins = fx.homeWins != null ? num(home ? fx.homeWins : fx.awayWins) : mw;
  const oppWins = fx.homeWins != null ? num(home ? fx.awayWins : fx.homeWins) : ow;
  const wonSeries = myWins > oppWins;
  c.series[wonSeries ? 'w' : 'l']++;
  s.series[wonSeries ? 'w' : 'l']++;
  const hh = c.h2h[String(oppId)] || (c.h2h[String(oppId)] = { id: oppId, name: opp, w: 0, l: 0 });
  hh.name = opp;
  hh[wonSeries ? 'w' : 'l']++;
  if (wonSeries) {
    c.streak.cur++;
    if (c.streak.cur > c.streak.best) { c.streak.best = c.streak.cur; c.streak.bestTo = fx.date; }
    if (oppWins === 0 && myWins >= 3) c.counts.sweeps++;
    if (wasDown02) c.counts.comebacks++;
  } else {
    c.streak.cur = 0;
  }
  if (fx.mvpId != null && seenInSeries.has(fx.mvpId)) c.players[String(fx.mvpId)].mvps++;
  return true;
}

function finalSlot(ev) {
  const slots = Array.isArray(ev.slots) ? ev.slots : [];
  const refs = new Set();
  for (const sl of slots) for (const side of [sl.a, sl.b]) if (side && side.from) refs.add(side.from);
  const term = slots.filter((sl) => sl && !refs.has(sl.id) && sl.stage !== 'group' && sl.winner != null);
  return term.find((sl) => sl.stage === 'final') || (term.length === 1 ? term[0] : null);
}

function processEvent(state, h, ev) {
  const clubId = state.userTeamId;
  const c = clubBucket(state, h, clubId);
  const date = ev.endDate || state.currentDate;
  const entry = { eventId: ev.id, name: ev.name || ev.kind || 'Event', kind: ev.kind || '', year: yearOf(date), season: num(state.season), date };
  if (ev.championId === clubId) {
    c.titles.push(entry);
    seasonBucket(c, state, date).titles.push(entry.name);
    const team = teamOf(state, clubId);
    for (const pid of (team && team.playerIds) || []) {
      const p = c.players[String(pid)];
      if (p) p.titles++;
    }
    return;
  }
  const fin = finalSlot(ev);
  if (fin && (fin.teamA === clubId || fin.teamB === clubId)) c.finals.push(entry);
}

function metricValues(c) {
  let playerMaxGoals = 0;
  for (const p of Object.values(c.players)) playerMaxGoals = Math.max(playerMaxGoals, p.goals);
  return {
    seriesWins: c.series.w,
    seriesPlayed: c.series.w + c.series.l,
    goalsFor: c.goals.f,
    bestStreak: c.streak.best,
    sweeps: c.counts.sweeps,
    comebacks: c.counts.comebacks,
    cleanSheets: c.counts.cleanSheets,
    hattricks: c.counts.hattricks,
    fiveGoalGames: c.counts.fiveGoalGames,
    finalsReached: c.finals.length + c.titles.length,
    titles: c.titles.length,
    majorTitles: c.titles.filter((t) => t.kind === 'major').length,
    worldsTitles: c.titles.filter((t) => t.kind === 'worlds').length,
    playerMaxGoals,
    legends: c.legends.length,
  };
}

function checkAchievements(h, c, date) {
  const m = metricValues(c);
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (num(m[a.metric]) >= a.target && unlock(h, c, a.key, date)) fresh.push(a.key);
  }
  return fresh;
}

// Scan the live state for anything new. Idempotent: fixtures/events are only counted once.
function update(state) {
  if (!isCareer(state)) return [];
  const h = ensure(state);
  const clubId = state.userTeamId;
  if (clubId == null || clubId < 0) return [];
  const today = state.currentDate || '';
  let touched = false;

  const fixtures = (Array.isArray(state.fixtures) ? state.fixtures : [])
    .filter((fx) => fx && fx.played && (fx.homeId === clubId || fx.awayId === clubId))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || num(a.id) - num(b.id));
  for (const fx of fixtures) {
    const k = fixtureKey(fx);
    if (h.seenFx[k]) continue;
    if (processFixture(state, h, fx)) { h.seenFx[k] = fx.date || today; touched = true; }
  }

  for (const ev of Array.isArray(state.events) ? state.events : []) {
    if (!ev || ev.stage !== 'done') continue;
    const k = [ev.id, ev.startDate, clubId].join('|');
    if (h.seenEv[k]) continue;
    h.seenEv[k] = ev.endDate || today;
    processEvent(state, h, ev);
    touched = true;
  }

  const c = h.clubs[String(clubId)];
  let fresh = [];
  if (c) fresh = checkAchievements(h, c, today);

  if (touched && today) {
    for (const store of [h.seenFx, h.seenEv]) {
      for (const [k, d] of Object.entries(store)) if (d && daysBetween(d, today) > KEEP_KEYS_DAYS) delete store[k];
    }
  }
  return fresh;
}

function legendCandidate(p) {
  return p.games >= 40 && (p.goals >= 100 || p.mvps >= 10 || p.titles >= 2);
}

function applyCommand(state, cmd) {
  if (!isCareer(state)) return { ok: false, error: 'No career loaded.' };
  const h = ensure(state);
  const c = h.clubs[String(state.userTeamId)];
  if (!cmd || typeof cmd !== 'object') return { ok: false, error: 'Bad command.' };
  if (cmd.op === 'seen') {
    h.unseen = h.unseen.filter((u) => u.teamId !== state.userTeamId);
    return { ok: true };
  }
  if (cmd.op === 'induct' || cmd.op === 'uninduct') {
    if (!c) return { ok: false, error: 'No club history yet.' };
    const pid = Number(cmd.pid);
    const p = c.players[String(pid)];
    if (!p) return { ok: false, error: 'Player has no games for this club.' };
    const idx = c.legends.findIndex((l) => l.pid === pid);
    if (cmd.op === 'induct') {
      if (idx === -1) c.legends.push({ pid, name: p.name, date: state.currentDate || '' });
      checkAchievements(h, c, state.currentDate || '');
    } else if (idx !== -1) {
      c.legends.splice(idx, 1);
    }
    return { ok: true };
  }
  return { ok: false, error: 'Unknown Hall of Fame command.' };
}

function topBy(players, field, extra) {
  return players
    .filter((p) => num(p[field]) > 0)
    .sort((a, b) => num(b[field]) - num(a[field]) || b.games - a.games)
    .slice(0, TOP_N)
    .map((p) => ({ pid: p.id, name: p.name, value: num(p[field]), games: p.games, ...(extra ? extra(p) : {}) }));
}

function buildSnapshot(state) {
  if (!isCareer(state)) return null;
  const h = ensure(state);
  const clubId = state.userTeamId;
  const c = h.clubs[String(clubId)] || null;
  const live = (pid) => {
    const pl = playerOf(state, pid);
    return pl ? { name: pl.name, atClub: pl.teamId === clubId && !pl.retired, retired: !!pl.retired } : { name: null, atClub: false, retired: false };
  };
  const otherClubs = Object.values(h.clubs)
    .filter((x) => x.teamId !== clubId)
    .map((x) => ({ teamId: x.teamId, name: x.name, series: x.series, titles: x.titles.length }));
  if (!c) return { v: SCHEMA, since: h.since, club: null, otherClubs, unseen: [] };

  const players = Object.values(c.players).map((p) => {
    const lv = live(p.id);
    return { ...p, name: lv.name || p.name, atClub: lv.atClub, retired: lv.retired };
  });
  const legends = c.legends.map((l) => {
    const p = c.players[String(l.pid)] || {};
    const lv = live(l.pid);
    return { pid: l.pid, name: lv.name || l.name, date: l.date, games: num(p.games), goals: num(p.goals), assists: num(p.assists), saves: num(p.saves), mvps: num(p.mvps), titles: num(p.titles), first: p.first || '', last: p.last || '' };
  });
  const legendIds = new Set(c.legends.map((l) => l.pid));
  const m = metricValues(c);

  const seasons = Object.values(c.seasons)
    .sort((a, b) => b.season - a.season || b.year - a.year)
    .map((s) => {
      let top = null;
      for (const [pid, g] of Object.entries(s.scorers)) if (!top || g > top.goals) top = { pid: Number(pid), goals: g };
      if (top) top.name = (live(top.pid).name) || (c.players[String(top.pid)] || {}).name || '#' + top.pid;
      return { season: s.season, year: s.year, series: s.series, games: s.games, goals: s.goals, titles: s.titles, top };
    });

  const h2h = Object.values(c.h2h).filter((x) => x.w + x.l >= 2);
  const nemesis = h2h.slice().sort((a, b) => (b.l - b.w) - (a.l - a.w) || b.l - a.l)[0] || null;
  const favourite = h2h.slice().sort((a, b) => (b.w - b.l) - (a.w - a.l) || b.w - a.w)[0] || null;

  return {
    v: SCHEMA,
    since: c.firstFx || players.map((p) => p.first).filter(Boolean).sort()[0] || c.since || h.since,
    club: {
      teamId: clubId,
      name: c.name,
      series: c.series,
      games: c.games,
      goals: c.goals,
      streak: c.streak,
      counts: c.counts,
      titles: c.titles.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))),
      finals: c.finals.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))),
      nemesis: nemesis && nemesis.l > nemesis.w ? nemesis : null,
      favourite: favourite && favourite.w > favourite.l ? favourite : null,
    },
    records: c.records,
    leaders: {
      goals: topBy(players, 'goals'),
      assists: topBy(players, 'assists'),
      saves: topBy(players, 'saves'),
      mvps: topBy(players, 'mvps'),
      games: topBy(players, 'games', (p) => ({ wins: p.wins })),
    },
    players: players
      .sort((a, b) => b.games - a.games)
      .map((p) => ({ pid: p.id, name: p.name, games: p.games, wins: p.wins, goals: p.goals, assists: p.assists, saves: p.saves, mvps: p.mvps, titles: p.titles, first: p.first, last: p.last, atClub: p.atClub, retired: p.retired, legend: legendIds.has(p.id), candidate: !legendIds.has(p.id) && legendCandidate(p) })),
    legends,
    seasons,
    achievements: ACHIEVEMENTS.map((a) => ({ key: a.key, icon: a.icon, target: a.target, progress: Math.min(num(m[a.metric]), a.target), unlocked: c.ach[a.key] || null })),
    unseen: h.unseen.filter((u) => u.teamId === clubId).map((u) => u.key),
    otherClubs,
  };
}

module.exports = { SCHEMA, ACHIEVEMENTS, update, buildSnapshot, applyCommand, ensure, isCareer, finalSlot };
