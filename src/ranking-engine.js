'use strict';
// World top: all-time and current player rankings.
// All-time uses every RLCS title a player holds: the real ones the Hub ships (built from Liquipedia,
// RLCS Season 1 2016 → RLCS 2026) plus everything won in this career, so legends grow as you play.
// Current mixes rating, form, this season's numbers and the last two years of titles.
const U = require('./util');

const ID = 'ranking';
const PTS = {
  worlds_champion: 100, worlds_finalist: 45, worlds_elite: 18, worlds_contender: 8,
  season_champion: 70, season_finalist: 30, season_elite: 12,
  major_champion: 45, major_finalist: 20, major_elite: 9, major_contender: 4,
  solo_champion: 30, regional_champion: 6, regional_finalist: 3, wildcard_contender: 3, contender: 1.5, challenger: 0.5,
};
const MVP_PTS = 20;
const cache = new WeakMap();
const keyOf = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// The Hub's own Liquipedia-built title list (data/real-titles.json next to engine/league.js).
// It also knows real players who are not in this world (retired legends like Turbopolsa).
let realCache;
function realTitles() {
  if (realCache !== undefined) return realCache;
  realCache = null;
  try {
    const fs = require('fs');
    const path = require('path');
    const key = Object.keys(require.cache).find((k) => /[\\/]engine[\\/]league\.js$/.test(k));
    if (key) {
      const f = path.join(path.dirname(key), '..', 'data', 'real-titles.json');
      realCache = JSON.parse(fs.readFileSync(f, 'utf8'));
    }
  } catch { realCache = null; }
  return realCache;
}

function yearOf(state) { return Number(String(state.currentDate || '').slice(0, 4)) || 2027; }

function teamName(state, p) {
  if (p.retired) return { name: null, status: 'retired' };
  const t = U.teamOf(state, p.teamId);
  return t ? { name: t.name, status: 'team', id: t.id } : { name: null, status: 'fa' };
}

function mvpCounts(state) {
  const A = state.xtra && state.xtra.awards;
  const out = {};
  for (const h of (A && A.history) || []) {
    const m = h && h.awards && h.awards.mvp;
    if (m && m.id != null) out[m.id] = (out[m.id] || 0) + 1;
  }
  return out;
}

function allTime(state) {
  const mvps = mvpCounts(state);
  const rows = [];
  for (const p of state.players) {
    if (!p || !Array.isArray(p.titles) || (!p.titles.length && !mvps[p.id])) continue;
    let pts = 0; let real = 0; let career = 0;
    const c = { worlds: 0, majors: 0, solo: 0, finals: 0, regional: 0 };
    let first = 9999; let last = 0;
    for (const t of p.titles) {
      const v = PTS[t && t.k] || 0;
      if (!v) continue;
      pts += v;
      if (t.id) real += v; else career += v;
      if (t.k === 'worlds_champion' || t.k === 'season_champion') c.worlds++;
      else if (t.k === 'major_champion') c.majors++;
      else if (t.k === 'solo_champion') c.solo++;
      else if (/finalist/.test(t.k)) c.finals++;
      else if (t.k === 'regional_champion') c.regional++;
      const y = U.num(t.y);
      if (y) { first = Math.min(first, y); last = Math.max(last, y); }
    }
    if (mvps[p.id]) { pts += MVP_PTS * mvps[p.id]; career += MVP_PTS * mvps[p.id]; }
    if (pts < 10) continue;
    const tm = teamName(state, p);
    rows.push({
      id: p.id, name: p.name, nation: p.nation || '', age: p.age, rating: U.num(p.rating), team: tm.name, status: tm.status,
      mine: tm.id === state.userTeamId, user: !!p.isUser, pts: Math.round(pts), real: Math.round(real), career: Math.round(career),
      worlds: c.worlds, majors: c.majors, solo: c.solo, finals: c.finals, regional: c.regional, mvps: mvps[p.id] || 0,
      span: first < 9999 ? (first === last ? String(first) : first + '–' + last) : '',
    });
  }
  // legends from the real title list who never made it into this world
  const RT = realTitles();
  if (RT && RT.players && RT.titles) {
    const have = new Set(state.players.map((p) => keyOf(p && p.name)));
    for (const lp of Array.isArray(RT.players) ? RT.players : Object.values(RT.players)) {
      if (!lp || have.has(keyOf(lp.name))) continue;
      let pts = 0; const c = { worlds: 0, majors: 0, solo: 0, finals: 0 };
      let first = 9999; let last = 0;
      for (const id of lp.titles || []) {
        const t = RT.titles[id];
        const v = t ? PTS[t.k] || 0 : 0;
        if (!v) continue;
        pts += v;
        if (t.k === 'worlds_champion' || t.k === 'season_champion') c.worlds++;
        else if (t.k === 'major_champion') c.majors++;
        else if (t.k === 'solo_champion') c.solo++;
        else if (/finalist/.test(t.k)) c.finals++;
        first = Math.min(first, U.num(t.y)); last = Math.max(last, U.num(t.y));
      }
      if (pts < 60) continue;
      have.add(keyOf(lp.name));
      rows.push({ id: null, name: lp.name, nation: '', age: null, rating: 0, team: null, status: 'legend', mine: false, user: false, pts: Math.round(pts), real: Math.round(pts), career: 0,
        worlds: c.worlds, majors: c.majors, solo: c.solo, finals: c.finals, regional: 0, mvps: 0, span: first < 9999 ? (first === last ? String(first) : first + '–' + last) : '' });
    }
  }
  rows.sort((a, b) => b.pts - a.pts || b.worlds - a.worlds || b.majors - a.majors || b.rating - a.rating);
  return rows.slice(0, 50).map((r, i) => Object.assign(r, { rank: i + 1 }));
}

function current(state) {
  const yr = yearOf(state);
  const rows = [];
  for (const p of state.players) {
    if (!p || p.retired) continue;
    const t = U.teamOf(state, p.teamId);
    if (!t) continue; // free agents are not "current" top players
    const s = p.season || {};
    const g = U.num(s.games);
    let recent = 0;
    for (const ti of p.titles || []) if (U.num(ti.y) >= yr - 1) recent += (PTS[ti.k] || 0) * (U.num(ti.y) >= yr ? 1 : 0.5);
    const perGame = g >= 6 ? (U.num(s.goals) * 1.0 + U.num(s.assists) * 0.7 + U.num(s.saves) * 0.5) / g : 0;
    const winRate = U.num(s.wins) + U.num(s.losses) >= 3 ? U.num(s.wins) / (U.num(s.wins) + U.num(s.losses)) : 0.5;
    const score = U.num(p.rating) * 1.0 + U.num(p.form) * 0.6 + Math.min(14, recent * 0.08) + Math.min(6, perGame * 2.2) + (winRate - 0.5) * 6 + (g >= 6 ? Math.min(3, U.num(s.mvps) * 0.4) : 0);
    rows.push({
      id: p.id, name: p.name, nation: p.nation || '', age: p.age, team: t.name, mine: t.id === state.userTeamId, user: !!p.isUser,
      rating: U.num(p.rating), form: U.num(p.form), games: g, goals: U.num(s.goals), assists: U.num(s.assists), saves: U.num(s.saves),
      mvps: U.num(s.mvps), winRate: Math.round(winRate * 100), recent: Math.round(recent), score: Math.round(score * 10) / 10,
    });
  }
  rows.sort((a, b) => b.score - a.score || b.rating - a.rating);
  return rows.slice(0, 50).map((r, i) => Object.assign(r, { rank: i + 1 }));
}

function teamsTop(state) {
  const rank = state.ranking && typeof state.ranking === 'object' ? state.ranking : {};
  return state.teams.filter(Boolean).map((t) => {
    const ids = (t.lineup && t.lineup.length ? t.lineup : t.playerIds || []).slice(0, 3);
    const ps = ids.map((id) => U.playerOf(state, id)).filter(Boolean);
    const str = ps.length ? ps.reduce((s, p) => s + U.num(p.rating), 0) / ps.length : 0;
    return { id: t.id, name: t.name, region: t.region, pts: U.num(rank[t.id]), strength: Math.round(str * 10) / 10, mine: t.id === state.userTeamId, roster: ps.map((p) => p.name) };
  }).sort((a, b) => b.pts - a.pts || b.strength - a.strength).slice(0, 20).map((r, i) => Object.assign(r, { rank: i + 1 }));
}

function snapshot(state) {
  const key = state.currentDate + '|' + (state.fixtures || []).filter((f) => f && f.played).length + '|' + state.players.length;
  const c = cache.get(state);
  if (c && c.key === key) return c.val;
  const val = { allTime: allTime(state), current: current(state), teams: teamsTop(state), year: yearOf(state), source: 'Liquipedia (RLCS 2016–2026, data shipped with the Hub) + this career' };
  cache.set(state, { key, val });
  return val;
}

module.exports = { id: ID, snapshot, _test: { allTime, current, PTS } };
