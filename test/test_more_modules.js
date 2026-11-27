'use strict';
// Travel, awards + All-Star, sponsors, wellbeing and fun-mode circuit events, on a copy of a real save.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { loadEngine } = require('./engine-loader');
const core = require('../src/core');
const U = require('../src/util');
const travel = require('../src/travel-engine');
const awards = require('../src/awards-engine');
const sponsor = require('../src/sponsor-engine');
const circuit = require('../src/circuit-engine');

const engine = loadEngine();
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, '9z-team.json');
const { rewindMidSeason } = require('./rewind');
const fresh = () => { const s = rewindMidSeason(JSON.parse(fs.readFileSync(file, 'utf8')).state); delete s.hof; delete s.xtra; return s; };
const logs = [];
const ctx = core.makeCtx(engine, { lang: 'es', log: (m) => logs.push(m) });
const run = (st, cmd) => core.command(st, cmd, ctx);
const advanceDays = (st, n) => { for (let i = 0; i < n; i++) { st.currentDate = U.addDays(st.currentDate, 1); core.tick(st, ctx); } };
// a future Worlds in Tokyo that our team plays (registered as the rotated host so the world tour keeps it)
function tokyoTrip(st, inDays, len) {
  core.tick(st, ctx);
  const ev = st.events.find((e) => e.kind === 'worlds');
  Object.assign(ev, { name: 'Tokyo World Championship', startDate: U.addDays(st.currentDate, inDays), endDate: U.addDays(st.currentDate, inDays + len), stage: 'pending', field: [st.userTeamId] });
  const w = st.xtra.world; (w.hosts[String(st.season)] = w.hosts[String(st.season)] || {})[ev.id] = 'Tokyo';
  return ev;
}

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };

console.log('travel:');
{
  ok('jet lag by time zones; host parsing', () => {
    assert.strictEqual(travel._test.jetLag('sam', 'apac'), 2);
    assert.strictEqual(travel._test.jetLag('eu', 'mena'), 0);
    assert.strictEqual(travel._test.jetLag('na', 'eu'), 2);
    assert.strictEqual(travel._test.jetLag('sam', 'na'), 0);
    assert.strictEqual(travel._test.regionOfCity('Tokyo'), 'apac');
    assert.strictEqual(travel._test.regionOfCity('Paris'), 'eu');
    const st = fresh();
    assert.strictEqual(travel._test.hostOf(st, { id: 1, kind: 'major', name: 'Boston Major' }), 'Boston');
    assert.strictEqual(travel._test.hostOf(st, { id: 1, kind: 'major', name: 'Major de Tokyo' }), 'Tokyo');
  });
  const st = fresh();
  const ev = tokyoTrip(st, 15, 5);
  advanceDays(st, 1);
  const T = st.xtra.travel;
  const trip = T.trips[ev.id];
  ok('trip planned with jet lag for SAM → Tokyo', () => {
    assert.ok(trip, 'trip');
    assert.strictEqual(trip.city, 'Tokyo');
    assert.strictEqual(trip.jet, 2);
    assert.strictEqual(trip.home, false);
  });
  ok('standard trip: form drops on arrival and is restored after 2 days', () => {
    const team = U.userTeam(st);
    const starters = team.lineup.map((id) => U.playerOf(st, id)).filter((p) => !p.isUser);
    starters.forEach((p) => { p.form = 0; });
    trip.visaRolled = true; trip.visa = null;
    advanceDays(st, U.daysBetween(st.currentDate, ev.startDate));
    assert.strictEqual(trip.status, 'there');
    starters.forEach((p) => assert.strictEqual(p.form, -2, p.name + ' ' + p.form));
    advanceDays(st, 2);
    starters.forEach((p) => assert.strictEqual(p.form, 0));
  });
  ok('bootcamp: charged, +1 form during the event, reverted after', () => {
    const s2 = fresh();
    const e2 = tokyoTrip(s2, 15, 3);
    advanceDays(s2, 1);
    const tr = s2.xtra.travel.trips[e2.id];
    tr.visaRolled = true;
    assert.ok(run(s2, { m: 'travel', op: 'plan', id: e2.id, plan: 'bootcamp' }).ok);
    const team = U.userTeam(s2);
    const ps = team.lineup.map((id) => U.playerOf(s2, id)).filter((p) => !p.isUser);
    ps.forEach((p) => { p.form = 0; });
    const b0 = team.budget;
    advanceDays(s2, U.daysBetween(s2.currentDate, e2.startDate));
    assert.strictEqual(tr.paid, 12000);
    assert.ok(team.budget <= b0 - 12000 + 1);
    ps.forEach((p) => assert.strictEqual(p.form, 1));
    e2.stage = 'done';
    advanceDays(s2, 1);
    ps.forEach((p) => assert.strictEqual(p.form, 0));
    assert.strictEqual(tr.status, 'done');
  });
  ok('visa: unpaid → player misses the event; express visa fixes it', () => {
    const s3 = fresh();
    const e3 = tokyoTrip(s3, 12, 4);
    advanceDays(s3, 1);
    const tr = s3.xtra.travel.trips[e3.id];
    const p = U.rosterPlayers(s3).find((x) => !x.isUser && !x.absence);
    tr.visaRolled = true;
    tr.visa = { pid: p.id, name: p.name, status: 'pending' };
    advanceDays(s3, U.daysBetween(s3.currentDate, e3.startDate));
    assert.ok(p.absence && /visa/.test(p.absence.reason) && p.absence.cat === 'setup');
    const s4 = fresh();
    const e4 = tokyoTrip(s4, 12, 4);
    advanceDays(s4, 1);
    const t4 = s4.xtra.travel.trips[e4.id];
    const p4 = U.playerOf(s4, p.id);
    t4.visaRolled = true;
    t4.visa = { pid: p4.id, name: p4.name, status: 'pending' };
    assert.ok(run(s4, { m: 'travel', op: 'visa', id: e4.id }).ok);
    advanceDays(s4, U.daysBetween(s4.currentDate, e4.startDate));
    assert.ok(!p4.absence || !/visa/.test(p4.absence.reason));
  });
}

console.log('awards:');
{
  const st = fresh();
  core.tick(st, ctx);
  ok('live race computes every award from the Hub season stats', () => {
    const a = awards._test.compute(st);
    assert.ok(a && a.mvp && a.scorer && a.playmaker && a.wall && a.coach);
    assert.strictEqual(a.team.length, 3);
    assert.ok(Number.isFinite(a.mvp.value));
  });
  ok('given once when the World Championship is done; news + inbox', () => {
    const worlds = st.events.find((e) => e.kind === 'worlds');
    worlds.stage = 'done';
    const n0 = st.news.length;
    core.tick(st, ctx);
    core.tick(st, ctx);
    const A = st.xtra.awards;
    assert.ok(A.given[st.season]);
    assert.strictEqual(A.history.length, 1);
    assert.ok(n0 >= 0 && st.news.some((n) => /Jugador de la temporada/.test(n.headline)), 'awards news (the Hub caps news at 90, so count can stay flat)');
  });
  ok('All-Star: voting opens, campaign once, game played with 3 per side', () => {
    const s2 = fresh();
    core.tick(s2, ctx);
    const date = awards._test.allStarDate(s2);
    assert.ok(date);
    // jump to 10 days before the game
    s2.currentDate = U.addDays(date, -10);
    s2.xtra.lastDay = U.addDays(s2.currentDate, -1);
    core.tick(s2, ctx);
    const S = s2.xtra.awards.allstar;
    assert.strictEqual(S.status, 'voting');
    const mine = U.rosterPlayers(s2).find((p) => !p.isUser);
    assert.ok(run(s2, { m: 'awards', op: 'campaign', pid: mine.id }).ok);
    assert.strictEqual(run(s2, { m: 'awards', op: 'campaign', pid: mine.id }).ok, false);
    advanceDays(s2, 10);
    assert.strictEqual(S.status, 'done');
    assert.strictEqual(S.result.west.length, 3);
    assert.strictEqual(S.result.east.length, 3);
    assert.ok(Math.max(S.result.w, S.result.e) === 3);
  });
}

console.log('sponsors:');
{
  const st = fresh();
  core.tick(st, ctx);
  const S = st.xtra.sponsor;
  ok('an offer arrives within a few months', () => {
    for (let i = 0; i < 120 && !S.offer; i++) advanceDays(st, 1);
    assert.ok(S.offer, 'no offer');
    assert.ok(S.offer.upfront > 0 && S.offer.bonus > S.offer.upfront);
  });
  ok('accept pays upfront; progress tracked; success pays the bonus', () => {
    const o = S.offer;
    const team = U.userTeam(st);
    const b0 = team.budget;
    assert.ok(run(st, { m: 'sponsor', op: 'answer', id: o.id, accept: true }).ok);
    assert.strictEqual(team.budget, b0 + o.upfront);
    const d = S.active[0];
    // force the target to be met
    d.kind = 'followers'; d.base = U.num(team.followers); d.target = 5;
    team.followers = Math.round(team.followers * 1.06);
    const b1 = team.budget;
    core.tick(st, ctx);
    assert.strictEqual(S.active.length, 0);
    assert.strictEqual(S.log[0].result, 'success');
    assert.strictEqual(team.budget, b1 + d.bonus);
  });
  ok('streak target counts only series won after signing', () => {
    const d = { kind: 'streak', base: 10, target: 3 };
    st.hof.clubs[String(st.userTeamId)].streak.cur = 12;
    assert.strictEqual(sponsor._test.progress(st, d), 2);
    st.hof.clubs[String(st.userTeamId)].streak.cur = 1;
    assert.strictEqual(sponsor._test.progress(st, d), 1);
    assert.strictEqual(d.base, 0);
  });
  ok('a missed deadline closes the deal without bonus', () => {
    S.active.push({ brand: 'X', kind: 'title', target: 5, base: 0, bonus: 999, upfront: 1, days: 1, accepted: U.addDays(st.currentDate, -5) });
    const b = U.userTeam(st).budget;
    core.tick(st, ctx);
    assert.strictEqual(S.log[0].result, 'failed');
    assert.strictEqual(U.userTeam(st).budget, b);
  });
}

console.log('wellbeing:');
{
  const st = fresh();
  core.tick(st, ctx);
  const W = st.xtra.wellbeing;
  const p = U.rosterPlayers(st).find((x) => !x.isUser);
  ok('streaming heavy: fatigue climbs, money and followers come in on Mondays', () => {
    assert.ok(run(st, { m: 'wellbeing', op: 'stream', pid: p.id, value: 'heavy' }).ok);
    const f0 = p.followers;
    for (let i = 0; i < 14; i++) advanceDays(st, 1);
    assert.ok(W.p[p.id].earned > 0);
    assert.ok(p.followers > f0);
  });
  ok('burnout: very high fatigue eventually takes the player out', () => {
    W.p[p.id].fatigue = 100;
    for (let i = 0; i < 70 && !p.absence; i++) { W.p[p.id].fatigue = 100; advanceDays(st, 1); }
    assert.ok(p.absence && /burnout/.test(p.absence.reason), 'no burnout');
  });
  ok('vacation: big fatigue drop, then cooldown', () => {
    const q = U.rosterPlayers(st).find((x) => !x.isUser && x.id !== p.id);
    W.p[q.id] = Object.assign(W.p[q.id] || {}, { fatigue: 80 });
    const me = st.userTeamId;
    st.fixtures = st.fixtures.filter((f) => f.played || (f.homeId !== me && f.awayId !== me));
    assert.ok(run(st, { m: 'wellbeing', op: 'vacation', pid: q.id }).ok);
    assert.ok(W.p[q.id].fatigue <= 35);
    assert.strictEqual(run(st, { m: 'wellbeing', op: 'vacation', pid: q.id }).ok, false);
  });
}

console.log('fun modes:');
{
  const st = fresh();
  core.tick(st, ctx);
  const C = st.xtra.circuit;
  ok('existing season gets fun-mode events added once', () => {
    const modes = C.events.filter((e) => e.mode);
    assert.ok(modes.length >= 1, 'no mode events');
    for (const e of modes) assert.ok(circuit.MODES[e.mode]);
    const n = C.events.length;
    core.tick(st, ctx);
    assert.strictEqual(C.events.length, n);
  });
  ok('chaos: upsets are more common in Rumble than in standard', () => {
    const r = U.rng('chaos');
    let std = 0; let rum = 0;
    for (let i = 0; i < 2000; i++) {
      if (circuit._test.series(80, 70, 5, r, '3v3').aw < 3) std++;
      if (circuit._test.series(80, 70, 5, r, '3v3', 'rumble').aw < 3) rum++;
    }
    assert.ok(rum > std * 1.5, std + ' vs ' + rum);
  });
}

console.log('ui render (stub DOM):');
{
  const st = fresh();
  // fabricate states for every card
  const w = tokyoTrip(st, 12, 4);
  advanceDays(st, 1);
  const tr = st.xtra.travel.trips[w.id];
  tr.visa = { pid: U.rosterPlayers(st)[0].id, name: 'x', status: 'pending' };
  st.xtra.sponsor.offer = sponsor._test.makeOffer(st, U.rng('o'));
  st.xtra.sponsor.offer.offered = st.currentDate;
  const date = awards._test.allStarDate(st);
  st.xtra.awards.allstar = { season: st.season, date, status: 'voting', campaign: null, result: null };
  const snapshot = core.snapshot(st, ctx);
  const doc = { head: { appendChild() {} }, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, remove() {} }), addEventListener() {} };
  const sandbox = { window: {}, document: doc, console, setInterval() {}, setTimeout() {}, requestAnimationFrame() {}, S: { lang: 'es', career: {}, xtra: snapshot }, tab: 'xtcircuit' };
  sandbox.window.hub = { placeBet: async () => ({}) };
  sandbox.topbarHtml = () => '<button data-tab="setup">Setup</button>';
  sandbox.tabInnerHtml = () => '';
  sandbox.render = () => {};
  sandbox.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  vm.createContext(sandbox);
  for (const f of ['ui-common.js', 'clublife-ui.js', 'circuit-ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), sandbox, { filename: f });
  const X = sandbox.window.__xt;
  const clean = (html, what) => assert.ok(!/undefined|NaN|\[object/.test(html), what + ': ' + (html.match(/.{60}(undefined|NaN|\[object).{20}/) || [''])[0]);
  ok('circuit: awards (voting), world tour with trips, tournaments with modes', () => {
    const def = X.tabs.find((t) => t.id === 'xtcircuit');
    for (const v of ['events', 'world', 'awards', 'fs']) { X.setView('xtcircuit', v); const h = def.render(); clean(h, v); }
    X.setView('xtcircuit', 'world');
    assert.ok(/Viajes/.test(def.render()) && /Visa exprés/.test(def.render()));
    X.setView('xtcircuit', 'awards');
    assert.ok(/All-Star/.test(def.render()) && /Jugador de la temporada/.test(def.render()));
    X.setView('xtcircuit', 'events');
    assert.ok(/Hoops|Rumble|Dropshot|Snow Day|Heatseeker/.test(def.render()));
  });
  ok('club life: sponsor offer and wellbeing render', () => {
    const def = X.tabs.find((t) => t.id === 'xtclublife');
    const h = def.render();
    clean(h, 'clublife');
    assert.ok(/Sponsors/.test(h) && /Bienestar/.test(h) && /Firmar/.test(h));
  });
  ok('awards done state + all-star result render', () => {
    st.events.find((e) => e.kind === 'worlds').stage = 'done';
    core.tick(st, ctx);
    st.xtra.awards.allstar.date = U.addDays(st.currentDate, 1);
    advanceDays(st, 2);
    sandbox.S.xtra = core.snapshot(st, ctx);
    const def = X.tabs.find((t) => t.id === 'xtcircuit');
    X.setView('xtcircuit', 'awards');
    const h = def.render();
    clean(h, 'awards done');
    assert.ok(/Premios de la temporada/.test(h));
  });
}

ok('no module errors were logged', () => assert.deepStrictEqual(logs.filter((m) => /err/i.test(m)), []));
console.log(`\n${passed} checks passed`);
