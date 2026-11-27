'use strict';
// RL Career Extras as RLC Hub Addon Manager addons: runs src/hubplus/lib-main.js against a stand-in for the
// Addon Manager's `hub` object (as its ADDONS.md describes it) on in-memory copies of real saves.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { loadEngine } = require('./engine-loader');
const { LIB, FEATURES, BY_GATE } = require('../src/hubplus/features');

const engine = loadEngine();
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, fs.readdirSync(saveDir).find((f) => f.endsWith('.json')));
const raw = fs.readFileSync(file, 'utf8');

// ---------- a stand-in for RLC Hub Addon Manager ----------
const actions = {}; const snaps = []; const logs = [];
let loaded = null;
const has = (state, id) => !!(state && state.hubPlus && state.hubPlus.on.includes(id));
const hub = {
  engine, dir: path.join(__dirname, '..'), manifest: {}, gameVersion: '0.2.0-beta.33',
  electron: { app: { getPath: () => path.join(process.env.APPDATA || '', 'rl-career-hub'), on() {} }, BrowserWindow: { getAllWindows: () => [] } },
  data(state) { state.hubPlusData = state.hubPlusData || {}; return state.hubPlusData[LIB] || (state.hubPlusData[LIB] = {}); },
  has, isOn: (state) => has(state, LIB), state: () => loaded, save() {}, log: (m) => logs.push(m),
  action(name, fn) { actions[name] = fn; }, onSnapshot(fn) { snaps.push(fn); },
};
// what the manager does for the window: a snapshot, and actions only for saves with the addon
const snapshot = (state) => { const s = { career: state }; if (hub.isOn(state)) for (const f of snaps) f(s, state); return s; };
const call = (name, payload, state) => { if (!hub.isOn(state)) return { ok: false, error: 'refused' }; const r = actions[name](payload, state); return { ok: true, result: r }; };
const careerWith = (ids, mutate) => {
  const s = JSON.parse(raw).state;
  delete s.xtra; delete s.hof;
  if (mutate) mutate(s);
  s.hubPlus = { on: [LIB, ...ids] };
  loaded = s;
  return s;
};

require('../src/hubplus/lib-main')(hub);

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };

ok('the library loads, registers its actions and the snapshot hook', () => {
  for (const a of ['cmd', 'hof', 'voiceManifest', 'voiceFile']) assert.strictEqual(typeof actions[a], 'function', a);
  assert.strictEqual(snaps.length, 1);
  assert.ok(logs.some((l) => /library ready/.test(l)), logs.join('\n'));
});

ok('features follow the addons picked for the save', () => {
  const s = careerWith([BY_GATE.academy, BY_GATE.staff, BY_GATE.hof]);
  const x = snapshot(s).xtra;
  const on = Object.fromEntries(x.mods.map((m) => [m.id, m.on]));
  assert.ok(x.managed);
  assert.strictEqual(on.academy, true);
  assert.strictEqual(on.staff, true);
  assert.strictEqual(on.drama, false);
  assert.strictEqual(on.circuit, false);
  assert.ok(x.academy && x.staff && x.drama === null);
  assert.ok(snapshot(s).hof, 'Hall of Fame picked: shown');
  const t = careerWith([BY_GATE.academy]);
  assert.strictEqual(snapshot(t).hof, null, 'Hall of Fame not picked: hidden');
});

ok('data lives in state.hubPlusData["rlce-lib"] only, and survives a save/load', () => {
  const s = careerWith([BY_GATE.staff]);
  snapshot(s);
  const r = call('cmd', { m: 'staff', op: 'hire', role: 'mental', tier: 'mid' }, s);
  assert.ok(r.ok && r.result.ok, JSON.stringify(r));
  const json = JSON.parse(JSON.stringify(s));
  assert.ok(!('xtra' in json) && !('hof' in json), 'nothing of ours at the top of the save');
  assert.ok(json.hubPlusData[LIB].xtra.staff.members.length === 1, 'staff saved in our box');
  loaded = json;
  const again = snapshot(json).xtra;
  assert.strictEqual(again.staff.roles.find((x) => x.role === 'mental').member.tier, 'mid', 'reloaded save keeps it');
});

ok('commands for a feature that was not picked are refused', () => {
  const s = careerWith([BY_GATE.academy]);
  snapshot(s);
  const r = call('cmd', { m: 'staff', op: 'hire', role: 'mental', tier: 'mid' }, s);
  assert.ok(r.ok && r.result.ok === false && /off/.test(r.result.error), JSON.stringify(r.result));
  const none = { hubPlus: { on: [] } };
  assert.strictEqual(call('cmd', { m: 'staff', op: 'hire' }, none).ok, false, 'a save without our addons: refused by the manager');
});

ok('read-only commands ask the manager not to save', () => {
  const s = careerWith([BY_GATE.editor]);
  snapshot(s);
  const r = call('cmd', { m: 'editor', op: 'list' }, s);
  assert.ok(r.result.ok && r.result.save === false && r.result.rows.length);
});

ok('a save from the standalone RL Career Extras is moved into the box once', () => {
  const s = careerWith([BY_GATE.staff], (st) => { st.xtra = { staff: { members: [{ role: 'engineer', tier: 'best', wage: 1 }], nextId: 2, log: [] } }; st.hof = { schema: 1 }; });
  const x = snapshot(s).xtra;
  assert.strictEqual(x.staff.roles.find((r) => r.role === 'engineer').member.tier, 'best');
  const json = JSON.parse(JSON.stringify(s));
  assert.ok(!('xtra' in json));
  assert.ok(json.hubPlusData[LIB].xtra.staff && json.hubPlusData[LIB].hof);
});

ok('voices are served from the Live caster addon', () => {
  const s = careerWith([BY_GATE.live, BY_GATE.caster]);
  const m = call('voiceManifest', {}, s).result;
  assert.ok(m.save === false && m.manifest && m.manifest.files.length > 10);
  const f = call('voiceFile', { file: m.manifest.files[0] }, s).result;
  assert.ok(f.data && f.data.length > 1000);
  assert.strictEqual(call('voiceFile', { file: '../../secret' }, s).result.data, null, 'no paths outside the voice folder');
});

ok('every feature addon has a gate our code knows', () => {
  const known = new Set([...require('../src/core').MODULES.map((m) => m.id), 'hof', 'live', 'broadcast']);
  for (const f of FEATURES) assert.ok(known.has(f.gate), f.id + ' -> ' + f.gate);
  assert.strictEqual(new Set(FEATURES.map((f) => f.id)).size, FEATURES.length);
  for (const f of FEATURES) assert.ok(/^[a-z0-9-]{2,48}$/.test(f.id));
});

console.log(`\n${passed} checks passed.`);
