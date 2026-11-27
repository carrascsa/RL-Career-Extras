'use strict';
// Live caster (level 3): the Python observer's detector (synthetic RLBot packets), the commentary
// composer, the match context from the career, the process wrapper and the live panel in the window.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { loadEngine, findAsar } = require('./engine-loader');
const core = require('../src/core');
const U = require('../src/util');
const LC = require('../src/live-caster');

const engine = loadEngine();
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, '9z-team.json');
const raw = fs.readFileSync(file, 'utf8');
const fresh = () => { const s = JSON.parse(raw).state; delete s.hof; delete s.xtra; return s; };
const ctx = core.makeCtx(engine, { lang: 'es' });

let passed = 0;
// checks run in order at the end (some are async)
const queue = [];
const ok = (name, fn) => queue.push([name, fn]);

console.log('observer (Python, synthetic packets):');
const asar = findAsar();
const python = asar ? path.join(path.dirname(asar), 'python', 'python.exe') : null;
ok('detector self-test with the Hub\'s Python + RLBot', () => {
  assert.ok(python && fs.existsSync(python), 'Hub python at ' + python);
  const out = execFileSync(python, [path.join(__dirname, '..', 'src', 'live', 'observer.py'), '--selftest'], { encoding: 'utf8', cwd: path.join(__dirname, '..', 'src', 'live') });
  const res = JSON.parse(out.trim().split('\n').pop());
  assert.ok(res.ok, JSON.stringify(res.fails));
  console.log('    ' + res.kinds.join(' → '));
});

console.log('composer:');
const st = fresh();
core.tick(st, ctx);
const team = U.userTeam(st);
const user = st.players.find((p) => p.isUser);
const mates = U.rosterPlayers(st).filter((p) => !p.isUser).slice(0, 2);
const oppTeam = st.teams.find((t) => t.id !== team.id && (t.playerIds || []).length >= 3);
const opps = oppTeam.playerIds.slice(0, 3).map((id) => U.playerOf(st, id));
const players = [{ name: 'SteamName123', team: 0, bot: false }, ...mates.map((p) => ({ name: p.name, team: 0, bot: true })), ...opps.map((p) => ({ name: p.name, team: 1, bot: true }))];
const spec = { cars: [{ type: 'human', team: 0 }, ...mates.map((p) => ({ type: 'rlbot', team: 0, name: p.name, livery: { club: team.name } })), ...opps.map((p) => ({ type: 'rlbot', team: 1, name: p.name, livery: { club: oppTeam.name } }))] };
// a pending Bo5 fixture where we already lead 1-0
const fx = { id: 999999, eventId: (st.events[0] || {}).id, homeId: team.id, awayId: oppTeam.id, bestOf: 5, games: [{ homeGoals: 3, awayGoals: 1 }], played: false, date: st.currentDate };
st.fixtures.push(fx);
st.pendingMatch = fx.id;

ok('match context: clubs, the human is the career player, game 2 of a Bo5 at 1-0', () => {
  const c = LC.matchContext(st, spec, players, 'es');
  assert.strictEqual(c.blue, team.name);
  assert.strictEqual(c.orange, oppTeam.name);
  assert.strictEqual(c.names.SteamName123, user.name);
  assert.strictEqual(c.game, 2);
  assert.deepStrictEqual(c.series, [1, 0]);
  assert.strictEqual(c.bestOf, 5);
});

const events = [
  { k: 'roster', players },
  { k: 'start', score: [0, 0], remaining: 300 },
  { k: 'hit', kind: 'AerialHit', name: opps[0].name, team: 1, speed: 60 },
  { k: 'save', name: 'SteamName123', team: 0, epic: true, score: [0, 0] },
  { k: 'demo', name: mates[0].name, team: 0, victim: opps[1].name },
  { k: 'goal', scorer: mates[0].name, assist: 'SteamName123', team: 0, score: [1, 0], speed: 132, tags: ['AerialGoal'], own: false, ot: false },
  { k: 'kickoff', score: [1, 0], remaining: 260, ot: false },
  { k: 'goal', scorer: opps[2].name, assist: null, team: 1, score: [1, 1], speed: 80, tags: [], own: false, ot: false },
  { k: 'goal', scorer: null, assist: null, team: 1, score: [1, 2], speed: 0, tags: [], own: false, ot: false },
  { k: 'goal', scorer: opps[0].name, team: 0, score: [2, 2], speed: 40, tags: [], own: true, ot: false },
  { k: 'clock', left: 60, score: [2, 2] },
  { k: 'clock', left: 30, score: [2, 2] },
  { k: 'overtime', score: [2, 2] },
  { k: 'goal', scorer: mates[0].name, team: 0, score: [3, 2], speed: 110, tags: ['OvertimeGoal'], own: false, ot: true },
  { k: 'end', score: [3, 2], mvp: mates[0].name },
];
for (const lang of ['es', 'en']) {
  ok(`a full game in ${lang}: every play is called, names resolved, no template gaps`, () => {
    const sent = [];
    const live = LC.createLive({ getState: () => st, send: (p) => sent.push(p), lang: () => lang, python: null, readSpec: () => spec });
    st.xtra.caster = Object.assign(st.xtra.caster || {}, { lang, live: true });
    for (const ev of events) live._onEvent(ev);
    const lines = sent.flatMap((p) => p.lines);
    for (const l of lines) assert.ok(l.text && !/\{|undefined|NaN|null/.test(l.text), l.text);
    const text = lines.map((l) => l.text).join(' | ');
    assert.ok(text.includes(team.name) && text.includes(oppTeam.name), 'club names');
    assert.ok(text.includes(user.name) && !text.includes('SteamName123'), 'human shown as the career player');
    assert.ok(text.includes('132'), 'goal speed');
    assert.ok(sent.find((p) => p.event === 'goal').lines[0].pri === 3, 'goals are must-say');
    const end = sent.find((p) => p.event === 'end');
    assert.ok(end && end.lines.some((l) => l.kind === 'series'), 'series update at the end');
    assert.ok(/2-0/.test(end.lines.map((l) => l.text).join(' ')), 'series now 2-0: ' + end.lines.map((l) => l.text).join(' / '));
    console.log('    ' + lines.slice(0, 8).map((l) => l.text).join(' | '));
  });
}
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'voice', 'manifest.json'), 'utf8'));
ok('pro voices: every recorded file exists and every clip the composer asks for was recorded', () => {
  for (const f of manifest.files) assert.ok(fs.existsSync(path.join(__dirname, '..', 'src', 'voice', f + '.mp3')), f);
  for (const [k, list] of Object.entries(manifest.clips)) for (const c of list) assert.ok(manifest.files.includes(c[0]) && c[2] > c[1], k);
  const sent = [];
  const live = LC.createLive({ getState: () => st, send: (p) => sent.push(p), lang: () => 'en', python: null, readSpec: () => spec });
  st.xtra.caster = Object.assign(st.xtra.caster || {}, { lang: 'en', live: true });
  for (let n = 0; n < 6; n++) for (const ev of events) live._onEvent(ev);
  const lines = sent.flatMap((p) => p.lines);
  const withClip = lines.filter((l) => l.clip);
  assert.ok(withClip.length >= lines.length - 6, `most lines have clips (${withClip.length}/${lines.length})`);
  for (const l of withClip) for (const key of l.clip) if (!/\?$/.test(key)) assert.ok(key.split('|').some((k) => manifest.clips[k]), 'missing clip ' + key + ' for: ' + l.text);
  // names: the players of the user's teams were recorded
  for (const n of ['vatira', 'atow', 'zen', 'reekkan']) assert.ok(manifest.clips['name:' + n] || manifest.clips['goalcall:' + n], 'name ' + n);
  assert.ok(Object.keys(manifest.clips).filter((k) => k.startsWith('name:')).length > 500, 'hundreds of names');
  // a player with a full recorded call: that call replaces "GOAL!" + name (no shout said twice)
  const comp = LC.makeComposer('en');
  const v = comp.compose({ k: 'goal', scorer: 'Vatira', team: 0, score: [1, 0], tags: [], speed: 50 }).find((l) => l.kind === 'goal');
  assert.strictEqual(v.clip[0], 'goalcall:vatira|goal', JSON.stringify(v.clip));
  assert.ok(manifest.clips['goalcall:vatira'] && !manifest.clips['name:vatira'], 'Vatira only has the full call');
  // the same goal reported twice is called once
  const twice = [];
  const lv = LC.createLive({ getState: () => st, send: (p) => twice.push(p), lang: () => 'en', python: null, readSpec: () => spec });
  lv._onEvent({ k: 'goal', scorer: mates[0].name, team: 0, score: [1, 0], tags: [], speed: 40 });
  lv._onEvent({ k: 'goal', scorer: mates[0].name, team: 0, score: [1, 0], tags: [], speed: 40 });
  assert.strictEqual(twice.filter((p) => p.event === 'goal').length, 1, 'duplicate goal ignored');
  lv._onEvent({ k: 'idle' });
  assert.ok(twice.some((p) => p.event === 'idle'), 'leaving the match is passed on');
  const g = lines.find((l) => l.kind === 'goal' && l.clip.some((k) => /^name:.*\?$/.test(k)));
  assert.ok(g, 'goal calls carry the scorer name');
  const goal = lines.find((l) => l.kind === 'goal' && l.clip.some((k) => /^s\d-\d$/.test(k)));
  assert.ok(goal, 'goals are followed by the score');
});

ok('broadcast screens: the end of a game gives the series card and the stat sheet', () => {
  const shown = [];
  const live = LC.createLive({ getState: () => st, send: () => {}, onEnd: (d) => shown.push(d), lang: () => 'en', python: null, readSpec: () => spec });
  st.xtra.caster = Object.assign(st.xtra.caster || {}, { lang: 'en', live: false, broadcast: true });
  const stats = [...mates.map((p, i) => ({ name: p.name, team: 0, score: 300 + i, goals: 1, assists: i, shots: 2, saves: 1, demos: i })), { name: 'SteamName123', team: 0, score: 500, goals: 2, assists: 1, shots: 4, saves: 3, demos: 2 }, ...opps.map((p, i) => ({ name: p.name, team: 1, score: 100 + i, goals: 0, assists: 0, shots: 1, saves: 2, demos: 0 }))];
  live._onEvent({ k: 'roster', players });
  live._onEvent({ k: 'start', score: [0, 0], remaining: 300 });
  live._onEvent({ k: 'end', score: [3, 2], mvp: 'SteamName123', stats });
  assert.strictEqual(shown.length, 1, 'shown even with the commentary off');
  const d = shown[0];
  assert.strictEqual(d.teams[0].name, team.name);
  assert.strictEqual(d.teams[1].name, oppTeam.name);
  assert.deepStrictEqual(d.series, [2, 0], 'series 1-0 before this game, 2-0 after');
  assert.strictEqual(d.game, 2);
  assert.deepStrictEqual(d.seq, [0, 0], 'pips: game 1 and game 2 won by blue');
  const mvp = d.teams[0].players.find((p) => p.mvp);
  assert.ok(mvp && mvp.name === user.name, 'MVP is the best of the winners, shown with the career name');
  assert.ok(d.teams[0].players.every((p) => typeof p.demos === 'number'));
  assert.ok(/lead the series 2-0/.test(d.footer), d.footer);
  assert.ok(d.header && !/undefined/.test(d.header), d.header);
  // switched off in the settings: nothing
  st.xtra.caster.broadcast = false;
  live._onEvent({ k: 'end', score: [3, 2], stats });
  assert.strictEqual(shown.length, 1);
  st.xtra.caster.broadcast = true; st.xtra.caster.live = true;
  // the screen itself renders with that data
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'overlay', 'endscreen.html'), 'utf8');
  assert.ok(/window\.xtShowEnd = function/.test(html) && /window\.xtHide = function/.test(html));
});

ok('switched off (setting or mod manager) = silent', () => {
  const sent = [];
  const live = LC.createLive({ getState: () => st, send: (p) => sent.push(p), lang: () => 'es', python: null, readSpec: () => spec });
  st.xtra.caster.live = false;
  for (const ev of events) live._onEvent(ev);
  st.xtra.caster.live = true;
  st.xtra.mods = { off: { caster: true } };
  for (const ev of events) live._onEvent(ev);
  delete st.xtra.mods;
  assert.strictEqual(sent.length, 0);
});

console.log('window:');
ok('live panel, pro voices (shout + name + score) and the crowd building on a goal', async () => {
  const spoken = [];
  const synth = { speaking: false, getVoices: () => [{ name: 'Microsoft Pablo - Spanish (Spain)', lang: 'es-ES' }, { name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' }], speak: (u) => spoken.push(u), cancel: () => spoken.push('CANCEL'), addEventListener() {} };
  const doc = { head: { appendChild() {} }, body: { appendChild() {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, remove() {} }), addEventListener() {} };
  const sandbox = { window: { speechSynthesis: synth }, document: doc, console, setInterval() {}, setTimeout() { return 1; }, clearTimeout() {}, requestAnimationFrame() {}, S: { lang: 'es', career: {}, xtra: core.snapshot(st, ctx) }, tab: 'xtcaster', SpeechSynthesisUtterance: function (text) { this.text = text; } };
  sandbox.window.hub = { placeBet: async () => ({}) };
  sandbox.topbarHtml = () => '<button data-tab="setup">Setup</button>';
  sandbox.tabInnerHtml = () => '';
  sandbox.render = () => {};
  sandbox.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  vm.createContext(sandbox);
  for (const f of ['ui-common.js', 'caster-ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), sandbox, { filename: f });
  const def = sandbox.window.__xt.tabs.find((x) => x.id === 'xtcaster');
  assert.ok(/EN VIVO desde Rocket League/.test(def.render()));
  const live = sandbox.window.__xtLive;
  if (process.env.DBG) console.log('DBG', JSON.stringify(sandbox.S.xtra.caster && { v: sandbox.S.xtra.caster.voice, l: sandbox.S.xtra.caster.effLang }), typeof live);
  live({ lang: 'es', event: 'save', lines: [{ who: 'pbp', text: 'Atajada de X', pri: 1 }, { who: 'color', text: 'charla', pri: 1 }, { who: 'color', text: 'más charla', pri: 1 }] });
  assert.strictEqual(spoken.length, 1, 'first line spoken, the rest queued/dropped');
  assert.strictEqual(spoken[0].voice.name, 'Microsoft Pablo - Spanish (Spain)', 'Max gets the male voice');
  live({ lang: 'es', event: 'goal', score: [1, 0], blue: 'Azules', orange: 'Naranjas', lines: [{ who: 'pbp', text: '¡GOOOL de Y! ¡1-0!', pri: 3 }] });
  assert.ok(spoken.includes('CANCEL'), 'goal interrupts the flavour line');
  const goalU = spoken.find((u) => u && u.text && /GOOOL/.test(u.text));
  assert.ok(goalU && goalU.pitch > 1.2, 'excited pitch for the goal');
  const h = def.render();
  assert.ok(/GOOOL de Y/.test(h) && /1 - 0/.test(h) && /Azules/.test(h), 'panel shows score and lines');
  assert.ok(!/undefined|NaN/.test(h));

  // pro voices: with an AudioContext and the clips loaded, English lines play recorded clips in order
  const started = [];
  const ramps = [];
  let stopped = 0;
  const param = (v) => ({ value: v, setValueAtTime(x) { this.value = x; }, linearRampToValueAtTime(x, t) { ramps.push(['lin', x, t]); this.value = x; }, exponentialRampToValueAtTime(x, t) { ramps.push(['exp', x, t]); this.value = x; }, cancelScheduledValues() {} });
  class FakeCtx {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.sampleRate = 24000; }
    createGain() { return { gain: param(1), connect() {}, disconnect() {} }; }
    createBufferSource() { const s = { connect() {}, start: (at, off, len) => started.push({ at, off, len, loop: s.loop, s }), stop: () => { stopped++; } }; return s; }
    decodeAudioData() { return Promise.resolve({ duration: 30 }); }
    resume() { return Promise.resolve(); }
  }
  for (const u of spoken.slice()) if (u && u.onend) u.onend(); // the Windows voice finishes its line
  const prefs = { 'xtCaster.amb': 'off' };
  sandbox.window.localStorage = { getItem: (k) => prefs[k] || null, setItem: (k, v) => { prefs[k] = v; } };
  sandbox.window.AudioContext = FakeCtx;
  sandbox.atob = (b) => Buffer.from(b, 'base64').toString('binary');
  assert.ok(/clip kinds/.test(sandbox.window.__xtVoice({ manifest })));
  for (const f of [...manifest.files, ...Object.values(manifest.amb).flat()]) sandbox.window.__xtVoiceFile(f, 'AAAA');
  const tick = () => new Promise((res) => setTimeout(res, 20));
  // goal by a recorded player: shout, name, score, in that order
  live({ lang: 'en', event: 'goal', score: [2, 1], lines: [{ who: 'pbp', text: 'GOAL! Vatira! 2-1!', pri: 3, clip: ['goal', 'name:borja?', 's2-1'] }] });
  await tick();
  assert.strictEqual(started.length, 3, 'shout + name + score: ' + JSON.stringify(started));
  assert.ok(manifest.clips.goal.some((c) => c[1] === started[0].off), 'a goal shout first');
  assert.ok(manifest.clips['name:borja'].some((c) => c[1] === started[1].off), 'then the name');
  assert.ok(started[2].at > started[1].at && started[1].at > started[0].at, 'in order');
  // a player nobody recorded: the name is skipped, the call still works
  const end = started[started.length - 1].s; if (end.onended) end.onended(); // the first call finishes
  started.length = 0;
  live({ lang: 'en', event: 'goal', score: [3, 1], lines: [{ who: 'pbp', text: 'GOAL! Nobody! 3-1!', pri: 3, clip: ['goal', 'name:nobodyrecorded?', 's3-1'] }] });
  await tick();
  assert.strictEqual(started.length, 2, 'shout + score without the unknown name');
  // the crowd: turned on, a goal makes it rise from almost nothing to a roar (no sudden jump)
  prefs['xtCaster.amb'] = 'on';
  started.length = 0; ramps.length = 0;
  live({ lang: 'en', event: 'goal', score: [4, 1], lines: [] });
  await tick(); await tick();
  assert.ok(started.some((s) => s.loop), 'arena bed and chants start looping');
  assert.ok(started.some((s) => !s.loop && s.off === 0), 'a goal roar plays');
  const exp = ramps.find((r) => r[0] === 'exp');
  assert.ok(exp && exp[1] < 0.5, 'the roar starts low and builds (exponential rise)');
  assert.ok(ramps.some((r) => r[0] === 'lin' && r[1] > 0.9), 'and reaches its peak');
  assert.ok(ramps.some((r) => r[0] === 'lin' && r[1] < 0.01), 'and fades out on its own');
  // Rocket League closed: the crowd fades out and the loops stop
  ramps.length = 0;
  live({ lang: 'en', event: 'idle', lines: [] });
  assert.ok(ramps.some((r) => r[0] === 'lin' && r[1] === 0), 'crowd fades to silence when the match is left');
});

(async () => {
  for (const [name, fn] of queue) { await fn(); passed++; console.log('  ✔ ' + name); }
  console.log(`\n${passed} checks passed.`);
})().catch((e) => { console.error(e); process.exit(1); });
