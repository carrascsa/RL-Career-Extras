'use strict';
// Backroom staff (5 roles x 3 tiers), regional recruitment, match simulation (next game / the rest of a live game)
// and the player creator / importer. In-memory copy of a save; images go to a temp folder.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { loadEngine, hubDir } = require('./engine-loader');
const core = require('../src/core');
const U = require('../src/util');
const Perks = require('../src/perks');

const engine = loadEngine();
core.wrapEngine(engine, { log: () => {}, lang: () => 'en' });
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, fs.readdirSync(saveDir).find((f) => f.endsWith('.json')));
const raw = fs.readFileSync(file, 'utf8');
const fresh = () => { const s = JSON.parse(raw).state; delete s.xtra; delete s.hof; return s; };
const mkCtx = () => {
  const c = core.makeCtx(engine, { lang: 'en' });
  c.playerBots = require(path.join(hubDir(), 'setup', 'player-bots'));
  c.customArtDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xt-staff-'));
  return c;
};

let passed = 0;
const queue = [];
const ok = (name, fn) => queue.push([name, fn]);
const budget = (s) => U.num(U.teamOf(s, s.userTeamId).budget);

ok('staff: hire costs two weeks of wages, one per role, wages paid every Monday', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const b0 = budget(s);
  const r = core.command(s, { m: 'staff', op: 'hire', role: 'mental', tier: 'mid' }, ctx);
  assert.ok(r.ok, r.error);
  assert.strictEqual(b0 - budget(s), Perks.ROLES.mental.wage[1] * 2);
  core.command(s, { m: 'staff', op: 'hire', role: 'mental', tier: 'best' }, ctx);
  assert.strictEqual(s.xtra.staff.members.filter((m) => m.role === 'mental').length, 1, 'replaces, not stacks');
  assert.strictEqual(Perks.perk(s, 'mental', 'moraleRefund'), 0.35);
  const snap = core.snapshot(s, ctx).staff;
  assert.ok(snap.roles.length === 5 && snap.roles.every((x) => x.candidates.length === 3));
  assert.ok(core.command(s, { m: 'staff', op: 'fire', role: 'mental' }, ctx).ok);
  assert.strictEqual(Perks.perk(s, 'mental', 'moraleRefund'), 0);
  assert.strictEqual(core.command(s, { m: 'staff', op: 'hire', role: 'chef', tier: 'mid' }, ctx).ok, false);
});

ok('mental coach: part of every morale drop comes back (Best: 35%)', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  core.command(s, { m: 'staff', op: 'hire', role: 'mental', tier: 'best' }, ctx);
  const p = s.players.find((x) => x.teamId === s.userTeamId && !x.isUser);
  p.morale = 80;
  const fake = { advance: () => { p.morale -= 20; return {}; } };
  require('../src/staff-engine').wrapEngine(fake, { log: () => {} });
  fake.advance(s);
  assert.ok(Math.abs(p.morale - (60 + 20 * 0.35)) < 1e-9, String(p.morale));
});

ok('engineer: 20% of a facility upgrade comes back (Best)', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  core.command(s, { m: 'staff', op: 'hire', role: 'engineer', tier: 'best' }, ctx);
  const t = U.teamOf(s, s.userTeamId);
  const fake = { buyFacility: () => { t.budget -= 100000; return { ok: true }; } };
  require('../src/staff-engine').wrapEngine(fake, { log: () => {} });
  const b0 = budget(s);
  fake.buyFacility(s, 'house');
  assert.strictEqual(b0 - budget(s), 80000);
});

ok('assistant coach: shorter training cooldown, and the Best one trains on his own', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  core.command(s, { m: 'staff', op: 'hire', role: 'assistant', tier: 'mid' }, ctx);
  s.training.lastDate = U.addDays(s.currentDate, -30);
  assert.ok(engine.trainingReady(s));
  const r = engine.runTraining(s);
  assert.ok(r && r.ok, JSON.stringify(r));
  assert.strictEqual(engine.trainingDaysLeft(s), 7 - 2, 'cooldown 7 -> 5 days');
  core.command(s, { m: 'staff', op: 'hire', role: 'assistant', tier: 'best' }, ctx);
  for (const id of engine.trainableIds(s)) { const p = U.playerOf(s, id); p.potential = Math.min(99, Math.floor(U.num(p.ratingExact)) + 5); if (p.potential <= U.num(p.ratingExact)) { p.rating = 90; p.ratingExact = 90; p.potential = 95; } }
  s.training.lastDate = U.addDays(s.currentDate, -30);
  core.tick(s, ctx);
  assert.ok(!engine.trainingReady(s), 'auto-trained');
  assert.ok(s.xtra.extras.autotrain.sessions >= 1);
});

ok('youth coach + facilities: academy intakes get better potential', () => {
  const a = fresh(); const ca = mkCtx(); core.tick(a, ca);
  const b = fresh(); const cb = mkCtx(); b.xtra = { staff: { members: [{ role: 'youth', tier: 'best', wage: 1 }], nextId: 2, log: [] } }; core.tick(b, cb);
  const pa = (a.xtra.academy.prospects || []).map((p) => p.pot); const pb = (b.xtra.academy.prospects || []).map((p) => p.pot);
  if (pa.length && pb.length) assert.ok(pb.reduce((x, y) => x + y, 0) / pb.length >= pa.reduce((x, y) => x + y, 0) / pa.length, 'not worse');
});

ok('regional recruitment: a top EU/NA player asks more from a small region, a refusal blocks the signing', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const R = require('../src/recruit-engine')._test;
  const p = { id: 999999, rating: 93, home: 'eu' };
  const st = R.stance(s, p, 'sam', () => 'eu');
  assert.ok(st.mult >= 2);
  assert.strictEqual(R.stance(s, { id: 1, rating: 93, home: 'eu' }, 'na', () => 'eu').mult, 1, 'EU to NA: normal');
  assert.strictEqual(R.stance(s, { id: 2, rating: 80, home: 'sam' }, 'eu', () => 'sam').mult, 0.9, 'moving up is cheaper');
  const fa = s.players.find((x) => x.freeAgent && !x.retired && !x.custom);
  s.negotiations = s.negotiations || {};
  s.negotiations['sign:' + fa.id + ':9'] = { demand: 1000, xtRegion: { refuse: true, mult: 2, home: 'eu', to: 'sam' } };
  const r = engine.attemptContract(s, 'sign', fa.id, 1e9, 3, () => 0.5);
  assert.ok(r && r.ok === false && /not interested/.test(r.error), JSON.stringify(r));
});

ok('simulate next game: one game of today\'s series, the rest stays open to play live', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const MS = require('../src/matchsim-engine')._test;
  const fx = s.fixtures.find((f) => !f.played && (f.homeId === s.userTeamId || f.awayId === s.userTeamId));
  fx.date = s.currentDate; s.pendingMatch = fx.id;
  assert.strictEqual(MS.todaysFixture(s), fx);
  const r = core.command(s, { m: 'matchsim', op: 'nextGame' }, ctx);
  assert.ok(r.ok, r.error);
  assert.strictEqual(fx.games.filter((g) => g && g.homeGoals != null).length, 1);
  if ((fx.bestOf || 1) > 1) assert.ok(!fx.played, 'series still open');
});

ok('simulate the rest: the live score and clock are kept, the remaining minutes added', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const MS = require('../src/matchsim-engine');
  const fx = s.fixtures.find((f) => !f.played && (f.homeId === s.userTeamId || f.awayId === s.userTeamId) && (f.bestOf || 1) > 1);
  fx.date = s.currentDate; s.pendingMatch = fx.id;
  // forced finals through the Hub's own simulator
  const T = MS._test;
  for (const [gh, ga, ot] of [[3, 1, 0], [2, 2, 1], [0, 4, 0]]) {
    const c = JSON.parse(JSON.stringify(fx));
    const g = engine.simulateNextGame(s, c, T.riggedRng(gh, ga, ot));
    if (gh === ga) assert.ok(g.overtime && g.homeGoals === gh + 1, 'overtime goal to the home side');
    else assert.ok(g.homeGoals === gh && g.awayGoals === ga, JSON.stringify([g.homeGoals, g.awayGoals]));
  }
  // live: started, 2-1 for blue with 40 s left, then the user left
  MS.liveUpdate(s, { k: 'start', score: [0, 0], remaining: 300 }, { blueIsHome: true });
  MS.liveUpdate(s, { k: 'goal', score: [2, 1], remaining: 40 }, { blueIsHome: true });
  MS.liveUpdate(s, { k: 'idle', score: [2, 1], remaining: 40 }, { blueIsHome: true });
  const snap = core.snapshot(s, ctx).matchsim;
  assert.ok(snap.unfinished && snap.unfinished.score[0] === 2 && snap.unfinished.remaining === 40, JSON.stringify(snap));
  const r = core.command(s, { m: 'matchsim', op: 'rest' }, ctx);
  assert.ok(r.ok, r.error);
  assert.ok(r.score[0] >= 2 && r.score[1] >= 1, 'never fewer goals than when you left: ' + r.score);
  assert.ok(r.score[0] + r.score[1] <= 3 + 4, 'only 40 seconds were left');
  assert.strictEqual(core.command(s, { m: 'matchsim', op: 'rest' }, ctx).ok, false, 'once only');
});

ok('player creator and importer: new free agents with region, rating and PlayStyle', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const n0 = s.players.length;
  const r = core.command(s, { m: 'editor', op: 'create', name: 'Test Semipro', nation: 'Spain', region: 'eu', age: 21, rating: 76, potential: 82, bot: 'rain' }, ctx);
  assert.ok(r.ok, r.error);
  const p = s.players.find((x) => x.name === 'Test Semipro');
  assert.ok(p.freeAgent && p.teamId === -1 && p.home === 'eu' && p.custom && p.bot === 'rain' && p.rating === 76);
  assert.strictEqual(ctx.playerBots.assignedBotFor(p), 'rain');
  const im = core.command(s, { m: 'editor', op: 'import', text: '# name, nation, region, age, rating\nImport One, Portugal, EU, 20, 74\nImport Two, , NA, 22, 78, 84, fury\nTest Semipro, Spain, EU, 21, 76\nBad Region, X, MARS, 20, 70' }, ctx);
  assert.deepStrictEqual(im.made, ['Import One', 'Import Two']);
  assert.strictEqual(im.skipped.length, 2);
  assert.strictEqual(s.players.length, n0 + 3);
});

ok('extras: free auto-training fills the plan, skips capped players and catches up missed sessions', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  core.command(s, { m: 'extras', op: 'autotrain', on: false }, ctx);
  const ids = engine.trainableIds(s); const cap = U.playerOf(s, ids[0]); const grow = U.playerOf(s, ids[1] != null ? ids[1] : ids[0]);
  if (grow !== cap) { cap.potential = Math.floor(U.num(cap.ratingExact)); cap.ratingExact = cap.potential; }
  grow.rating = 85; grow.ratingExact = 85; grow.potential = 95;
  s.training.lastDate = U.addDays(s.currentDate, -21); // three sessions missed during a long simulation
  const r = core.command(s, { m: 'extras', op: 'autotrain', on: true }, ctx);
  assert.ok(r.ok);
  const trainable = engine.trainableIds(s).map((id) => U.playerOf(s, id)).filter((p) => U.num(p.potential) - U.num(p.ratingExact) > 0.05);
  if (trainable.length) {
    assert.ok(r.ran >= 2 && r.ran <= 3, 'caught up: ' + r.ran);
    const planned = new Set(s.training.slots.map((x) => x && x.pid));
    assert.ok(!planned.has(cap.id) || cap === grow, cap.name + ' is at his potential and was skipped');
  }
  assert.ok(!engine.trainingReady(s));
});

ok('extras: inbox filters mark chosen categories as read, never ones that need an answer', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  s.inbox.push({ id: 1e9, type: 'news', unread: true, title: 'x' }, { id: 1e9 + 1, type: 'board', link: 'xtclublife', unread: true, title: 'y' }, { id: 1e9 + 2, type: 'offer_in', unread: true, resolved: false, title: 'z' });
  core.command(s, { m: 'extras', op: 'inbox', kind: 'news', value: true }, ctx);
  core.command(s, { m: 'extras', op: 'inbox', kind: 'transfers', value: true }, ctx);
  const get = (id) => s.inbox.find((m) => m.id === id);
  assert.strictEqual(get(1e9).unread, false);
  assert.strictEqual(get(1e9 + 1).unread, true, 'Career Extras messages not filtered');
  assert.strictEqual(get(1e9 + 2).unread, true, 'an open offer is never hidden');
});

ok('extras: profile title from the titles you won; squad and club editor', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const me = s.players.find((p) => p.isUser);
  me.titles = [{ k: 'major_champion', y: 2026, h: 'Paris' }];
  assert.ok(core.command(s, { m: 'extras', op: 'title', index: 0 }, ctx).ok);
  assert.ok(/Major Champion 2026/.test(core.snapshot(s, ctx).extras.title));
  assert.strictEqual(core.command(s, { m: 'extras', op: 'title', index: 7 }, ctx).ok, false);
  const p = s.players.find((x) => x.teamId === s.userTeamId && !x.isUser);
  assert.ok(core.command(s, { m: 'editor', op: 'stats', id: p.id, rating: 88, potential: 95, morale: 100, form: 3, age: 19 }, ctx).ok);
  assert.ok(p.rating === 88 && p.ratingExact === 88 && p.potential === 95 && p.morale === 100 && p.form === 3 && p.age === 19);
  core.command(s, { m: 'editor', op: 'stats', id: p.id, rating: 99, potential: 50 }, ctx);
  assert.strictEqual(p.potential, 99, 'potential never below rating');
  assert.ok(core.command(s, { m: 'editor', op: 'budget', amount: 1234567 }, ctx).ok);
  assert.strictEqual(budget(s), 1234567);
  assert.strictEqual(core.command(s, { m: 'editor', op: 'budget', amount: -5 }, ctx).ok, false);
});

ok('performance mode: follows the match and can be switched off', async () => {
  const calls = [];
  const perf = require('../src/perf').createPerf({ enabled: () => true, calm: (on) => calls.push(on) });
  await perf.set(true); await perf.set(true); await perf.set(false);
  assert.deepStrictEqual(calls, [true, false]);
  const off = require('../src/perf').createPerf({ enabled: () => false, calm: (on) => calls.push('x' + on) });
  await off.set(true);
  assert.ok(!calls.includes('xtrue'));
});

ok('my career: one line per club, with the reason you left and your record', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const M = () => core.snapshot(s, ctx).mycareer;
  assert.strictEqual(M().stints.length, 1);
  assert.strictEqual(M().stints[0].teamId, s.userTeamId);
  const w0 = M().stints[0].w; const f0 = M().stints[0].finals; const t0 = M().stints[0].titles.length;
  const fx = s.fixtures.find((f) => !f.played && (f.homeId === s.userTeamId || f.awayId === s.userTeamId));
  fx.played = true; fx.stage = 'final'; const home = fx.homeId === s.userTeamId; fx.homeWins = home ? 3 : 0; fx.awayWins = home ? 0 : 3;
  core.tick(s, ctx); core.tick(s, ctx);
  assert.ok(M().stints[0].w === w0 + 1 && M().stints[0].finals === f0 + 1 && M().stints[0].titles.length === t0 + 1, JSON.stringify(M().stints[0]));
  s.sacked = true; core.tick(s, ctx);
  assert.strictEqual(M().stints[0].reason, 'sacked');
  const other = s.teams.find((t) => t.id !== s.userTeamId);
  s.sacked = false; s.userTeamId = other.id; core.tick(s, ctx);
  assert.strictEqual(M().stints.length, 2);
  assert.strictEqual(M().stints[0].team, other.name, 'newest first');
  assert.strictEqual(M().total.clubs, 2);
});

ok('titles: 1v1/2v2 championship winners get a title; Nx World Champion ranks first', () => {
  const s = fresh(); const ctx = mkCtx(); core.tick(s, ctx);
  const me = s.players.find((p) => p.isUser);
  me.titles = [{ k: 'major_champion', y: 2026 }, { k: 'worlds_champion', y: 2026 }, { k: 'solo_champion', y: 2027, xt: true }, { k: 'worlds_champion', y: 2027 }];
  const E = core.snapshot(s, ctx).extras;
  assert.ok(/2x World Champion/.test(E.title), 'automatic best title: ' + E.title);
  assert.strictEqual(E.titles[0].k, 'multi');
  const order = E.titles.map((x) => x.k);
  assert.ok(order.indexOf('worlds_champion') < order.indexOf('solo_champion') && order.indexOf('solo_champion') < order.indexOf('major_champion'), order.join(','));
  core.command(s, { m: 'extras', op: 'title', index: 'none' }, ctx);
  assert.strictEqual(core.snapshot(s, ctx).extras.title, null);
});

(async () => {
  for (const [name, fn] of queue) { await fn(); passed++; console.log('  ✔ ' + name); }
  console.log(`\n${passed} checks passed.`);
})().catch((e) => { console.error(e); process.exit(1); });
