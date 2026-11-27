'use strict';
// Player editor: rename players, give them a photo and pick their PlayStyle (the bot they play as in real
// matches), in a career that is already running.
//
// How RL Career Hub decides (checked against its setup/player-bots.js):
//  - real players get their bot from a list keyed by NAME, and their photo by name too; the "bot" field is ignored;
//  - custom players (custom: true) play as the bot in their "bot" field and show "customPhoto"
//    (an image in %APPDATA%\rl-career-hub\custom-art\<hash>.png, the same place the Hub keeps custom logos).
// So an edited player becomes a custom player that keeps everything else (rating, contract, titles, stats), and
// renaming a real player first pins his current bot and copies his official photo, so he keeps both.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const U = require('./util');

const ID = 'editor';
const MAX_PHOTO = 4 * 1024 * 1024;
// RL Career Hub's PlayStyle names (data/player-bots.json)
const STYLE_NAMES = { bruiser: 'Bruiser', relentless: 'Relentless', tiki_taka: 'Tiki Taka', anticipate: 'Anticipate', technical: 'Technical', trickster: 'Trickster' };

function artDir(ctx) { return ctx.customArtDir || path.join(process.env.APPDATA || '', 'rl-career-hub', 'custom-art'); }

// RL Career Hub's own bot chooser (setup/player-bots.js), loaded by the add-on in the Hub process
function bots(ctx) {
  if (ctx.playerBots) return ctx.playerBots;
  try {
    ctx.playerBots = require(path.join(process.resourcesPath || '', 'app.asar', 'setup', 'player-bots'));
  } catch {
    ctx.playerBots = null;
  }
  return ctx.playerBots;
}

function choices(ctx) {
  const pb = bots(ctx);
  if (!pb) return { pool: [], styles: {}, bots: [] };
  let c = null;
  try { c = pb.choicesFor(); } catch { c = null; }
  const names = Object.assign({}, STYLE_NAMES, ctx.playstyleNames || {});
  const list = ((c && c.choices) || []).map((x) => ({ id: x.id, name: x.name, main: x.style && x.style.main, plus: !!(x.style && x.style.plus), extra: (x.style && x.style.extra) || [] }));
  const styles = {};
  for (const b of list) if (b.main) styles[b.main] = names[b.main] || b.main.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  for (const b of list) for (const x of b.extra) if (!styles[x]) styles[x] = names[x] || x;
  return { pool: list.map((b) => b.id), styles, bots: list };
}

function currentBot(ctx, p) {
  const pb = bots(ctx);
  if (!pb) return p.custom ? p.bot || null : null;
  try { return pb.assignedBotFor(p); } catch { return p.bot || null; }
}

function ensure(state) {
  state.xtra = state.xtra || {};
  const e = state.xtra.editor || (state.xtra.editor = { edits: {} });
  e.edits = e.edits || {};
  return e;
}

// remember how the player was before the first edit, for "restore"
function remember(state, ctx, p) {
  const e = ensure(state);
  if (e.edits[p.id]) return e.edits[p.id];
  e.edits[p.id] = { name: p.name, custom: !!p.custom, bot: p.bot === undefined ? null : p.bot, customPhoto: p.customPhoto === undefined ? null : p.customPhoto, firstBot: currentBot(ctx, p) };
  return e.edits[p.id];
}

function saveImage(ctx, buf) {
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 20);
  const dir = artDir(ctx);
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, hash + '.png');
  if (!fs.existsSync(f)) fs.writeFileSync(f, buf);
  return hash;
}

// the official photo of a real player, from the Hub's bundled art (renderer/players/<file>)
function officialPhoto(ctx, p) {
  if (ctx.readOfficialPhoto) return ctx.readOfficialPhoto(p);
  try {
    const base = path.join(process.resourcesPath || '', 'app.asar', 'renderer', 'players');
    const src = JSON.parse(fs.readFileSync(path.join(base, 'sources.json'), 'utf8'));
    const key = String(p.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    const hit = src.find((x) => String(x.name).toLowerCase().replace(/[^a-z0-9]/g, '') === key);
    return hit ? fs.readFileSync(path.join(base, hit.file)) : null;
  } catch {
    return null;
  }
}

// a custom player keeps playing as `bot`; a real one becomes custom with his current bot pinned
function pin(state, ctx, p) {
  if (p.custom) return;
  const bot = currentBot(ctx, p);
  if (!p.customPhoto) {
    const img = officialPhoto(ctx, p);
    if (img) p.customPhoto = saveImage(ctx, img);
  }
  p.custom = true;
  if (bot) p.bot = bot;
}

function row(state, ctx, p, C) {
  const t = U.teamOf(state, p.teamId);
  const bot = currentBot(ctx, p);
  const b = C.bots.find((x) => x.id === bot);
  return {
    id: p.id, name: p.name, team: t ? t.name : null, teamId: p.teamId, rating: Math.round(U.num(p.rating)), age: p.age, nation: p.nation || '',
    bot, botName: b ? b.name : bot, style: b ? b.main : null, styleName: b && b.main ? C.styles[b.main] : null,
    extra: b ? b.extra.map((x) => C.styles[x] || x) : [], photo: p.customPhoto || null, edited: !!ensure(state).edits[p.id],
  };
}

function photoUrl(ctx, hash) {
  if (!hash) return null;
  try {
    const f = path.join(artDir(ctx), hash + '.png');
    return fs.existsSync(f) ? 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') : null;
  } catch {
    return null;
  }
}

const REGIONS = ['eu', 'na', 'sam', 'mena', 'oce', 'apac', 'ssa'];

// a brand-new player through the Hub's own custom-player maker: a free agent, or straight onto a team
function createPlayer(state, ctx, spec, C) {
  const es = ctx.lang === 'es';
  const eng = ctx.engine;
  if (!eng || typeof eng.makeCustomPlayer !== 'function') return { error: es ? 'Esta versión del Hub no permite crear jugadores.' : 'This Hub version cannot create players.' };
  const name = String(spec.name || '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 24) return { error: es ? 'nombre de 2 a 24 caracteres' : 'name must be 2-24 characters' };
  if (state.players.some((x) => x && !x.retired && String(x.name).toLowerCase() === name.toLowerCase())) return { error: es ? 'ya existe' : 'already exists' };
  const region = String(spec.region || '').toLowerCase();
  if (!REGIONS.includes(region)) return { error: es ? 'región inválida (EU, NA, SAM, MENA, OCE, APAC, SSA)' : 'bad region (EU, NA, SAM, MENA, OCE, APAC, SSA)' };
  const rating = U.clamp(Math.round(Number(spec.rating) || 70), 40, 99);
  const age = U.clamp(Math.round(Number(spec.age) || 20), 15, 40);
  const potential = U.clamp(Math.round(Number(spec.potential) || rating + 2), rating, 99);
  const bot = spec.bot && C.pool.includes(String(spec.bot)) ? String(spec.bot) : null;
  let teamId = spec.teamId == null || spec.teamId === '' ? -1 : Number(spec.teamId);
  const team = teamId >= 0 ? U.teamOf(state, teamId) : null;
  if (teamId >= 0 && !team) teamId = -1;
  if (team && (team.playerIds || []).length >= ((eng.ROSTER_MAX && Number(eng.ROSTER_MAX)) || 7)) return { error: es ? 'ese equipo no tiene lugar' : 'that team has no roster spot' };
  const id = state.players.reduce((m, x) => Math.max(m, U.num(x && x.id)), 0) + 1;
  const p = eng.makeCustomPlayer({ name, rating, age, potential, nation: String(spec.nation || '').trim() || null, bot }, { id, teamId, used: new Set(state.players.map((x) => x && x.name)) });
  p.home = region;
  if (teamId < 0) { p.teamId = -1; p.freeAgent = true; } else { team.playerIds = (team.playerIds || []).concat(id); }
  p.xtCreated = state.currentDate;
  state.players.push(p);
  return { p };
}

function command(state, cmd, ctx) {
  const es = ctx.lang === 'es';
  const C = choices(ctx);
  if (cmd.op === 'list') {
    const q = String(cmd.q || '').trim().toLowerCase();
    let list = state.players.filter((p) => p && !p.retired);
    if (q) list = list.filter((p) => String(p.name).toLowerCase().includes(q));
    else if (cmd.teamId != null && cmd.teamId !== '') list = list.filter((p) => p.teamId === Number(cmd.teamId));
    else list = list.filter((p) => p.teamId === state.userTeamId);
    list = list.sort((a, b) => U.num(b.rating) - U.num(a.rating)).slice(0, 60);
    const teams = state.teams.filter((t) => t && (t.playerIds || []).length).map((t) => ({ id: t.id, name: t.name })).sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, rows: list.map((p) => row(state, ctx, p, C)), teams, styles: C.styles, bots: C.bots, userTeamId: state.userTeamId };
  }
  if (cmd.op === 'create') {
    const r = createPlayer(state, ctx, cmd, C);
    return r.error ? { ok: false, error: r.error } : { ok: true, id: r.p.id, name: r.p.name };
  }
  if (cmd.op === 'import') {
    // one player per line: Name, Nation, Region, Age, Rating[, Potential][, PlayStyle bot]
    const made = []; const skipped = [];
    for (const raw of String(cmd.text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const f = line.split(/[,;\t]/).map((x) => x.trim());
      const r = createPlayer(state, ctx, { name: f[0], nation: f[1], region: f[2], age: f[3], rating: f[4], potential: f[5], bot: f[6], teamId: -1 }, C);
      if (r.error) skipped.push(`${f[0] || '?'}: ${r.error}`); else made.push(r.p.name);
    }
    return { ok: true, made, skipped };
  }
  const p = state.players.find((x) => x && x.id === Number(cmd.id));
  if (!p) return { ok: false, error: es ? 'No encuentro ese jugador.' : 'Player not found.' };
  if (cmd.op === 'get') {
    const r = row(state, ctx, p, C);
    return { ok: true, player: Object.assign(r, { photoUrl: photoUrl(ctx, p.customPhoto) }), styles: C.styles, bots: C.bots };
  }
  if (cmd.op === 'rename') {
    const name = String(cmd.name || '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 24) return { ok: false, error: es ? 'El nombre tiene que tener entre 2 y 24 caracteres.' : 'Names must be 2 to 24 characters long.' };
    if (state.players.some((x) => x && x !== p && !x.retired && String(x.name).toLowerCase() === name.toLowerCase())) return { ok: false, error: es ? 'Ya hay un jugador con ese nombre.' : 'Another player already has that name.' };
    remember(state, ctx, p);
    pin(state, ctx, p);
    const old = p.name;
    p.name = name;
    return { ok: true, old, name };
  }
  if (cmd.op === 'style') {
    const bot = String(cmd.bot || '');
    if (!C.pool.includes(bot)) return { ok: false, error: es ? 'Ese estilo no existe.' : 'Unknown PlayStyle.' };
    remember(state, ctx, p);
    pin(state, ctx, p);
    p.bot = bot;
    const b = C.bots.find((x) => x.id === bot);
    return { ok: true, bot, botName: b ? b.name : bot, styleName: b ? C.styles[b.main] : '' };
  }
  if (cmd.op === 'photo') {
    const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(cmd.data || ''));
    if (!m) return { ok: false, error: es ? 'Elegí una imagen PNG, JPG o WEBP.' : 'Pick a PNG, JPG or WEBP image.' };
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length || buf.length > MAX_PHOTO) return { ok: false, error: es ? 'La imagen es demasiado grande (máximo 4 MB).' : 'That image is too big (4 MB max).' };
    remember(state, ctx, p);
    pin(state, ctx, p);
    p.customPhoto = saveImage(ctx, buf);
    return { ok: true, photo: p.customPhoto };
  }
  if (cmd.op === 'reset') {
    const e = ensure(state);
    const orig = e.edits[p.id];
    if (!orig) return { ok: true, unchanged: true };
    p.name = orig.name;
    if (orig.custom) p.custom = true; else delete p.custom;
    if (orig.bot == null) delete p.bot; else p.bot = orig.bot;
    if (orig.customPhoto == null) delete p.customPhoto; else p.customPhoto = orig.customPhoto;
    delete e.edits[p.id];
    return { ok: true, name: p.name };
  }
  return { ok: false, error: 'Unknown editor command.' };
}

function snapshot(state) {
  const e = state.xtra && state.xtra.editor;
  return { edited: e ? Object.keys(e.edits || {}).length : 0 };
}

module.exports = { id: ID, command, snapshot, _test: { choices, currentBot } };
