'use strict';
// node test/test_hof.js [save.json ...]   (saves are only read, never written)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const hof = require('../src/hof-engine');
const { wrapEngine } = require('../src/inproc');

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };

// ---------- synthetic career ----------
function line(id, goals, saves) { return { id, name: 'P' + id, goals, assists: 0, saves: saves || 0, shots: goals, points: goals * 100 }; }
// clubHome=false puts the club's players on the away side.
function game(hg, ag, clubHome = true) {
  const club = (g) => [line(1, g), line(2, 0, 2), line(3, 0)];
  return clubHome
    ? { homeGoals: hg, awayGoals: ag, homeLines: club(hg), awayLines: [line(9, ag)] }
    : { homeGoals: hg, awayGoals: ag, homeLines: [line(9, hg)], awayLines: club(ag) };
}
function makeState() {
  return {
    season: 1, currentDate: '2027-01-10', startDate: '2026-10-01', userTeamId: 10, userPlayerId: 1,
    teams: [{ id: 10, name: 'Home FC', playerIds: [1, 2, 3] }, { id: 20, name: 'Rivals', playerIds: [9] }],
    players: [{ id: 1, name: 'Ace', teamId: 10 }, { id: 2, name: 'Wall', teamId: 10 }, { id: 3, name: 'Third', teamId: 10 }, { id: 9, name: 'Enemy', teamId: 20 }],
    events: [], fixtures: [],
  };
}

console.log('synthetic:');
const st = makeState();
// Reverse sweep: lose 2, win 3 (one game with a 5-goal player and a clean sheet).
st.fixtures.push({ id: 1, date: '2027-01-05', eventId: 1, homeId: 10, awayId: 20, played: true, homeWins: 3, awayWins: 2, mvpId: 1,
  games: [game(1, 2), game(0, 3), game(5, 0), game(2, 1), game(3, 2)] });
// Sweep 3-0
st.fixtures.push({ id: 2, date: '2027-01-08', eventId: 1, homeId: 20, awayId: 10, played: true, homeWins: 0, awayWins: 3, mvpId: 9,
  games: [game(0, 2, false), game(1, 4, false), game(0, 1, false)] });
// Unplayed fixture must be ignored
st.fixtures.push({ id: 3, date: '2027-01-09', homeId: 10, awayId: 20, played: false, games: [game(1, 0)] });
st.events.push({ id: 1, name: 'Open 1', kind: 'open', stage: 'done', startDate: '2027-01-05', endDate: '2027-01-08', championId: 10,
  slots: [{ id: 'f', stage: 'final', teamA: 10, teamB: 20, winner: 10 }] });

const fresh = hof.update(st);
const c = st.hof.clubs['10'];
ok('series and games counted', () => {
  assert.deepStrictEqual(c.series, { w: 2, l: 0 });
  assert.deepStrictEqual(c.games, { w: 6, l: 2 });
});
ok('goals from the club side (away fixture flipped)', () => {
  assert.strictEqual(c.goals.f, 1 + 0 + 5 + 2 + 3 + 2 + 4 + 1);
  assert.strictEqual(c.goals.a, 2 + 3 + 0 + 1 + 2 + 0 + 1 + 0);
});
ok('only club lines feed player stats; series MVP only for own players', () => {
  assert.strictEqual(c.players['1'].goals, 11 + 7);
  assert.strictEqual(c.players['1'].mvps, 1);
  assert.ok(!c.players['9']);
});
ok('comeback, sweep, clean sheet, five-goal game detected', () => {
  assert.strictEqual(c.counts.comebacks, 1);
  assert.strictEqual(c.counts.sweeps, 1);
  assert.ok(c.counts.cleanSheets >= 1);
  assert.strictEqual(c.counts.fiveGoalGames, 1);
});
ok('title recorded and credited to roster', () => {
  assert.strictEqual(c.titles.length, 1);
  assert.strictEqual(c.players['1'].titles, 1);
});
ok('achievements unlocked once', () => {
  for (const k of ['first_win', 'sweep', 'comeback', 'clean_sheet', 'hattrick', 'five_goals', 'first_title', 'first_final']) assert.ok(fresh.includes(k), k);
  assert.strictEqual(hof.update(st).length, 0);
});
ok('update is idempotent', () => {
  const before = JSON.stringify(st.hof);
  hof.update(st); hof.update(st);
  assert.strictEqual(JSON.stringify(st.hof), before);
});
ok('history survives a new season (fixtures wiped, ids reused)', () => {
  st.season = 2; st.currentDate = '2027-10-05';
  st.events = [];
  st.fixtures = [{ id: 1, date: '2027-10-04', homeId: 10, awayId: 20, played: true, homeWins: 0, awayWins: 3, games: [game(0, 1), game(0, 1), game(0, 1)] }];
  assert.strictEqual(hof.update(st).length, 0, 'reused fixture id with a new date is a new fixture, not an achievement repeat');
  hof.update(st);
  assert.deepStrictEqual(c.series, { w: 2, l: 1 });
  assert.strictEqual(c.streak.cur, 0);
  assert.strictEqual(c.streak.best, 2);
  assert.strictEqual(Object.keys(c.seasons).length, 2);
});
ok('commands: induct / uninduct / seen', () => {
  assert.strictEqual(hof.applyCommand(st, { op: 'induct', pid: 1 }).ok, true);
  assert.strictEqual(c.legends.length, 1);
  assert.ok(c.ach.first_legend);
  assert.strictEqual(hof.applyCommand(st, { op: 'induct', pid: 999 }).ok, false);
  hof.applyCommand(st, { op: 'uninduct', pid: 1 });
  assert.strictEqual(c.legends.length, 0);
  hof.applyCommand(st, { op: 'seen' });
  assert.strictEqual(st.hof.unseen.length, 0);
});
ok('snapshot is JSON-safe and complete', () => {
  const s = JSON.parse(JSON.stringify(hof.buildSnapshot(st)));
  assert.strictEqual(s.club.name, 'Home FC');
  assert.strictEqual(s.leaders.goals[0].name, 'Ace');
  assert.strictEqual(s.achievements.length, hof.ACHIEVEMENTS.length);
  assert.strictEqual(s.seasons[0].season, 2);
  assert.strictEqual(s.since, '2027-01-05', 'since = first recorded fixture, not install day');
});
ok('engine wrapper: placeBet command channel + passthrough + update on advance', () => {
  const calls = [];
  const engine = {
    advance(state) { calls.push('advance'); state.fixtures.push({ id: 50, date: '2027-10-06', homeId: 10, awayId: 20, played: true, homeWins: 3, awayWins: 0, games: [game(1, 0), game(1, 0), game(1, 0)] }); return { stopped: 'day' }; },
    placeBet(state, kind) { calls.push('bet:' + kind); return { ok: true, real: true }; },
  };
  wrapEngine(engine);
  assert.strictEqual(wrapEngine(engine), false);
  engine.advance(st, Math.random, 'day');
  assert.deepStrictEqual(c.series, { w: 3, l: 1 });
  assert.strictEqual(engine.placeBet(st, 'hof:{"op":"induct","pid":2}').ok, true);
  assert.strictEqual(engine.placeBet(st, 'hof:not json').ok, false);
  assert.strictEqual(engine.placeBet(st, 'series', 1, 10, 50).real, true);
  assert.deepStrictEqual(calls, ['advance', 'bet:series']);
});
ok('no career / player-less state is ignored', () => {
  assert.deepStrictEqual(hof.update(null), []);
  assert.deepStrictEqual(hof.update({}), []);
  assert.strictEqual(hof.buildSnapshot({}), null);
});

// ---------- real saves (read-only) ----------
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const saves = process.argv.slice(2).length ? process.argv.slice(2)
  : (fs.existsSync(saveDir) ? fs.readdirSync(saveDir).filter((f) => f.endsWith('.json')).map((f) => path.join(saveDir, f)) : []);
for (const file of saves) {
  console.log('save: ' + path.basename(file));
  const real = JSON.parse(fs.readFileSync(file, 'utf8')).state;
  delete real.hof;
  const clubId = real.userTeamId;
  const played = real.fixtures.filter((fx) => fx.played && (fx.homeId === clubId || fx.awayId === clubId) && fx.games && fx.games.length);
  const t0 = Date.now();
  const unlocked = hof.update(real);
  const ms = Date.now() - t0;
  const rc = real.hof.clubs[String(clubId)];
  ok(`series = played club fixtures (${played.length}), ${ms} ms`, () => assert.strictEqual(rc.series.w + rc.series.l, played.length));
  ok('series W/L matches homeWins/awayWins', () => {
    const w = played.filter((fx) => (fx.homeId === clubId ? fx.homeWins > fx.awayWins : fx.awayWins > fx.homeWins)).length;
    assert.strictEqual(rc.series.w, w);
  });
  ok('titles = done events with championId = club', () => {
    const n = real.events.filter((ev) => ev.stage === 'done' && ev.championId === clubId).length;
    assert.strictEqual(rc.titles.length, n);
  });
  ok('player goals add up to team goals (±own goals)', () => {
    const pg = Object.values(rc.players).reduce((a, p) => a + p.goals, 0);
    assert.ok(Math.abs(pg - rc.goals.f) <= Math.max(3, rc.goals.f * 0.05), `${pg} vs ${rc.goals.f}`);
  });
  const snap = hof.buildSnapshot(real);
  const size = JSON.stringify(snap).length;
  ok(`snapshot builds (${size} bytes), state.hof ${JSON.stringify(real.hof).length} bytes`, () => assert.ok(snap.club && size < 200000));
  console.log(`    ${rc.name}: series ${rc.series.w}-${rc.series.l}, games ${rc.games.w}-${rc.games.l}, goals ${rc.goals.f}:${rc.goals.a}, titles ${rc.titles.map((x) => x.name).join(', ') || '-'}, finals lost ${rc.finals.length}, best streak ${rc.streak.best}`);
  console.log(`    top scorer: ${snap.leaders.goals[0] ? snap.leaders.goals[0].name + ' ' + snap.leaders.goals[0].value : '-'} | unlocked: ${unlocked.join(', ') || '-'}`);
}

console.log(`\n${passed} checks passed`);
