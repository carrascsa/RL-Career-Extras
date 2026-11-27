'use strict';
// Saves keep moving while the user plays. Tests that need "mid-season" bring an in-memory copy back to
// 9 days after the season's second Major: later official events are reset to not started, later fixtures
// to unplayed, and the add-on's prospects that were saved after that are dropped. The file is never written.
const U = require('../src/util');

function rewindMidSeason(s) {
  const majors = (s.events || []).filter((e) => e.kind === 'major' && e.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (majors.length < 2) return s;
  const target = U.addDays(majors[1].startDate, 9);
  if (s.currentDate <= target) return s;
  s.currentDate = target;
  if (s.lastProcessedDate && s.lastProcessedDate > target) s.lastProcessedDate = target;
  for (const e of s.events) if (e.startDate && e.startDate > target) { e.stage = 'pending'; e.field = []; }
  for (const f of s.fixtures || []) {
    if (f.date > target && f.played) { f.played = false; f.games = []; delete f.homeWins; delete f.awayWins; delete f.mvpId; }
  }
  const gone = new Set(s.players.filter((p) => p.xtProspect && (p.teamId == null || p.teamId < 0)).map((p) => p.id));
  s.players = s.players.filter((p) => !gone.has(p.id));
  return s;
}

module.exports = { rewindMidSeason };
