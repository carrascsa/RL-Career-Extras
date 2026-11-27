'use strict';
// Player editor: rename / photo / PlayStyle on a running career, checked against RL Career Hub's own bot chooser
// (setup/player-bots.js extracted from app.asar). Works on an in-memory copy of a save; images go to a temp folder.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { loadEngine, hubDir } = require('./engine-loader');
const core = require('../src/core');

const engine = loadEngine();
const pb = require(path.join(hubDir(), 'setup', 'player-bots'));
const saveDir = path.join(process.env.APPDATA || '', 'rl-career-hub', 'saves');
const file = process.argv[2] || path.join(saveDir, fs.readdirSync(saveDir).find((f) => f.endsWith('.json')));
const st = JSON.parse(fs.readFileSync(file, 'utf8')).state;
delete st.xtra; delete st.hof;
const ctx = core.makeCtx(engine, { lang: 'en' });
ctx.playerBots = pb;
ctx.customArtDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xt-editor-'));
ctx.readOfficialPhoto = () => Buffer.from('official photo bytes');
core.tick(st, ctx);
const C = (c) => core.command(st, Object.assign({ m: 'editor' }, c), ctx);

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✔ ' + name); };

const real = st.players.find((p) => p && !p.custom && !p.retired && pb.assignedBotFor(p) && st.players.filter((q) => q.name === p.name).length === 1 && p.teamId >= 0);
const before = { name: real.name, bot: pb.assignedBotFor(real), rating: real.rating, titles: JSON.stringify(real.titles || []) };

ok('list: your team by default, with each player\'s bot and PlayStyle', () => {
  const L = C({ op: 'list' });
  assert.ok(L.ok && L.rows.length && L.rows.every((r) => r.teamId === st.userTeamId));
  assert.ok(Object.keys(L.styles).length === 6, JSON.stringify(L.styles));
  assert.ok(L.bots.length >= 8);
  const q = C({ op: 'list', q: real.name.slice(0, 3) });
  assert.ok(q.rows.some((r) => r.id === real.id), 'search finds the player');
});

ok('rename a real player: keeps his bot and his photo, and nothing else changes', () => {
  const r = C({ op: 'rename', id: real.id, name: 'Renamed Test' });
  assert.ok(r.ok, r.error);
  assert.strictEqual(real.name, 'Renamed Test');
  assert.strictEqual(pb.assignedBotFor(real), before.bot, 'same bot after the rename');
  assert.ok(real.customPhoto && fs.existsSync(path.join(ctx.customArtDir, real.customPhoto + '.png')), 'official photo copied');
  assert.strictEqual(real.rating, before.rating);
  assert.strictEqual(JSON.stringify(real.titles || []), before.titles);
});

ok('names: too short, too long or taken are refused', () => {
  const other = st.players.find((p) => p && p !== real && !p.retired);
  assert.strictEqual(C({ op: 'rename', id: real.id, name: 'x' }).ok, false);
  assert.strictEqual(C({ op: 'rename', id: real.id, name: 'x'.repeat(30) }).ok, false);
  assert.strictEqual(C({ op: 'rename', id: real.id, name: other.name }).ok, false);
});

ok('PlayStyle: the Hub then picks the chosen bot for real matches', () => {
  const target = ['rain', 'chronos', 'fury'].find((b) => b !== before.bot);
  const r = C({ op: 'style', id: real.id, bot: target });
  assert.ok(r.ok, r.error);
  assert.strictEqual(pb.assignedBotFor(real), target);
  assert.strictEqual(C({ op: 'style', id: real.id, bot: 'not-a-bot' }).ok, false);
});

ok('photo: PNG saved in custom-art, bad data refused', () => {
  const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
  const r = C({ op: 'photo', id: real.id, data: png });
  assert.ok(r.ok, r.error);
  assert.ok(fs.existsSync(path.join(ctx.customArtDir, r.photo + '.png')));
  assert.strictEqual(C({ op: 'photo', id: real.id, data: 'data:text/plain;base64,aGk=' }).ok, false);
  const g = C({ op: 'get', id: real.id });
  assert.ok(g.player.photoUrl && g.player.photoUrl.startsWith('data:image/png;base64,'));
});

ok('restore: name, bot and photo back to the original', () => {
  assert.ok(C({ op: 'reset', id: real.id }).ok);
  assert.strictEqual(real.name, before.name);
  assert.strictEqual(pb.assignedBotFor(real), before.bot);
  assert.ok(!real.custom && real.bot === undefined && real.customPhoto === undefined);
});

ok('a custom player (already custom) keeps being custom after a restore', () => {
  const p = st.players.find((x) => x && !x.retired && x !== real);
  p.custom = true; p.bot = 'dice';
  C({ op: 'style', id: p.id, bot: 'ducky' });
  assert.strictEqual(pb.assignedBotFor(p), 'ducky');
  C({ op: 'reset', id: p.id });
  assert.ok(p.custom === true && p.bot === 'dice');
});

ok('switched off in the mod manager: commands refused', () => {
  st.xtra.mods = { off: { editor: true } };
  assert.strictEqual(C({ op: 'list' }).ok, false);
  delete st.xtra.mods;
});

console.log(`\n${passed} checks passed.`);
