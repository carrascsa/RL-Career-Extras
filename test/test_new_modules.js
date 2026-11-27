'use strict';
// World tour, circuit (S-D tiers, 1v1/2v2), freestyle and talks — on a copy of a real save, real engine.
// Also renders every tab's HTML with a stub DOM to catch template errors.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { loadEngine } = require('./engine-loader');
const core = require('../src/core');
const U = require('../src/util');
const world = require('../src/world-engine');
const circuit = require('../src/circuit-engine');
const freestyle = require('../src/freestyle-engine');
const talk = require('../src/talk-engine');

const engine = loadEngine();
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, '9z-team.json');
const { rewindMidSeason } = require('./rewind');
const fresh = () => { const s = rewindMidSeason(JSON.parse(fs.readFileSync(file, 'utf8')).state); delete s.hof; delete s.xtra; return s; };
const logs = [];
const ctx = core.makeCtx(engine, { lang: 'es', log: (m) => logs.push(m) });
const run = (st, cmd) => core.command(st, cmd, ctx);
const advanceDays = (st, n) => { for (let i = 0; i < n; i++) { st.currentDate = U.addDays(st.currentDate, 1); core.tick(st, ctx); } };

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };

console.log('world tour:');
{
  const st = fresh();
  // pretend the season has not started so every Major/Worlds is in the future
  const first = st.events.reduce((m, e) => (e.startDate < m ? e.startDate : m), '9999');
  st.currentDate = U.addDays(first, -1);
  for (const e of st.events) e.stage = 'pending';
  core.tick(st, ctx);
  const W = st.xtra.world;
  ok('future Majors/Worlds get new host cities, all different', () => {
    const evs = st.events.filter((e) => e.kind === 'major' || e.kind === 'worlds');
    const cities = Object.values(W.hosts[String(st.season)]);
    assert.strictEqual(cities.length, evs.filter((e) => !(e.visual && e.visual.poster)).length);
    assert.strictEqual(new Set(cities).size, cities.length);
    for (const e of evs) assert.ok(/Major de |Mundial de /.test(e.name), e.name);
  });
  ok('idempotent: a second tick does not re-roll', () => {
    const names = st.events.map((e) => e.name).join('|');
    core.tick(st, ctx);
    assert.strictEqual(st.events.map((e) => e.name).join('|'), names);
  });
  ok('started events are never renamed', () => {
    const s2 = fresh();
    const before = s2.events.filter((e) => e.startDate <= s2.currentDate).map((e) => e.name);
    core.tick(s2, ctx);
    assert.deepStrictEqual(s2.events.filter((e) => e.startDate <= s2.currentDate).map((e) => e.name), before);
  });
  ok('"everywhere" also renames poster seasons and drops the poster', () => {
    const s3 = fresh();
    s3.currentDate = U.addDays(first, -1);
    for (const e of s3.events) if (e.kind === 'major') e.visual = { poster: 'seasons/x.png', host: 'X' };
    core.tick(s3, ctx);
    assert.ok(s3.events.filter((e) => e.kind === 'major').every((e) => e.visual && e.visual.poster), 'poster kept by default');
    assert.ok(run(s3, { m: 'world', op: 'everywhere', value: true }).ok);
    assert.ok(s3.events.filter((e) => e.kind === 'major').every((e) => !e.visual && /Major de /.test(e.name)));
  });
}

console.log('circuit:');
{
  const st = fresh();
  core.tick(st, ctx);
  const C = st.xtra.circuit;
  ok('a season schedule exists, avoids the official event windows', () => {
    assert.ok(C.events.length >= 2, 'events ' + C.events.length);
    for (const ev of C.events) {
      for (const o of st.events) assert.ok(!(ev.start >= U.addDays(o.startDate, -2) && ev.start <= U.addDays(o.endDate, 1)), ev.name + ' clashes with ' + o.name);
    }
  });
  ok('tiers and formats are valid; pools in range', () => {
    for (const ev of C.events) {
      assert.ok(circuit.TIERS[ev.tier]);
      assert.ok(['3v3', '2v2', '1v1'].includes(ev.format));
      const k = ev.mode ? 0.6 : 1; // fun-mode events pay 60%
      assert.ok(ev.pool >= circuit.TIERS[ev.tier].pool[0] * k - 100 && ev.pool <= circuit.TIERS[ev.tier].pool[1] * k + 100, ev.tier + ' ' + ev.pool);
    }
  });
  ok('registration: refused before it opens, then enter / withdraw work', () => {
    const ev = C.events.find((e) => e.tier !== 'S');
    assert.strictEqual(run(st, { m: 'circuit', op: 'enter', id: ev.id }).ok, false);
    advanceDays(st, Math.max(0, U.daysBetween(st.currentDate, ev.start) - 10));
    assert.strictEqual(ev.status, 'open');
    if (ev.format !== '3v3') assert.strictEqual(run(st, { m: 'circuit', op: 'enter', id: ev.id, pids: [st.players[0].id, st.players[1].id, st.players[2].id] }).ok, false, 'wrong player count');
    assert.ok(run(st, { m: 'circuit', op: 'enter', id: ev.id }).ok);
    assert.ok(ev.entered);
    assert.ok(run(st, { m: 'circuit', op: 'withdraw', id: ev.id }).ok);
    assert.strictEqual(ev.entered, false);
    assert.ok(run(st, { m: 'circuit', op: 'enter', id: ev.id }).ok);
  });
  ok('event runs: 8-team bracket, our place, prize paid and logged', () => {
    const ev = C.events.find((e) => e.entered);
    const b0 = U.userTeam(st).budget;
    const l0 = st.ledger.length;
    advanceDays(st, U.daysBetween(st.currentDate, ev.start) + 1);
    assert.strictEqual(ev.status, 'done');
    assert.strictEqual(ev.field.length, 8);
    assert.deepStrictEqual(ev.rounds.map((r) => r.length), [4, 2, 1]);
    if (ev.qualifier && !ev.field.some((f) => f.mine)) return; // lost the qualifier
    assert.ok([1, 2, 3, 5].includes(ev.place), 'place ' + ev.place);
    assert.ok(ev.prize > 0);
    const led = st.ledger.slice(l0).find((x) => x.note === ev.name);
    assert.ok(led && led.kind === 'prize' && led.amount === ev.prize, 'ledger entry');
    assert.ok(Number.isFinite(U.userTeam(st).budget) && b0 > 0);
    assert.ok(C.log[0].name === ev.name);
  });
  ok('series sim favours the stronger side', () => {
    const r = U.rng('x');
    let w = 0;
    for (let i = 0; i < 400; i++) { const s = circuit._test.series(80, 70, 5, r, '3v3'); if (s.aw > s.bw) w++; }
    assert.ok(w > 300, 'won ' + w);
  });
  ok('S-tier needs world top 8', () => {
    const ev = { tier: 'S' };
    const el = circuit._test.eligibility(st, ev, ctx);
    const rk = circuit._test.userRanks(st, ctx);
    assert.strictEqual(el.invited, rk.world <= 8);
  });
}

console.log('freestyle:');
{
  const st = fresh();
  core.tick(st, ctx);
  const F = st.xtra.freestyle;
  const team = U.userTeam(st);
  ok('closed division refuses signing; opening charges', () => {
    assert.strictEqual(run(st, { m: 'freestyle', op: 'sign', id: F.market[0].id }).ok, false);
    const b = team.budget;
    assert.ok(run(st, { m: 'freestyle', op: 'open' }).ok);
    assert.strictEqual(team.budget, b - 15000);
  });
  ok('market has 5; signing moves to roster, cap 3', () => {
    assert.strictEqual(F.market.length, 5);
    team.budget += 1e7;
    for (let i = 0; i < 3; i++) assert.ok(run(st, { m: 'freestyle', op: 'sign', id: F.market[0].id }).ok);
    assert.strictEqual(F.roster.length, 3);
    assert.strictEqual(run(st, { m: 'freestyle', op: 'sign', id: F.market[0].id }).ok, false);
  });
  ok('focus validates', () => {
    assert.strictEqual(run(st, { m: 'freestyle', op: 'focus', id: F.roster[0].id, value: 'nope' }).ok, false);
    assert.ok(run(st, { m: 'freestyle', op: 'focus', id: F.roster[0].id, value: 'content' }).ok);
  });
  ok('weeks pass: skills grow, hype grows, wages paid, competitions run', () => {
    const before = F.roster.map((x) => x.tech + x.creat);
    const hype = F.roster.map((x) => x.hype);
    const ev = F.events.find((e) => e.status === 'upcoming');
    assert.ok(run(st, { m: 'freestyle', op: 'entry', event: ev.id, risk: 'risky' }).ok);
    assert.ok(run(st, { m: 'freestyle', op: 'entry', event: ev.id, toggle: F.roster[1].id }).ok);
    advanceDays(st, Math.max(60, U.daysBetween(st.currentDate, ev.date) + 1));
    F.roster.forEach((x, i) => { assert.ok(x.tech + x.creat > before[i]); assert.ok(x.hype >= hype[i]); });
    assert.ok(F.lastWeek && F.lastWeek.wages > 0);
    assert.strictEqual(ev.status, 'done');
    assert.strictEqual(ev.field.length, 8);
    assert.ok(ev.champion);
    assert.ok(ev.result.length >= 1);
  });
  ok('release sends the freestyler to the rival pool', () => {
    const x = F.roster[0];
    assert.ok(run(st, { m: 'freestyle', op: 'release', id: x.id }).ok);
    assert.ok(!F.roster.includes(x) && F.rivals.includes(x));
  });
}

console.log('talks:');
{
  const st = fresh();
  core.tick(st, ctx);
  const team = U.userTeam(st);
  const p = U.rosterPlayers(st).find((x) => !x.isUser);
  ok('unknown topic / foreign player refused', () => {
    assert.strictEqual(run(st, { m: 'talk', op: 'talk', pid: p.id, topic: 'aliens' }).ok, false);
    const other = st.players.find((x) => x.teamId !== st.userTeamId);
    assert.strictEqual(run(st, { m: 'talk', op: 'talk', pid: other.id, topic: 'checkin' }).ok, false);
  });
  ok('a talk replies (or leaves you on read), moves relationship, writes the native chat', () => {
    const n0 = (st.chats.find((c) => c.playerId === p.id) || { messages: [] }).messages.length;
    const r = run(st, { m: 'talk', op: 'talk', pid: p.id, topic: 'checkin' });
    assert.ok(r.ok, r.error);
    assert.ok(['full', 'short', 'seen', 'rude'].includes(r.resp));
    const th = st.chats.find((c) => c.playerId === p.id);
    assert.ok(th.messages.length > n0 || th.messages.length === 30);
    assert.strictEqual(th.messages[th.messages.length - (r.text ? 2 : 1)].from, 'manager');
  });
  ok('once per player per day', () => assert.strictEqual(run(st, { m: 'talk', op: 'talk', pid: p.id, topic: 'joke' }).ok, false));
  ok('responses vary across the squad and over days (not all identical)', () => {
    const kinds = new Set();
    for (let d = 0; d < 12; d++) {
      st.currentDate = U.addDays(st.currentDate, 1);
      for (const q of U.rosterPlayers(st).filter((x) => !x.isUser)) kinds.add(run(st, { m: 'talk', op: 'talk', pid: q.id, topic: TOPIC(d) }).resp);
    }
    assert.ok(kinds.size >= 3, [...kinds].join(','));
  });
  ok('pestering lowers the odds of a full answer', () => {
    const t = st.xtra.talk;
    const r = U.rng('p');
    let calm = 0; let pest = 0;
    const q = U.rosterPlayers(st).find((x) => !x.isUser);
    for (let i = 0; i < 300; i++) {
      t.dates[q.id] = [];
      if (talk._test.decide(st, q, 'checkin', r, t) === 'full') calm++;
      t.dates[q.id] = [st.currentDate, st.currentDate, st.currentDate];
      if (talk._test.decide(st, q, 'checkin', r, t) === 'full') pest++;
    }
    assert.ok(calm > pest, calm + ' vs ' + pest);
  });
  ok('rival hint feeds Club Life when a match is coming', () => {
    const me = st.userTeamId;
    const opp = st.teams.find((x) => x.id !== me);
    st.fixtures = st.fixtures.filter((f) => f.played || (f.homeId !== me && f.awayId !== me));
    st.fixtures.push({ id: 99002, eventId: null, slotId: 'x', stage: 'final', round: 0, homeId: me, awayId: opp.id, date: U.addDays(st.currentDate, 3), played: false, bestOf: 7, games: [] });
    st.currentDate = U.addDays(st.currentDate, 1);
    let got = null;
    for (const q of U.rosterPlayers(st).filter((x) => !x.isUser)) {
      for (let i = 0; i < 1 && !got; i++) { const r = run(st, { m: 'talk', op: 'talk', pid: q.id, topic: 'rival' }); if (r.resp === 'full') got = r; }
    }
    const snap = talk.snapshot(st, ctx);
    if (got) assert.ok(snap.hint && ['aggressive', 'defensive', 'possession'].includes(snap.hint.style));
  });
  function TOPIC(d) { return talk.TOPICS[d % talk.TOPICS.length]; }
}

console.log('ui render (stub DOM):');
{
  const st = fresh();
  core.tick(st, ctx);
  run(st, { m: 'freestyle', op: 'open' });
  const snapshot = core.snapshot(st, ctx);
  const doc = { head: { appendChild() {} }, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, remove() {} }), addEventListener() {} };
  const sandbox = { window: {}, document: doc, console, setInterval() {}, setTimeout() {}, requestAnimationFrame() {}, S: { lang: 'es', career: {}, xtra: snapshot, hof: null }, tab: 'xtcircuit' };
  sandbox.window.hub = { placeBet: async () => ({}) };
  sandbox.topbarHtml = () => '<button data-tab="squad">Squad</button><button data-tab="setup">Setup</button>';
  sandbox.tabInnerHtml = () => '';
  sandbox.render = () => {};
  sandbox.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  vm.createContext(sandbox);
  for (const f of ['ui-common.js', 'clublife-ui.js', 'circuit-ui.js', 'academy-ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), sandbox, { filename: f });
  const X = sandbox.window.__xt;
  ok('tabs registered and shown in the top bar', () => {
    const ids = X.tabs.map((t) => t.id);
    for (const id of ['xtclublife', 'xtcircuit', 'xtacademy']) assert.ok(ids.includes(id), id);
    assert.ok(/data-tab="xtcircuit"/.test(vm.runInContext('topbarHtml()', sandbox)));
  });
  ok('every circuit view renders without errors', () => {
    for (const v of ['events', 'fs', 'world']) {
      X.setView('xtcircuit', v);
      const html = X.tabs.find((t) => t.id === 'xtcircuit').render();
      assert.ok(html.length > 500 && !/error/i.test(html.slice(0, 200)), v);
      assert.ok(!/undefined|NaN/.test(html), v + ' has undefined/NaN');
    }
  });
  ok('club life renders with talks, for a player and the coach', () => {
    const def = X.tabs.find((t) => t.id === 'xtclublife');
    const pid = snapshot.talk.players[0].id;
    def.local('talk:' + pid);
    const html = def.render();
    assert.ok(/Charlas/.test(html) && /¿Cómo estás\?/.test(html));
    assert.ok(!/undefined|NaN/.test(html));
  });
  ok('circuit with every event state renders', () => {
    // run the save forward so there are open / done events and freestyle results
    const s2 = fresh();
    core.tick(s2, ctx);
    run(s2, { m: 'freestyle', op: 'open' });
    U.userTeam(s2).budget += 1e7;
    run(s2, { m: 'freestyle', op: 'sign', id: s2.xtra.freestyle.market[0].id });
    for (const ev of s2.xtra.circuit.events) { ev.status = 'open'; ev.eligible = true; run(s2, { m: 'circuit', op: 'enter', id: ev.id }); ev.status = 'upcoming'; }
    advanceDays(s2, 120);
    sandbox.S.xtra = core.snapshot(s2, ctx);
    for (const v of ['events', 'fs', 'world']) {
      X.setView('xtcircuit', v);
      const def = X.tabs.find((t) => t.id === 'xtcircuit');
      for (const ev of (sandbox.S.xtra.circuit.events || [])) def.local('br:' + ev.id);
      for (const ev of (sandbox.S.xtra.freestyle.events || [])) def.local('br:' + ev.id);
      const html = def.render();
      assert.ok(!/undefined|NaN/.test(html), v + ' has undefined/NaN: ' + (html.match(/.{60}(undefined|NaN).{20}/) || [''])[0]);
    }
    assert.ok(sandbox.S.xtra.circuit.events.some((e) => e.status === 'done'), 'some circuit events done');
  });
}

ok('no module errors were logged', () => assert.deepStrictEqual(logs.filter((m) => /err/i.test(m)), []));
console.log(`\n${passed} checks passed`);
