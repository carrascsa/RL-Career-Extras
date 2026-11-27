'use strict';
// Plays real seasons with the Hub's own engine on an in-memory copy of a save, with every module active.
// node test/test_season_sim.js [save.json] [days]      (the save file is only read)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { loadEngine } = require('./engine-loader');
const inproc = require('../src/inproc');
const U = require('../src/util');
const academy = require('../src/academy-engine');

const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, '9z-team.json');
const DAYS = Number(process.argv[3]) || 420;

const errors = [];
inproc._setLog((m) => { if (/err|fail/i.test(m)) errors.push(m); if (process.env.VERBOSE) console.log('   log:', m); });

const engine = loadEngine();
inproc.wrapEngine(engine);
const ctx = inproc._ctx();
ctx.lang = process.env.RLXT_LANG || 'es';

const state = JSON.parse(fs.readFileSync(file, 'utf8')).state;
delete state.hof; delete state.xtra;
let seed = 12345;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const bet = (cmd) => engine.placeBet(state, 'xt:' + JSON.stringify(cmd), 0, 0, 0);

console.log(`save ${path.basename(file)} · ${state.currentDate} · season ${state.season} · simulating ~${DAYS} days`);
const counts = { matchdays: 0, seasons: 0, press: 0, conflicts: 0, investors: 0, promoted: 0, reports: 0, plans: 0, planHits: 0, botWrap: 0, circuitEntries: 0, fsSigned: 0, talks: 0, visas: 0, sponsors: 0, vacations: 0, campaigns: 0 };
const startDate = state.currentDate;
const t0 = Date.now();
let guard = 0;

function act() {
  const snap = inproc.patchResult({ career: state }).xtra;
  const md = snap.matchday;
  if (md.next && !md.next.plan) {
    if (!md.next.report) { if (bet({ m: 'matchday', op: 'report', key: md.next.key }).ok) counts.reports++; }
    const s2 = inproc.patchResult({ career: state }).xtra.matchday.next;
    const plan = s2 && s2.style ? md.counters[s2.style] : 'press';
    const r = bet({ m: 'matchday', op: 'plan', key: md.next.key, plan });
    if (r.ok) counts.plans++;
    // the bot wrapper must answer for this fixture
    const fx = state.fixtures.find((f) => f.id === Number(md.next.key.split('|')[0]));
    if (fx) { const tier = engine.botDifficultyFor(state, fx); assert.ok(['rookie', 'pro', 'allstar'].includes(tier), 'tier ' + tier); counts.botWrap++; }
  }
  if (md.press) {
    const answers = md.press.questions.map((q, i) => (i + counts.press) % 3);
    const r = bet({ m: 'matchday', op: 'answer', key: md.press.key, answers });
    assert.ok(r.ok, 'press answer: ' + r.error);
    counts.press++;
  }
  const club = snap.club;
  if (club.conflict) {
    const r = bet({ m: 'club', op: 'resolve', option: club.conflict.options[counts.conflicts % club.conflict.options.length].id });
    if (!r.ok) bet({ m: 'club', op: 'resolve', option: club.conflict.options.find((o) => !o.cost).id });
    counts.conflicts++;
  }
  if (club.investor && club.investor.status === 'offer') {
    assert.ok(bet({ m: 'club', op: 'investor', accept: true }).ok);
    counts.investors++;
  }
  const ac = snap.academy;
  const ready = ac.prospects.find((p) => p.rating >= 62);
  const team = U.userTeam(state);
  if (ready && team.playerIds.length < ac.rosterMax) {
    const r = bet({ m: 'academy', op: 'promote', id: ready.id });
    assert.ok(r.ok, 'promote: ' + r.error);
    counts.promoted++;
  }
  // circuit: enter everything we can
  for (const ev of (snap.circuit ? snap.circuit.events : [])) {
    if (ev.status === 'open' && ev.eligible && !ev.entered && bet({ m: 'circuit', op: 'enter', id: ev.id }).ok) counts.circuitEntries++;
  }
  // freestyle: open the division and keep two freestylers
  const F = snap.freestyle;
  if (F && !F.open && team.budget > 200000) bet({ m: 'freestyle', op: 'open' });
  if (F && F.open && F.roster.length < 2 && F.market.length && team.budget > F.market[0].fee * 3) {
    if (bet({ m: 'freestyle', op: 'sign', id: F.market[0].id }).ok) counts.fsSigned++;
  }
  // talks: one player a day, rotating topics
  const T = snap.talk;
  if (T && T.players.length) {
    const p = T.players[counts.talks % T.players.length];
    const r = bet({ m: 'talk', op: 'talk', pid: p.id, topic: T.topics[counts.talks % T.topics.length] });
    if (r.ok) { counts.talks++; counts['t_' + r.resp] = (counts['t_' + r.resp] || 0) + 1; }
  }
  // travel: bootcamp every other trip, always fix visas
  for (const tr of (snap.travel ? snap.travel.trips : [])) {
    if (tr.status !== 'planning') continue;
    if (tr.visa && tr.visa.status === 'pending' && bet({ m: 'travel', op: 'visa', id: tr.id }).ok) counts.visas++;
    if (tr.plan === 'standard' && tr.id % 2 === 0) bet({ m: 'travel', op: 'plan', id: tr.id, plan: 'bootcamp' });
  }
  // sponsors: accept what comes
  if (snap.sponsor && snap.sponsor.offer && snap.sponsor.active.length < snap.sponsor.max) {
    if (bet({ m: 'sponsor', op: 'answer', id: snap.sponsor.offer.id, accept: true }).ok) counts.sponsors++;
  }
  // wellbeing: two streamers
  if (snap.wellbeing && snap.wellbeing.players.length >= 2 && !counts.streamSet) {
    bet({ m: 'wellbeing', op: 'stream', pid: snap.wellbeing.players[0].id, value: 'casual' });
    bet({ m: 'wellbeing', op: 'stream', pid: snap.wellbeing.players[1].id, value: 'heavy' });
    counts.streamSet = 1;
  }
  for (const p of (snap.wellbeing ? snap.wellbeing.players : [])) {
    if (p.fatigue >= 85 && !p.vacationIn && bet({ m: 'wellbeing', op: 'vacation', pid: p.id }).ok) counts.vacations++;
  }
  // all-star campaign
  if (snap.awards && snap.awards.allstar && snap.awards.allstar.status === 'voting' && !snap.awards.allstar.campaign && snap.awards.allstar.myPlayers.length) {
    if (bet({ m: 'awards', op: 'campaign', pid: snap.awards.allstar.myPlayers[0].id }).ok) counts.campaigns++;
  }
  // keep the B team full
  for (const p of ac.prospects.filter((x) => x.squad === 'academy')) {
    if (ac.prospects.filter((x) => x.squad === 'b').length >= ac.bMax) break;
    bet({ m: 'academy', op: 'to_b', id: p.id });
    ac.prospects.find((x) => x.id === p.id).squad = 'b';
  }
}

while (U.daysBetween(startDate, state.currentDate) < DAYS && guard++ < 5000) {
  act();
  const res = engine.advance(state, rand, 'day');
  if (res.stopped === 'matchday') {
    counts.matchdays++;
    const fx = state.fixtures.find((f) => f.id === res.fixtureId);
    engine.simulateFixture(state, fx, rand);
    inproc.patchResult({ career: state });
  } else if (res.stopped === 'season-end') {
    counts.seasons++;
    engine.startNextSeason(state, rand);
    inproc.patchResult({ career: state });
  } else if (res.stopped === 'sacked') {
    console.log('   (sacked — stopping)');
    break;
  }
}
const ms = Date.now() - t0;
const snap = inproc.patchResult({ career: state });
const c = state.hof.clubs[String(state.userTeamId)];
const A = state.xtra.academy;
const plansHistory = state.xtra.matchday.history;

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };
ok(`no module errors in the log (${errors.length})`, () => assert.deepStrictEqual(errors, []));
ok('state is JSON-serialisable and xtra stays small', () => {
  const s = JSON.stringify(state.xtra).length;
  assert.ok(s < 300000, 'xtra ' + s);
  console.log(`     xtra ${s} bytes, hof ${JSON.stringify(state.hof).length} bytes`);
});
ok('every player form/morale in range, budget finite', () => {
  for (const p of state.players) {
    if (p.form != null) assert.ok(p.form >= -5 && p.form <= 5, p.name + ' form ' + p.form);
    if (p.morale != null) assert.ok(p.morale >= 0 && p.morale <= 100, p.name + ' morale ' + p.morale);
  }
  assert.ok(Number.isFinite(U.userTeam(state).budget));
});
ok('no plan left applying form after its match', () => {
  for (const pl of Object.values(state.xtra.matchday.plans)) {
    const fx = state.fixtures.find((f) => [f.id, f.date].join('|') === Object.keys(state.xtra.matchday.plans).find((k) => state.xtra.matchday.plans[k] === pl));
    if (pl.applied) assert.ok(fx && !fx.played);
  }
});
ok('promoted academy players are valid engine players', () => {
  for (const g of A.graduates || []) {
    const p = U.playerOf(state, g.pid);
    assert.ok(p, 'graduate missing');
    assert.ok(Number.isFinite(engine.matchRating(p)), 'matchRating');
    assert.ok(Number.isFinite(engine.playerValue(state, p)), 'playerValue');
  }
});
ok('hub snapshot builders still work', () => {
  assert.ok(snap.hof && snap.hof.club);
  assert.ok(snap.xtra && snap.xtra.academy && snap.xtra.matchday && snap.xtra.club);
  engine.repairInvariants && engine.repairInvariants(state);
});
if (counts.seasons) ok('season rollover: new league, intake, HoF keeps 2+ seasons', () => {
  assert.ok(Object.keys(c.seasons).length >= 2);
  assert.strictEqual(A.league.season, state.season);
});

ok('circuit, freestyle, world tour and talks ran', () => {
  const CI = state.xtra.circuit;
  assert.ok(CI.log.length >= 1, 'no circuit results');
  for (const l of CI.log) assert.ok([1, 2, 3, 5].includes(l.place) && Number.isFinite(l.prize));
  assert.ok(state.xtra.freestyle.log.length >= 1, 'no freestyle events');
  assert.ok(Object.keys(state.xtra.world.hosts).length >= 1);
  assert.ok(counts.talks > 50);
  for (const th of state.chats) assert.ok(th.messages.length <= 30 && th.messages.every((m) => typeof m.text === 'string'));
});

for (const h of plansHistory) if (h.correct) counts.planHits++;
const CI = state.xtra.circuit;
console.log(`  circuit: ${CI.log.length} played, ${CI.trophies.length} titles, earned ${U.fmtMoney(CI.log.reduce((s, l) => s + l.prize, 0))} · ${CI.log.slice(0, 6).map((l) => l.tier + ' ' + l.format + ' #' + l.place).join(', ')}`);
const FS = state.xtra.freestyle;
console.log(`  freestyle: open ${FS.open}, roster ${FS.roster.map((x) => x.name + ' ' + Math.round(x.tech) + '/' + Math.round(x.creat) + ' hype ' + x.hype).join(', ')}, events ${FS.log.length}, titles ${FS.trophies.length}, viral ${FS.viral.length}`);
console.log(`  world: ${JSON.stringify(state.xtra.world.hosts)}`);
const X2 = state.xtra;
const fat = Object.values(X2.wellbeing.p).map((r) => r.fatigue);
console.log(`  wellbeing: fatigue avg ${Math.round(fat.reduce((a, b) => a + b, 0) / Math.max(1, fat.length))} max ${Math.round(Math.max(0, ...fat))}, log ${JSON.stringify(X2.wellbeing.log.map((l) => l.kind))}, streams earned ${U.fmtMoney(Object.values(X2.wellbeing.p).reduce((a, r) => a + (r.earned || 0), 0))}`);
console.log(`  sponsors: ${JSON.stringify(X2.sponsor.log.map((l) => l.kind + ':' + l.result))} active ${X2.sponsor.active.length}`);
console.log(`  awards: ${X2.awards.history.map((h) => 'S' + h.season + ' MVP ' + h.awards.mvp.name + ' (' + h.awards.mvp.team + '), coach ' + (h.awards.coach && h.awards.coach.team)).join(' | ') || '-'} · all-star ${JSON.stringify(X2.awards.allstarLog.map((l) => l.score + ' mvp ' + l.mvp + ' mine ' + l.mine.join('/')))}`);
console.log(`  travel: ${JSON.stringify(X2.travel.log.map((l) => l.name + ' ' + l.city + ' ' + l.plan + ' jet' + l.jet + (l.home ? ' home' : '') + (l.visa ? ' visa:' + l.visa : '')))}`);
console.log(`  fun modes: ${X2.circuit.log.filter((l) => l.mode).map((l) => l.mode + ' #' + l.place).join(', ') || '-'}`);
console.log(`  events now: ${state.events.filter((e) => e.kind === 'major' || e.kind === 'worlds').map((e) => e.name).join(' | ')}`);
console.log(`\n  ${ms} ms for ${U.daysBetween(startDate, state.currentDate)} days → ${state.currentDate} (season ${state.season})`);
console.log('  ' + JSON.stringify(counts));
console.log(`  club: series ${c.series.w}-${c.series.l}, titles ${c.titles.length}, achievements ${Object.keys(c.ach).length}`);
console.log(`  academy: level ${A.level}, ${A.prospects.length} prospects, B league round ${A.league.round}/${A.league.rounds.length}, graduates ${(A.graduates || []).map((g) => g.name + ' ' + g.rating).join(', ') || '-'}`);
console.log(`  B history: ${JSON.stringify(A.history)} trophies ${A.trophies.length}`);
console.log(`  press rep ${state.xtra.matchday.rep}, investor ${JSON.stringify(state.xtra.club.investorLog)}, captain ${state.xtra.club.captainId}`);
console.log(`  inbox from add-on: ${state.inbox.filter((m) => /xtacademy|xtclublife/.test(m.link) || m.link === 'squad' && /cantera|academy/i.test(m.body)).length}, news: ${state.news.filter((n) => n.category === 'club' && /"/.test(n.headline)).length}`);
console.log(`\n${passed} checks passed`);
