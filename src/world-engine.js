'use strict';
// World tour: Majors and the World Championship move to a different host city every season.
// Only renames events that have not started yet. Seasons with official poster art keep it unless
// the user turns on "rotate everywhere" (then the poster is dropped so name and art never disagree).
const U = require('./util');

const ID = 'world';

// [city, country, region]
const CITIES = [
  ['Buenos Aires', 'Argentina', 'sam'], ['São Paulo', 'Brazil', 'sam'], ['Rio de Janeiro', 'Brazil', 'sam'], ['Santiago', 'Chile', 'sam'], ['Bogotá', 'Colombia', 'sam'], ['Lima', 'Peru', 'sam'], ['Montevideo', 'Uruguay', 'sam'],
  ['Mexico City', 'Mexico', 'na'], ['Los Angeles', 'USA', 'na'], ['New York', 'USA', 'na'], ['Las Vegas', 'USA', 'na'], ['Chicago', 'USA', 'na'], ['Atlanta', 'USA', 'na'], ['Seattle', 'USA', 'na'], ['Toronto', 'Canada', 'na'], ['Montréal', 'Canada', 'na'], ['Dallas', 'USA', 'na'], ['Orlando', 'USA', 'na'],
  ['Madrid', 'Spain', 'eu'], ['Barcelona', 'Spain', 'eu'], ['Berlin', 'Germany', 'eu'], ['Cologne', 'Germany', 'eu'], ['Amsterdam', 'Netherlands', 'eu'], ['Rotterdam', 'Netherlands', 'eu'], ['Stockholm', 'Sweden', 'eu'], ['Katowice', 'Poland', 'eu'], ['Lisbon', 'Portugal', 'eu'], ['Milan', 'Italy', 'eu'], ['Rome', 'Italy', 'eu'], ['Vienna', 'Austria', 'eu'], ['Prague', 'Czechia', 'eu'], ['Oslo', 'Norway', 'eu'], ['Helsinki', 'Finland', 'eu'], ['Manchester', 'England', 'eu'], ['Dublin', 'Ireland', 'eu'], ['Brussels', 'Belgium', 'eu'], ['Marseille', 'France', 'eu'], ['Istanbul', 'Türkiye', 'eu'],
  ['Riyadh', 'Saudi Arabia', 'mena'], ['Dubai', 'UAE', 'mena'], ['Abu Dhabi', 'UAE', 'mena'], ['Doha', 'Qatar', 'mena'], ['Cairo', 'Egypt', 'mena'],
  ['Tokyo', 'Japan', 'apac'], ['Osaka', 'Japan', 'apac'], ['Seoul', 'South Korea', 'apac'], ['Singapore', 'Singapore', 'apac'], ['Shanghai', 'China', 'apac'], ['Bangkok', 'Thailand', 'apac'], ['Jakarta', 'Indonesia', 'apac'], ['Manila', 'Philippines', 'apac'],
  ['Sydney', 'Australia', 'oce'], ['Melbourne', 'Australia', 'oce'], ['Auckland', 'New Zealand', 'oce'],
  ['Johannesburg', 'South Africa', 'ssa'], ['Cape Town', 'South Africa', 'ssa'], ['Lagos', 'Nigeria', 'ssa'], ['Nairobi', 'Kenya', 'ssa'],
];
const WORLDS_CITIES = ['Tokyo', 'Los Angeles', 'Riyadh', 'London', 'Paris', 'Seoul', 'São Paulo', 'Sydney', 'Berlin', 'Mexico City', 'Las Vegas', 'Madrid', 'Singapore', 'Dubai', 'Stockholm', 'Toronto', 'Buenos Aires', 'Copenhagen'];
const RECENT_SEASONS = 4;

function ensure(state) {
  const x = U.xstate(state);
  let w = x.world;
  if (!w || typeof w !== 'object') w = x.world = { enabled: true, everywhere: false, hosts: {}, recent: [] };
  if (!w.hosts || typeof w.hosts !== 'object') w.hosts = {};
  if (!Array.isArray(w.recent)) w.recent = [];
  if (typeof w.enabled !== 'boolean') w.enabled = true;
  return w;
}

function cityInfo(name) {
  const c = CITIES.find((x) => x[0] === name);
  return c ? { city: c[0], country: c[1], region: c[2] } : { city: name, country: '', region: '' };
}

function nameFor(kind, city, ctx) {
  const es = ctx && ctx.lang === 'es';
  if (kind === 'worlds') return es ? `Mundial de ${city}` : `${city} World Championship`;
  return es ? `Major de ${city}` : `${city} Major`;
}

function isOriginalName(ev) {
  const n = String(ev.name || '');
  if (ev.kind === 'worlds') return /World Championship|Mundial/i.test(n);
  return /Major/i.test(n);
}

// Pick hosts for this season's not-yet-started Majors / Worlds.
function assign(state, ctx) {
  const w = ensure(state);
  if (!w.enabled) return [];
  const season = String(state.season);
  const done = w.hosts[season] || (w.hosts[season] = {});
  const r = U.rng(U.careerKey(state) + '|world|' + season);
  const recent = new Set(w.recent.slice(0, RECENT_SEASONS * 3));
  const usedNow = new Set(Object.values(done));
  const changed = [];
  const evs = (state.events || []).filter((e) => e && (e.kind === 'major' || e.kind === 'worlds'));
  let lastRegion = null;
  for (const ev of evs.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))) {
    if (done[ev.id]) { lastRegion = cityInfo(done[ev.id]).region; continue; }
    if (!(String(ev.startDate) > String(state.currentDate))) continue; // started or finished: leave it
    if (ev.visual && ev.visual.poster && !w.everywhere) continue; // official art season
    if (!isOriginalName(ev)) continue;
    let pool;
    if (ev.kind === 'worlds') pool = WORLDS_CITIES.filter((c) => !recent.has(c) && !usedNow.has(c));
    else pool = CITIES.map((c) => c[0]).filter((c) => !recent.has(c) && !usedNow.has(c) && cityInfo(c).region !== lastRegion);
    if (!pool.length) pool = (ev.kind === 'worlds' ? WORLDS_CITIES : CITIES.map((c) => c[0])).filter((c) => !usedNow.has(c));
    const city = r.pick(pool);
    done[ev.id] = city;
    usedNow.add(city);
    lastRegion = cityInfo(city).region;
    ev.name = nameFor(ev.kind, city, ctx);
    if (ev.visual && ev.visual.poster) ev.visual = null; // only reached with "everywhere" on
    w.recent.unshift(city);
    changed.push({ id: ev.id, kind: ev.kind, city });
  }
  if (w.recent.length > 30) w.recent.length = 30;
  return changed;
}

function init(state, ctx) { assign(state, ctx); }
function onSeason(state, ctx) { assign(state, ctx); }
function onTick(state, ctx) {
  // startNextSeason builds the new plan before our onSeason runs on some paths; this keeps it idempotent.
  const w = ensure(state);
  if (w.enabled && !w.hosts[String(state.season)]) assign(state, ctx);
}

function command(state, cmd, ctx) {
  const w = ensure(state);
  if (cmd.op === 'toggle') {
    w.enabled = !!cmd.value;
    if (w.enabled) assign(state, ctx);
    return { ok: true };
  }
  if (cmd.op === 'everywhere') {
    w.everywhere = !!cmd.value;
    if (w.everywhere) { const n = assign(state, ctx); return { ok: true, changed: n.length }; }
    return { ok: true };
  }
  return { ok: false, error: 'Unknown world command.' };
}

function snapshot(state) {
  const w = ensure(state);
  const evs = (state.events || []).filter((e) => e && (e.kind === 'major' || e.kind === 'worlds'));
  const history = [];
  for (const [season, map] of Object.entries(w.hosts)) {
    for (const [id, city] of Object.entries(map)) history.push({ season: Number(season), id: Number(id), city, country: cityInfo(city).country });
  }
  history.sort((a, b) => b.season - a.season || a.id - b.id);
  return {
    enabled: w.enabled,
    everywhere: !!w.everywhere,
    current: evs.map((e) => ({ id: e.id, kind: e.kind, name: e.name, start: e.startDate, done: e.stage === 'done', rotated: !!(w.hosts[String(state.season)] || {})[e.id], official: !!(e.visual && e.visual.poster) })),
    history: history.slice(0, 24),
    poolSize: CITIES.length,
  };
}

module.exports = { id: ID, CITIES, WORLDS_CITIES, init, onSeason, onTick, command, snapshot, _test: { assign, ensure } };
