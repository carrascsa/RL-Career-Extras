'use strict';
// Mod manager, world top, prospects, livelier Y, drama & orgs, and the RL World tab — on copies of a real save.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { loadEngine } = require('./engine-loader');
const core = require('../src/core');
const U = require('../src/util');
const ysocial = require('../src/y-engine');
const drama = require('../src/drama-engine');
const ranking = require('../src/ranking-engine');

const engine = loadEngine();
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, '9z-team.json');
const raw = fs.readFileSync(file, 'utf8');
// a clean copy: no add-on data and none of the prospects an earlier live session may have saved
const fresh = () => { const s = JSON.parse(raw).state; delete s.hof; delete s.xtra; const gone = new Set(s.players.filter((p) => p.xtProspect && (p.teamId == null || p.teamId < 0)).map((p) => p.id)); s.players = s.players.filter((p) => !gone.has(p.id)); return s; };
const logs = [];
const ctx = core.makeCtx(engine, { lang: 'es', log: (m) => logs.push(m) });
const run = (st, cmd) => core.command(st, cmd, ctx);
const advanceDays = (st, n) => { for (let i = 0; i < n; i++) { st.currentDate = U.addDays(st.currentDate, 1); core.tick(st, ctx); } };
const userFixture = (st) => st.fixtures.filter((f) => f.played && (f.homeId === st.userTeamId || f.awayId === st.userTeamId) && (f.games || []).length).slice(-1)[0];

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };

console.log('mod manager:');
{
  const st = fresh();
  core.tick(st, ctx);
  ok('every module listed and on by default', () => {
    const s = core.snapshot(st, ctx);
    assert.strictEqual(s.mods.length, core.MODULES.length);
    assert.ok(s.mods.every((m) => m.on));
    assert.ok(s.circuit && s.ranking && s.drama && s.prospects && s.ysocial);
  });
  ok('switching a module off hides it and refuses its commands', () => {
    assert.ok(run(st, { m: 'mods', op: 'toggle', id: 'circuit', value: false }).ok);
    const s = core.snapshot(st, ctx);
    assert.strictEqual(s.circuit, null);
    assert.strictEqual(s.mods.find((m) => m.id === 'circuit').on, false);
    const r = run(st, { m: 'circuit', op: 'enter', id: 'x' });
    assert.ok(!r.ok && /apagado/.test(r.error));
  });
  ok('an off module does not run while days pass', () => {
    run(st, { m: 'mods', op: 'toggle', id: 'ysocial', value: false });
    const before = st.social.posts.length;
    const y0 = JSON.stringify(st.xtra.ysocial);
    advanceDays(st, 10);
    assert.strictEqual(JSON.stringify(st.xtra.ysocial), y0);
    assert.ok(st.social.posts.length >= before);
  });
  ok('switching back on re-inits; all on / all off', () => {
    assert.ok(run(st, { m: 'mods', op: 'toggle', id: 'circuit', value: true }).ok);
    assert.ok(core.snapshot(st, ctx).circuit);
    run(st, { m: 'mods', op: 'all', value: false });
    assert.ok(core.snapshot(st, ctx).mods.every((m) => !m.on));
    run(st, { m: 'mods', op: 'all', value: true });
    assert.ok(core.snapshot(st, ctx).mods.every((m) => m.on));
    assert.ok(!run(st, { m: 'mods', op: 'toggle', id: 'nope' }).ok);
  });
}

console.log('world top:');
{
  const st = fresh();
  core.tick(st, ctx);
  const R = core.snapshot(st, ctx).ranking;
  ok('all-time ranking from real RLCS titles, sorted', () => {
    assert.ok(R.allTime.length >= 30, 'rows ' + R.allTime.length);
    for (let i = 1; i < R.allTime.length; i++) assert.ok(R.allTime[i - 1].pts >= R.allTime[i].pts);
    assert.ok(R.allTime.slice(0, 10).some((r) => r.worlds >= 1), 'world champions near the top');
    console.log('    top 5 all-time: ' + R.allTime.slice(0, 5).map((r) => `${r.name} (${r.pts}, ${r.worlds}W ${r.majors}M)`).join(', '));
  });
  ok('current ranking and team ranking', () => {
    assert.ok(R.current.length === 50 && R.teams.length === 20);
    for (let i = 1; i < R.current.length; i++) assert.ok(R.current[i - 1].score >= R.current[i].score);
    console.log('    top 5 now: ' + R.current.slice(0, 5).map((r) => `${r.name} ${r.team} (${r.score})`).join(', '));
  });
  ok('titles won in the career add to the all-time score', () => {
    const p = st.players.find((x) => x.name === R.allTime[20].name);
    const was = ranking._test.allTime(st).find((r) => r.id === p.id);
    p.titles.push({ k: 'worlds_champion', y: 2027 });
    const row = ranking._test.allTime(st).find((r) => r.id === p.id);
    assert.strictEqual(row.pts, was.pts + 100);
    assert.strictEqual(row.career, was.career + 100);
  });
  ok('retired real legends from the Liquipedia list are included once', () => {
    const rows = ranking._test.allTime(st);
    const turbo = rows.find((r) => r.name === 'Turbopolsa');
    assert.ok(turbo && turbo.status === 'legend' && turbo.worlds === 4, JSON.stringify(turbo));
    assert.ok(!rows.some((r) => r.name === 'Vatira.'), 'spelling variant not duplicated');
  });
}

console.log('prospects:');
{
  const st = fresh();
  const n0 = st.players.length;
  core.tick(st, ctx);
  const made = st.players.filter((p) => p.xtProspect);
  ok('a season class of free-agent teenagers in every region', () => {
    assert.ok(made.length >= 14 && made.length <= 28, 'made ' + made.length);
    assert.strictEqual(st.players.length, n0 + made.length);
    for (const p of made) {
      assert.ok(p.teamId === -1 && p.freeAgent && p.age >= 15 && p.age <= 18 && p.potential >= 78 && p.rating < p.potential, JSON.stringify(p).slice(0, 120));
      assert.ok(Number.isFinite(p.wage) && p.wage > 0);
    }
    const others = new Set(st.players.filter((p) => !p.xtProspect).map((p) => p.name.toLowerCase()));
    const names = made.map((p) => p.name.toLowerCase());
    assert.strictEqual(new Set(names).size, names.length, 'unique prospect names');
    assert.ok(names.every((n) => !others.has(n)), 'no clash with existing players');
    const regs = new Set(made.map((p) => p.home));
    assert.strictEqual(regs.size, st.regions.length);
  });
  ok('careers that already had the addon get the new modules initialised once', () => {
    const old = fresh();
    core.tick(old, ctx);
    const x = old.xtra;
    old.players = old.players.filter((p) => !p.xtProspect);
    delete x.prospects; delete x.inited; delete x.drama; delete x.ysocial;
    core.tick(old, ctx);
    assert.ok(old.players.filter((p) => p.xtProspect).length >= 14, 'prospects seeded on an old career');
    assert.ok(x.inited.prospects && x.inited.academy);
    const n = old.players.length;
    core.tick(old, ctx);
    assert.strictEqual(old.players.length, n);
  });
  ok('not seeded twice in the same season; new class next season', () => {
    core.tick(st, ctx);
    assert.strictEqual(st.players.filter((p) => p.xtProspect).length, made.length);
    st.season += 1;
    core.tick(st, ctx);
    assert.ok(st.players.filter((p) => p.xtProspect).length > made.length);
  });
  ok('radar lists young high-potential players, new ones marked', () => {
    const P = core.snapshot(st, ctx).prospects;
    assert.ok(P.radar.length >= 20 && P.radar.some((p) => p.fresh));
    assert.ok(P.radar.every((p) => p.age <= 20));
    assert.ok(st.social.posts.some((p) => p.xt && /Scouts|wonderkid|kid first/.test(p.text)), 'announced on Y');
  });
}

console.log('livelier Y:');
{
  const st = fresh();
  core.tick(st, ctx);
  ok('repeated Hub lines are swapped for fresh ones (keeping the score)', () => {
    const y = st.xtra.ysocial;
    const base = { kind: 'player', authorId: 5, name: 'zen', handle: 'zen', followers: 1000, verified: true, likes: 1, reposts: 0, replies: 0, views: 10 };
    st.social.posts.unshift(Object.assign({}, base, { id: y.lastId + 1, date: st.currentDate, ctx: 'grind', text: 'some old line' }));
    st.social.posts.unshift(Object.assign({}, base, { id: y.lastId + 2, date: st.currentDate, ctx: 'grind', text: 'some old line' }));
    st.social.posts.unshift(Object.assign({}, base, { id: y.lastId + 3, date: st.currentDate, ctx: 'loss', text: 'rough. 3-1' }));
    st.social.posts.unshift(Object.assign({}, base, { id: y.lastId + 4, date: st.currentDate, ctx: 'loss', text: 'rough. 3-1' }));
    st.social.posts.unshift(Object.assign({}, base, { id: y.lastId + 5, date: st.currentDate, ctx: 'grind', text: 'mine', mine: true }));
    st.social.posts.unshift(Object.assign({}, base, { id: y.lastId + 6, date: st.currentDate, ctx: 'grind', text: 'mine', mine: true }));
    const n = y.rewritten;
    ysocial._test.refresh(st, y, ctx);
    const P = st.social.posts;
    assert.ok(y.rewritten >= n + 2, 'rewrote ' + (y.rewritten - n));
    assert.ok(P.slice(0, 6).filter((p) => p.text === 'mine').length === 2, 'own posts untouched');
    const loss = P.slice(0, 4).filter((p) => p.ctx === 'loss');
    assert.ok(loss.some((p) => p.xtFresh && !/\{score\}/.test(p.text)));
  });
  ok('fans and media react to your series', () => {
    const fx = userFixture(st);
    assert.ok(fx, 'a played user fixture');
    fx.date = st.currentDate;
    st.xtra.ysocial.seenFx = st.xtra.ysocial.seenFx.filter((id) => id !== fx.id);
    const before = st.social.posts.length;
    core.tick(st, ctx);
    const added = st.social.posts.slice(0, st.social.posts.length - before);
    assert.ok(added.length >= 1 && added.every((p) => p.xt && p.text && !/\{|undefined/.test(p.text)), JSON.stringify(added.map((p) => p.text)));
    console.log('    e.g. ' + added.slice(0, 3).map((p) => `[${p.kind}] ${p.text}`).join(' | '));
    core.tick(st, ctx);
    assert.strictEqual(st.social.posts.length, before + added.length, 'no double reactions');
  });
  ok('weekly power rankings / rumours over a month', () => {
    const before = st.xtra.ysocial.posted;
    advanceDays(st, 30);
    assert.ok(st.xtra.ysocial.posted > before);
  });
}

console.log('drama & orgs:');
{
  const st = fresh();
  core.tick(st, ctx);
  const d = st.xtra.drama;
  const p = U.rosterPlayers(st).find((x) => !x.isUser);
  ok('controversy: fine the player (money in, morale down)', () => {
    d.pending = { type: 'contro', kind: 'party', pid: p.id, oppId: 1, date: st.currentDate };
    const S = core.snapshot(st, ctx).drama;
    assert.ok(S.pending && S.pending.options.length === 4 && /fiesta/.test(S.pending.title));
    const b0 = U.userTeam(st).budget; const m0 = p.morale;
    assert.ok(!run(st, { m: 'drama', op: 'decide', choice: 'calm' }).ok, 'bad choice refused');
    const r = run(st, { m: 'drama', op: 'decide', choice: 'fine' });
    assert.ok(r.ok && r.money > 0);
    assert.strictEqual(U.userTeam(st).budget, b0 + r.money);
    assert.ok(p.morale < m0);
    assert.strictEqual(d.pending, null);
    assert.strictEqual(d.log[0].choice, 'fine');
  });
  ok('beef: unanswered defaults to "let it run" and the grudge match settles it', () => {
    const rival = st.players.find((x) => x.teamId >= 0 && x.teamId !== st.userTeamId);
    d.pending = { type: 'beef', pid: p.id, otherId: rival.id, oppId: rival.teamId, date: U.addDays(st.currentDate, -10) };
    advanceDays(st, 1);
    assert.strictEqual(d.pending, null);
    assert.strictEqual(d.beefs[0].choice, 'fuel');
    assert.ok(d.beefs[0].auto);
    assert.ok(d.feud && d.feud.oppId === rival.teamId);
    const fx = userFixture(st);
    const opp = fx.homeId === st.userTeamId ? fx.awayId : fx.homeId;
    d.feud = { pid: p.id, oppId: opp, since: fx.date };
    core.tick(st, ctx);
    assert.strictEqual(d.feud, null);
    assert.strictEqual(d.log[0].kind, 'feud');
  });
  ok('AI merger swaps players consistently; slot gets a new org', () => {
    const r = U.rng('merge-test');
    assert.ok(drama._test.mergeAI(st, d, r, ctx));
    const o = d.orgLog[0];
    assert.strictEqual(o.kind, 'merge');
    const B = U.teamOf(st, o.teamId);
    assert.ok(B.name === o.to && /\.(png|svg)$/.test(B.logo));
    for (const t of st.teams) for (const id of t.playerIds || []) assert.strictEqual(U.playerOf(st, id).teamId, t.id, 'player/team link ' + id);
    for (const t of st.teams) for (const id of t.lineup || []) assert.ok((t.playerIds || []).includes(id), 'lineup in roster');
  });
  ok('slot sale renames a weak club', () => {
    assert.ok(drama._test.sellAI(st, d, U.rng('sale'), ctx));
    assert.strictEqual(d.orgLog[0].kind, 'sale');
    assert.ok(U.teamOf(st, d.orgLog[0].teamId).name === d.orgLog[0].to);
  });
  ok('found a new organisation (validated)', () => {
    assert.ok(!run(st, { m: 'drama', op: 'found', name: 'x', abbrev: 'AB', region: 'eu' }).ok);
    assert.ok(!run(st, { m: 'drama', op: 'found', name: U.userTeam(st).name, abbrev: 'AB', region: 'eu' }).ok);
    const r = run(st, { m: 'drama', op: 'found', name: 'Malvinas Rockets', abbrev: 'mlv!', region: 'sam' });
    assert.ok(r.ok, r.error);
    const t = st.teams.find((x) => x.name === 'Malvinas Rockets');
    assert.ok(t && t.abbrev === 'MLV' && t.region === 'sam' && t.id !== st.userTeamId);
  });
  ok('merge a smaller club into yours: fee, star player, once per season', () => {
    const S = core.snapshot(st, ctx).drama;
    assert.ok(S.mergeTargets.length > 0);
    const me = U.userTeam(st);
    while (me.playerIds.length >= 6) me.playerIds.pop();
    const tgt = S.mergeTargets[0];
    const b0 = me.budget;
    const r = run(st, { m: 'drama', op: 'merge', teamId: tgt.id });
    assert.ok(r.ok, r.error);
    assert.strictEqual(me.budget, b0 - tgt.fee);
    const star = st.players.find((x) => x.name === r.star);
    assert.ok(star.teamId === me.id && me.playerIds.includes(star.id));
    assert.ok(!U.teamOf(st, tgt.id).playerIds.includes(star.id));
    assert.ok(!run(st, { m: 'drama', op: 'merge', teamId: core.snapshot(st, ctx).drama.mergeTargets[0].id }).ok);
  });
  ok('120 days of drama and Y without errors', () => {
    const n = logs.length;
    advanceDays(st, 120);
    assert.deepStrictEqual(logs.slice(n).filter((l) => /err/.test(l)), []);
    console.log(`    orgs moved: ${d.orgLog.length}, beefs: ${d.beefs.length}, drama: ${d.log.length}, Y posts: ${st.xtra.ysocial.posted}`);
  });
}

console.log('RL World tab:');
{
  const st = fresh();
  core.tick(st, ctx);
  st.xtra.drama.pending = { type: 'contro', kind: 'leak', pid: U.rosterPlayers(st).find((x) => !x.isUser).id, oppId: 1, date: st.currentDate };
  drama._test.sellAI(st, st.xtra.drama, U.rng('ui'), ctx);
  const doc = { head: { appendChild() {} }, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, remove() {} }), addEventListener() {} };
  const sandbox = { window: {}, document: doc, console, setInterval() {}, setTimeout() {}, requestAnimationFrame() {}, S: { lang: 'es', career: {}, xtra: core.snapshot(st, ctx) }, tab: 'xtworld' };
  sandbox.window.hub = { placeBet: async () => ({}) };
  sandbox.topbarHtml = () => '<button data-tab="setup">Setup</button>';
  sandbox.tabInnerHtml = () => '';
  sandbox.render = () => {};
  sandbox.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  vm.createContext(sandbox);
  for (const f of ['ui-common.js', 'academy-ui.js', 'clublife-ui.js', 'circuit-ui.js', 'world-ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), sandbox, { filename: f });
  const X = sandbox.window.__xt;
  const clean = (html, what) => assert.ok(!/undefined|NaN|\[object/.test(html), what + ': ' + (html.match(/.{60}(undefined|NaN|\[object).{20}/) || [''])[0]);
  const def = X.tabs.find((t) => t.id === 'xtworld');
  ok('every view renders cleanly', () => {
    for (const v of ['top', 'prospects', 'drama', 'mods']) { X.setView('xtworld', v); clean(def.render(), v); }
    for (const k of ['allTime', 'current', 'teams']) { def.local('top:' + k); X.setView('xtworld', 'top'); clean(def.render(), k); }
    X.setView('xtworld', 'drama');
    const h = def.render();
    assert.ok(/DMs/.test(h) && /vendió su plaza/.test(h) && /Fundar/.test(h) && /Fusionar/.test(h));
    assert.strictEqual(def.badge(), 1);
  });
  ok('mod switches hide tabs and views', () => {
    run(st, { m: 'mods', op: 'toggle', id: 'academy', value: false });
    run(st, { m: 'mods', op: 'toggle', id: 'circuit', value: false });
    sandbox.S.xtra = core.snapshot(st, ctx);
    assert.strictEqual(X.tabs.find((t) => t.id === 'xtacademy').visible(), false);
    const circ = X.tabs.find((t) => t.id === 'xtcircuit');
    assert.strictEqual(circ.visible(), true);
    const h = circ.render();
    clean(h, 'circuit without circuit');
    assert.ok(!/data-xt-view="xtcircuit:events"/.test(h));
    X.setView('xtworld', 'mods');
    const m = def.render();
    assert.ok(/Apagado/.test(m) && /Siempre activo/.test(m));
    run(st, { m: 'mods', op: 'all', value: false });
    sandbox.S.xtra = core.snapshot(st, ctx);
    assert.strictEqual(circ.visible(), false);
    assert.strictEqual(X.tabs.find((t) => t.id === 'xtclublife').visible(), false);
    X.setView('xtworld', 'top');
    clean(def.render(), 'ranking off');
  });
}

console.log('caster:');
{
  const caster = require('../src/caster-engine');
  const st = fresh();
  core.tick(st, ctx);
  const list = caster._test.castable(st);
  ok('series to cast: yours and the big finals', () => {
    assert.ok(list.length >= 5);
    assert.ok(list.every((f) => f.homeId === st.userTeamId || f.awayId === st.userTeamId || f.stage === 'final'));
  });
  ok('every script matches the real result game by game (EN and ES)', () => {
    const all = st.fixtures.filter((f) => f.played && (f.games || []).length && f.games.every((g) => g.homeLines)).slice(-120);
    let ot = 0;
    for (const lang of ['en', 'es']) for (const fx of all) {
      const sc = caster._test.buildScript(st, fx, lang);
      for (const l of sc.lines) assert.ok(l.text && !/\{|undefined|NaN/.test(l.text), fx.id + ': ' + l.text);
      // the clock only counts down within a game
      for (let gi = 1; gi <= fx.games.length; gi++) {
        const cl = sc.lines.filter((l) => l.game === gi && /^\d+:\d\d$/.test(l.clock || '')).map((l) => { const [m, x] = l.clock.split(':').map(Number); return m * 60 + x; });
        for (let k = 1; k < cl.length; k++) assert.ok(cl[k] <= cl[k - 1], `clock goes back in fx ${fx.id} game ${gi}: ${cl.join(',')}`);
      }
      assert.ok(!sc.lines.some((l) => /\b1 goles|\b1 atajadas|\b1 goals|\b1 saves/.test(l.text)), 'plurals');
      fx.games.forEach((g, gi) => {
        const goals = sc.lines.filter((l) => l.game === gi + 1 && l.goal);
        assert.strictEqual(goals.filter((l) => l.goal === 'home').length, g.homeGoals, 'home goals fx ' + fx.id + ' g' + (gi + 1));
        assert.strictEqual(goals.filter((l) => l.goal === 'away').length, g.awayGoals, 'away goals');
        const lastScore = goals.length ? goals[goals.length - 1].score : [0, 0];
        assert.deepStrictEqual(lastScore, [g.homeGoals, g.awayGoals]);
        if (g.overtime) {
          ot++;
          const w = goals[goals.length - 1];
          assert.strictEqual(w.goal, g.homeGoals > g.awayGoals ? 'home' : 'away', 'OT winner scores last');
          const reg = goals.slice(0, -1);
          const rs = reg.length ? reg[reg.length - 1].score : [0, 0];
          assert.strictEqual(rs[0], rs[1], 'level after regulation');
        }
      });
      const fin = sc.lines.find((l) => l.final);
      const hw = fx.games.filter((g) => g.homeGoals > g.awayGoals).length;
      assert.deepStrictEqual(fin.series, [hw, fx.games.length - hw]);
    }
    console.log(`    ${all.length} series × 2 languages, ${ot / 2} overtime games`);
  });
  ok('script command, settings and the Caster tab render', () => {
    const fx = list[0];
    const r = run(st, { m: 'caster', op: 'script', id: fx.id });
    assert.ok(r.ok && r.script.lines.length > 8 && r.script.lang === 'es');
    console.log('    ' + r.script.lines.slice(0, 4).map((l) => l.text).join(' | '));
    assert.ok(run(st, { m: 'caster', op: 'settings', lang: 'en', voice: false, rate: 1.3 }).ok);
    assert.strictEqual(run(st, { m: 'caster', op: 'script', id: fx.id }).script.lang, 'en');
    assert.ok(!run(st, { m: 'caster', op: 'script', id: -5 }).ok);
    const S = core.snapshot(st, ctx).caster;
    assert.ok(S.list[0].watched && S.voice === false && S.rate === 1.3);
    const doc = { head: { appendChild() {} }, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, remove() {} }), addEventListener() {} };
    const sandbox = { window: {}, document: doc, console, setInterval() {}, setTimeout() { return 1; }, clearTimeout() {}, requestAnimationFrame() {}, S: { lang: 'es', career: {}, xtra: core.snapshot(st, ctx) }, tab: 'xtcaster' };
    sandbox.window.hub = { placeBet: async () => ({}) };
    sandbox.topbarHtml = () => '<button data-tab="setup">Setup</button>';
    sandbox.tabInnerHtml = () => '';
    sandbox.render = () => {};
    sandbox.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    vm.createContext(sandbox);
    for (const f of ['ui-common.js', 'caster-ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), sandbox, { filename: f });
    const X = sandbox.window.__xt;
    const def = X.tabs.find((x) => x.id === 'xtcaster');
    const clean = (html) => assert.ok(!/undefined|NaN|\[object/.test(html), (html.match(/.{60}(undefined|NaN|\[object).{20}/) || [''])[0]);
    clean(def.render());
    def.afterCmd('caster', 'script', {}, r);
    for (let k = 0; k < 6; k++) def.local('skip');
    const h = def.render();
    clean(h);
    assert.ok(/Transmisión/.test(h) && /Relato/.test(h) && h.includes(sandbox.esc(r.script.home)));
    def.local('finish');
    clean(def.render());
    def.local('stop');
    clean(def.render());
  });
}

assert.deepStrictEqual(logs.filter((l) => /err/.test(l)), [], 'module errors: ' + logs.filter((l) => /err/.test(l)).join('\n'));
console.log(`\n${passed} checks passed.`);
