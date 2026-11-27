'use strict';
// Travel to Majors / Worlds: jet lag by time-zone distance, optional bootcamp in the host city,
// home-crowd boost, and the odd visa problem that you can fix by paying for an express visa.
const U = require('./util');

const ID = 'travel';
const LINK = 'xtcircuit';
const PLAN_DAYS = 21; // trips show up this many days before the start
const VISA_DAYS = 10; // visa trouble can appear this many days before
const VISA_CHANCE = 0.12;
const COST = { bootcamp: 12000, visa: 2500 };
const TZ = { sam: -3, na: -6, eu: 1, mena: 3, ssa: 2, apac: 8, oce: 10 };
const EXTRA_HOSTS = {
  Boston: 'na', Paris: 'eu', 'Fort Worth': 'na', Birmingham: 'eu', Raleigh: 'na', Copenhagen: 'eu', London: 'eu', 'Lyon-Décines': 'eu', Lyon: 'eu',
};

function ensure(state) {
  const x = U.xstate(state);
  let t = x.travel;
  if (!t || typeof t !== 'object') t = x.travel = { trips: {}, log: [] };
  if (!t.trips || typeof t.trips !== 'object') t.trips = {};
  if (!Array.isArray(t.log)) t.log = [];
  return t;
}

const es = (ctx) => ctx && ctx.lang === 'es';
const econ = (state) => (state.economy === 'real' || state.real ? 1 : 40);

function regionOfCity(city) {
  if (!city) return null;
  const w = require('./world-engine');
  const c = w.CITIES.find((x) => x[0] === city);
  return c ? c[2] : EXTRA_HOSTS[city] || null;
}

function hostOf(state, ev) {
  const w = U.xstate(state).world;
  const rot = w && w.hosts && w.hosts[String(state.season)] && w.hosts[String(state.season)][ev.id];
  if (rot) return rot;
  if (ev.visual && ev.visual.host) return ev.visual.host;
  const n = String(ev.name || '');
  let m = /^(.+?) (Major|World Championship)$/.exec(n) || /^(?:Major|Mundial) de (.+)$/.exec(n);
  if (m) return m[1];
  if (ev.kind === 'worlds') return 'Fort Worth';
  return null;
}

function jetLag(from, to) {
  if (!from || !to || TZ[from] == null || TZ[to] == null) return 0;
  let d = Math.abs(TZ[from] - TZ[to]);
  d = Math.min(d, 24 - d);
  return d >= 7 ? 2 : d >= 4 ? 1 : 0;
}

function trips(state) {
  return (state.events || []).filter((e) => e && (e.kind === 'major' || e.kind === 'worlds') && e.startDate && e.stage !== 'done');
}

function teamIn(state, ev) { return Array.isArray(ev.field) && ev.field.includes(state.userTeamId); }

function applyForm(state, trip, key, pids, delta) {
  trip.applied = trip.applied || {};
  const a = trip.applied[key] = trip.applied[key] || {};
  for (const pid of pids) {
    const p = U.playerOf(state, pid);
    if (!p) continue;
    const before = U.num(p.form);
    p.form = U.clamp(before + delta, -5, 5);
    a[pid] = U.num(a[pid]) + (p.form - before);
  }
}
function revertForm(state, trip, key) {
  const a = trip.applied && trip.applied[key];
  if (!a) return;
  for (const [pid, d] of Object.entries(a)) {
    const p = U.playerOf(state, Number(pid));
    if (p) p.form = U.clamp(U.num(p.form) - d, -5, 5);
  }
  delete trip.applied[key];
}

function starters(state) {
  const t = U.userTeam(state);
  return (t && Array.isArray(t.lineup) ? t.lineup : []).filter((id) => { const p = U.playerOf(state, id); return p && !p.isUser; });
}

function dayStep(state, day, ctx) {
  const T = ensure(state);
  const team = U.userTeam(state);
  const home = team && team.region;
  for (const ev of trips(state)) {
    const toStart = U.daysBetween(day, ev.startDate);
    if (toStart > PLAN_DAYS) continue;
    let trip = T.trips[ev.id];
    if (!trip) {
      const city = hostOf(state, ev);
      const region = regionOfCity(city);
      trip = T.trips[ev.id] = { id: ev.id, season: U.num(state.season), name: ev.name, city, region, plan: 'standard', status: 'planning', jet: region === home ? 0 : jetLag(home, region), home: !!region && region === home, visa: null };
    }
    // visa trouble for away trips, rolled once
    if (trip.status === 'planning' && !trip.visaRolled && toStart <= VISA_DAYS) {
      if (toStart < 3) { trip.visaRolled = true; continue; } // found too late: no time for visa drama
      trip.visaRolled = true;
      const r = U.dayRng(state, ID, day, 'visa' + ev.id);
      const pool = U.rosterPlayers(state).filter((p) => !p.isUser && !p.absence);
      if (!trip.home && pool.length && r.chance(VISA_CHANCE)) {
        const p = r.pick(pool);
        trip.visa = { pid: p.id, name: p.name, status: 'pending' };
        U.pushInbox(state, es(ctx) ? `Problema de visa: ${p.name}` : `Visa problem: ${p.name}`,
          es(ctx) ? `La visa de ${p.name} para viajar a ${trip.city} está trabada. Si no pagás el trámite exprés, se pierde el ${ev.name}. Resolvelo en Circuit → Gira mundial.` : `${p.name}'s visa for ${trip.city} is stuck. Without the express service he misses the ${ev.name}. Sort it out in Circuit → World tour.`, LINK);
      }
    }
    if (trip.status === 'planning' && toStart <= 0) {
      // the Hub fills the field when the event opens; give it a day before deciding we did not qualify
      if (!teamIn(state, ev)) { if (toStart <= -2) trip.status = 'not-qualified'; continue; }
      trip.status = 'there';
      const st = starters(state);
      if (trip.plan === 'bootcamp') {
        const pay = U.spend(state, COST.bootcamp * econ(state));
        if (pay.ok) {
          trip.paid = COST.bootcamp * econ(state);
          applyForm(state, trip, 'camp', st, 1);
          for (const p of U.rosterPlayers(state)) if (!p.isUser) U.moraleDelta(ctx.engine, p, 3);
        } else trip.plan = 'standard';
      }
      if (trip.plan !== 'bootcamp' && trip.jet) applyForm(state, trip, 'jet', st, -trip.jet);
      if (trip.home) for (const p of U.rosterPlayers(state)) if (!p.isUser) U.moraleDelta(ctx.engine, p, 4);
      if (trip.visa && trip.visa.status === 'pending') {
        const p = U.playerOf(state, trip.visa.pid);
        if (p && !p.absence) {
          const until = U.addDays(ev.endDate || ev.startDate, 1);
          p.absence = { reason: es(ctx) ? `problemas con la visa para viajar a ${trip.city}` : `visa problems for the trip to ${trip.city}`, cat: 'setup', since: day, until, days: U.daysBetween(day, until) };
        }
        trip.visa.status = 'missed';
      }
      T.log.unshift({ season: trip.season, name: ev.name, city: trip.city, plan: trip.plan, jet: trip.plan === 'bootcamp' ? 0 : trip.jet, home: trip.home, visa: trip.visa ? trip.visa.status : null });
      if (T.log.length > 20) T.log.length = 20;
    }
    if (trip.status === 'there') {
      if (U.daysBetween(ev.startDate, day) >= 2) revertForm(state, trip, 'jet');
    }
  }
  // close trips whose event is over
  for (const trip of Object.values(T.trips)) {
    if (trip.status !== 'there') continue;
    const ev = (state.events || []).find((e) => e.id === trip.id);
    if (!ev || ev.stage === 'done' || U.daysBetween(ev.endDate || ev.startDate, day) >= 1) {
      revertForm(state, trip, 'jet');
      revertForm(state, trip, 'camp');
      trip.status = 'done';
    }
  }
}

function onDay(state, day, ctx) { if (ctx.manager) dayStep(state, day, ctx); }
function init(state) { ensure(state); }
function onSeason(state) {
  const T = ensure(state);
  for (const [k, trip] of Object.entries(T.trips)) {
    if (trip.applied) { revertForm(state, trip, 'jet'); revertForm(state, trip, 'camp'); }
    if (trip.season !== U.num(state.season)) delete T.trips[k];
  }
}

function command(state, cmd, ctx) {
  if (!ctx.manager) return { ok: false, error: 'Only available in manager careers.' };
  const T = ensure(state);
  const trip = T.trips[cmd.id];
  if (!trip || trip.status !== 'planning') return { ok: false, error: 'This trip can no longer be changed.' };
  if (cmd.op === 'plan') {
    if (!['standard', 'bootcamp'].includes(cmd.plan)) return { ok: false, error: 'Bad plan.' };
    trip.plan = cmd.plan;
    return { ok: true };
  }
  if (cmd.op === 'visa') {
    if (!trip.visa || trip.visa.status !== 'pending') return { ok: false, error: 'No visa problem.' };
    const pay = U.spend(state, COST.visa * econ(state));
    if (!pay.ok) return pay;
    trip.visa.status = 'fixed';
    return { ok: true };
  }
  return { ok: false, error: 'Unknown travel command.' };
}

function snapshot(state, ctx) {
  const T = ensure(state);
  const list = Object.values(T.trips).filter((t) => t.season === U.num(state.season)).map((t) => {
    const ev = (state.events || []).find((e) => e.id === t.id) || {};
    return { id: t.id, name: ev.name || t.name, city: t.city, region: t.region, start: ev.startDate, inDays: U.daysBetween(state.currentDate, ev.startDate), plan: t.plan, status: t.status, jet: t.jet, home: t.home, visa: t.visa, qualified: teamIn(state, ev) };
  }).sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return { enabled: ctx.manager, trips: list, log: T.log.slice(0, 8), cost: { bootcamp: COST.bootcamp * econ(state), visa: COST.visa * econ(state) }, home: (U.userTeam(state) || {}).region || null };
}

module.exports = { id: ID, init, onSeason, onDay, command, snapshot, _test: { hostOf, jetLag, regionOfCity, ensure } };
