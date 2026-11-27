'use strict';
// My Career: every club you have managed, with dates, why you left, series record, finals and titles, plus a
// season-by-season line. Built up day by day, because the Hub wipes a season's fixtures when the next one starts.
const U = require('./util');

const ID = 'mycareer';

function ensure(state) {
  state.xtra = state.xtra || {};
  const c = state.xtra.mycareer || (state.xtra.mycareer = { stints: [], seasons: [], seen: {} });
  c.stints = c.stints || []; c.seasons = c.seasons || []; c.seen = c.seen || {};
  return c;
}
const cur = (c) => c.stints[c.stints.length - 1] || null;
const seasonKey = (state) => String(state.season || 1);

function open(state, c) {
  const t = U.teamOf(state, state.userTeamId);
  c.stints.push({ teamId: state.userTeamId, team: t ? t.name : '?', region: t ? t.region : '', from: state.currentDate, to: null, reason: null, w: 0, l: 0, finals: 0, titles: [] });
}

function seasonRow(state, c) {
  const k = seasonKey(state);
  let r = c.seasons.find((x) => x.season === k && x.teamId === state.userTeamId);
  if (!r) { const t = U.teamOf(state, state.userTeamId); r = { season: k, teamId: state.userTeamId, team: t ? t.name : '?', w: 0, l: 0, finals: 0, titles: [] }; c.seasons.push(r); }
  return r;
}

function track(state) {
  const c = ensure(state);
  let s = cur(c);
  // a new club (moved, or a fresh start after being sacked)
  if (!s || s.teamId !== state.userTeamId) {
    if (s && !s.to) { s.to = state.currentDate; s.reason = s.reason || (c.wasSacked ? 'sacked' : 'moved'); }
    open(state, c);
    s = cur(c);
  }
  if (state.sacked && !c.wasSacked && s && !s.to) { s.to = state.currentDate; s.reason = 'sacked'; }
  c.wasSacked = !!state.sacked;
  // series played by your club, each counted once
  const seen = c.seen[seasonKey(state)] || (c.seen[seasonKey(state)] = {});
  for (const f of state.fixtures || []) {
    if (!f || !f.played || seen[f.id]) continue;
    if (f.homeId !== s.teamId && f.awayId !== s.teamId) continue;
    seen[f.id] = 1;
    const home = f.homeId === s.teamId;
    const won = (home ? U.num(f.homeWins) : U.num(f.awayWins)) > (home ? U.num(f.awayWins) : U.num(f.homeWins));
    const row = seasonRow(state, c);
    if (won) { s.w++; row.w++; } else { s.l++; row.l++; }
    if (f.stage === 'final') {
      s.finals++; row.finals++;
      if (won) {
        const ev = (state.events || []).find((e) => e && e.id === f.eventId);
        const title = (ev ? ev.name : 'Final') + ' ' + String(f.date || state.currentDate).slice(0, 4);
        s.titles.push(title); row.titles.push(title);
      }
    }
  }
}

function init(state) { track(state); }
function onTick(state) { track(state); }

function snapshot(state) {
  const c = ensure(state);
  return {
    stints: c.stints.map((s) => Object.assign({}, s, { days: U.daysBetween(s.from, s.to || state.currentDate) })).reverse(),
    seasons: c.seasons.slice().reverse(),
    total: c.stints.reduce((a, s) => ({ w: a.w + s.w, l: a.l + s.l, titles: a.titles + s.titles.length, clubs: a.clubs + 1 }), { w: 0, l: 0, titles: 0, clubs: 0 }),
  };
}

module.exports = { id: ID, init, onTick, snapshot, _test: { track } };
