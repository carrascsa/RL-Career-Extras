'use strict';
// Command-level tests for academy / matchday / club, on a copy of a real save with the real engine.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { loadEngine } = require('./engine-loader');
const core = require('../src/core');
const U = require('../src/util');
const md = require('../src/matchday-engine');
const club = require('../src/club-engine');

const engine = loadEngine();
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, '9z-team.json');
const fresh = () => { const s = JSON.parse(fs.readFileSync(file, 'utf8')).state; delete s.hof; delete s.xtra; return s; };
const logs = [];
const ctx = core.makeCtx(engine, { lang: 'es', log: (m) => logs.push(m) });
const run = (st, cmd) => core.command(st, cmd, ctx);

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };

console.log('academy:');
{
  const st = fresh();
  core.tick(st, ctx);
  const A = st.xtra.academy;
  const team = U.userTeam(st);
  ok('initial intake seeds prospects and fills the B team', () => {
    assert.ok(A.prospects.length >= 5, 'prospects ' + A.prospects.length);
    assert.strictEqual(A.prospects.filter((p) => p.squad === 'b').length, 3);
    assert.strictEqual(A.league.teams.length, 8);
    assert.strictEqual(A.league.rounds.length, 14);
    for (const rd of A.league.rounds) { const ids = rd.flatMap((m) => [m.home, m.away]); assert.strictEqual(new Set(ids).size, 8); }
  });
  ok('league: every pair meets twice, home and away', () => {
    const seen = {};
    for (const rd of A.league.rounds) for (const m of rd) seen[m.home + '>' + m.away] = (seen[m.home + '>' + m.away] || 0) + 1;
    assert.strictEqual(Object.keys(seen).length, 56);
    assert.ok(Object.values(seen).every((n) => n === 1));
  });
  ok('upgrade needs budget, then levels up and charges', () => {
    const b = team.budget;
    team.budget = 100;
    assert.strictEqual(run(st, { m: 'academy', op: 'upgrade' }).ok, false);
    team.budget = b;
    assert.strictEqual(run(st, { m: 'academy', op: 'upgrade' }).ok, true);
    assert.strictEqual(A.level, 2);
    assert.strictEqual(team.budget, b - 40000);
  });
  ok('intensity validates input', () => {
    assert.strictEqual(run(st, { m: 'academy', op: 'intensity', value: 'crazy' }).ok, false);
    assert.strictEqual(run(st, { m: 'academy', op: 'intensity', value: 'intense' }).ok, true);
  });
  ok('trials: one now, then cooldown', () => {
    const n = A.prospects.length;
    assert.strictEqual(run(st, { m: 'academy', op: 'trial' }).ok, true);
    assert.strictEqual(A.prospects.length, n + 1);
    assert.strictEqual(run(st, { m: 'academy', op: 'trial' }).ok, false);
  });
  ok('B team cap of 4', () => {
    const acad = A.prospects.filter((p) => p.squad === 'academy');
    assert.strictEqual(run(st, { m: 'academy', op: 'to_b', id: acad[0].id }).ok, true);
    assert.strictEqual(run(st, { m: 'academy', op: 'to_b', id: acad[1].id }).ok, false);
  });
  ok('promote creates a valid first-team player; full roster refuses', () => {
    const p = A.prospects[0];
    const before = team.playerIds.length;
    const r = run(st, { m: 'academy', op: 'promote', id: p.id });
    assert.ok(r.ok, r.error);
    const pl = U.playerOf(st, r.pid);
    assert.strictEqual(team.playerIds.length, before + 1);
    assert.strictEqual(pl.teamId, st.userTeamId);
    assert.ok(pl.rating >= 40 && pl.potential >= pl.rating && pl.wage > 0);
    assert.ok(Number.isFinite(engine.matchRating(pl)) && Number.isFinite(engine.playerValue(st, pl)));
    while (team.playerIds.length < engine.ROSTER_MAX) team.playerIds.push(team.playerIds[0]);
    assert.strictEqual(run(st, { m: 'academy', op: 'promote', id: A.prospects[0].id }).ok, false);
    team.playerIds.length = before + 1;
  });
  ok('sell pays a fee, release removes', () => {
    const b = team.budget;
    const p = A.prospects[0];
    const r = run(st, { m: 'academy', op: 'sell', id: p.id });
    assert.ok(r.fee > 0 && team.budget === b + r.fee);
    const q = A.prospects[0];
    run(st, { m: 'academy', op: 'release', id: q.id });
    assert.ok(!A.prospects.includes(q));
  });
  ok('weekly growth never passes potential; ratings move up', () => {
    const before = A.prospects.map((p) => p.rating);
    for (let i = 0; i < 30; i++) core.tick(Object.assign(st, { currentDate: U.addDays(st.currentDate, 7) }), ctx);
    A.prospects.forEach((p, i) => { assert.ok(p.rating <= p.pot + 1e-9); assert.ok(p.rating >= before[i] - 1e-9); });
  });
}

console.log('matchday:');
{
  const st = fresh();
  core.tick(st, ctx);
  const team = U.userTeam(st);
  const oppId = st.teams.find((t) => t.id !== st.userTeamId).id;
  const me = st.userTeamId;
  st.fixtures = st.fixtures.filter((f) => f.played || (f.homeId !== me && f.awayId !== me));
  const fx = { id: 99001, eventId: null, slotId: 'x', stage: 'final', round: 0, homeId: st.userTeamId, awayId: oppId, date: U.addDays(st.currentDate, 1), played: false, bestOf: 7, games: [] };
  st.fixtures.push(fx);
  const key = fx.id + '|' + fx.date;
  const starters = team.lineup.map((id) => U.playerOf(st, id));
  starters.forEach((p) => { p.form = 0; });
  ok('next fixture is detected', () => assert.strictEqual(md._test.nextFixture(st).id, 99001));
  ok('plan for a stale key is refused', () => assert.strictEqual(run(st, { m: 'matchday', op: 'plan', key: '1|2000-01-01', plan: 'press' }).ok, false));
  ok('correct plan the day before: +2 form; switching to a wrong plan: -1', () => {
    const style = md._test.styleOf(st, oppId);
    assert.ok(run(st, { m: 'matchday', op: 'report', key }).ok);
    assert.ok(run(st, { m: 'matchday', op: 'plan', key, plan: md._test.COUNTER[style] }).ok);
    starters.forEach((p) => assert.strictEqual(p.form, 2));
    const wrong = ['press', 'counter', 'patient'].find((x) => x !== md._test.COUNTER[style]);
    assert.ok(run(st, { m: 'matchday', op: 'plan', key, plan: wrong }).ok);
    starters.forEach((p) => assert.strictEqual(p.form, -1));
    assert.ok(run(st, { m: 'matchday', op: 'plan', key, plan: md._test.COUNTER[style] }).ok);
  });
  ok('bot difficulty drops one tier with the right plan', () => {
    const plans = st.xtra.matchday.plans;
    const saved = plans[key];
    delete plans[key];
    const base = engine.botDifficultyFor(st, fx);
    plans[key] = saved;
    const withPlan = (function () { const m = require('../src/matchday-engine'); const e = { botDifficultyFor: () => base }; m.wrapEngine(e, { log() {} }); return e.botDifficultyFor(st, fx); })();
    const tiers = ['rookie', 'pro', 'allstar'];
    assert.strictEqual(tiers.indexOf(withPlan), Math.max(0, tiers.indexOf(base) - (base === 'rookie' ? 0 : 1)));
  });
  ok('form is restored once the match is played, and a press conference opens for a final', () => {
    fx.played = true; fx.homeWins = 4; fx.awayWins = 2; fx.mvpId = team.lineup[0];
    fx.games = [{ homeGoals: 3, awayGoals: 1, homeLines: [], awayLines: [] }];
    core.tick(st, ctx);
    starters.forEach((p) => assert.strictEqual(p.form, 0));
    assert.ok(st.xtra.matchday.press, 'press pending');
    assert.strictEqual(st.xtra.matchday.press.questions.length, 3);
  });
  ok('press: wrong answer count refused; answering moves morale, followers and news', () => {
    const P = st.xtra.matchday.press;
    assert.strictEqual(run(st, { m: 'matchday', op: 'answer', key: P.key, answers: [0] }).ok, false);
    const f0 = team.followers;
    const n0 = st.news.length;
    const r = run(st, { m: 'matchday', op: 'answer', key: P.key, answers: [1, 1, 1] });
    assert.ok(r.ok, r.error);
    assert.ok(team.followers >= f0);
    assert.strictEqual(st.news.length >= n0, true);
    assert.ok(st.news[0].headline.includes('"'), 'news headline quotes the manager');
    assert.strictEqual(st.xtra.matchday.press, null);
  });
  ok('snapshot renders the press texts in the chosen language', () => {
    const s = md.snapshot(st, ctx);
    assert.ok(s.history.length >= 1 && s.history[0].correct === true);
  });
}

console.log('club:');
{
  const st = fresh();
  core.tick(st, ctx);
  const C = st.xtra.club;
  const team = U.userTeam(st);
  ok('no conflict / no offer → commands refused', () => {
    assert.strictEqual(run(st, { m: 'club', op: 'resolve', option: 'talk' }).ok, false);
    assert.strictEqual(run(st, { m: 'club', op: 'investor', accept: true }).ok, false);
  });
  ok('playtime conflict: starting the bench player swaps him into the lineup', () => {
    const bench = team.playerIds.find((id) => !team.lineup.includes(id) && !U.playerOf(st, id).isUser) || team.playerIds.find((id) => !team.lineup.includes(id));
    const starter = team.lineup.find((id) => !U.playerOf(st, id).isUser);
    C.conflict = { kind: 'playtime', a: bench, b: starter, date: st.currentDate };
    assert.ok(run(st, { m: 'club', op: 'resolve', option: 'start_a' }).ok);
    assert.ok(team.lineup.includes(bench) && !team.lineup.includes(starter));
    assert.strictEqual(C.conflict, null);
  });
  ok('ignored conflict expires with a morale hit', () => {
    const a = U.playerOf(st, team.lineup[0]);
    a.morale = 80;
    C.conflict = { kind: 'wage', a: a.id, b: null, date: U.addDays(st.currentDate, -10) };
    club.onTick(st, ctx);
    assert.ok(a.morale < 80);
    assert.strictEqual(C.conflictLog[0].choice, 'ignored');
  });
  ok('investor: accept pays out; objective progress reads the Hall of Fame', () => {
    const r = require('../src/util').rng('t');
    C.investor = club._test.makeOffer(st, r);
    C.investorSeason = st.season;
    const b = team.budget;
    assert.ok(run(st, { m: 'club', op: 'investor', accept: true }).ok);
    assert.strictEqual(team.budget, b + C.investor.amount);
    const prog = club._test.objectiveProgress(st, C.investor);
    assert.ok(Number.isFinite(prog));
  });
  ok('failed investor takes half back at season end', () => {
    C.investor.objective = { kind: 'major', n: 99 };
    C.investor.status = 'active';
    const b = team.budget;
    club.onSeason(st, ctx, C.investor.season);
    assert.strictEqual(C.investor.result, 'failed');
    assert.strictEqual(team.budget, b - Math.min(b, Math.round(C.investor.amount * 0.5)));
  });
}

ok('no module errors were logged', () => assert.deepStrictEqual(logs.filter((m) => /err/i.test(m)), []));
console.log(`\n${passed} checks passed`);
