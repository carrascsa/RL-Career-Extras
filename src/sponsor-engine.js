'use strict';
// Sponsors with objectives: a brand pays an upfront fee and a bonus if you hit a target before a deadline.
// Up to two active deals; offers arrive every few weeks and expire if you don't answer.
const U = require('./util');
const Perks = require('./perks');

const ID = 'sponsor';
const LINK = 'xtclublife';
const MAX_ACTIVE = 2;
const OFFER_DAYS = 6;
const BRANDS = ['Voltcore Energy', 'Nimbus Headsets', 'Kestrel Chairs', 'Orbix Mobile', 'Pulse Peripherals', 'Driftwave Apparel', 'Lumen Monitors', 'Ferro Motors', 'Quasar Snacks', 'Halo Bank', 'Tidal VPN', 'Arcadia Airlines'];
const KINDS = ['series', 'streak', 'title', 'circuit', 'followers'];

function ensure(state) {
  const x = U.xstate(state);
  let s = x.sponsor;
  if (!s || typeof s !== 'object') s = x.sponsor = { offer: null, active: [], log: [], next: '' };
  if (!Array.isArray(s.active)) s.active = [];
  if (!Array.isArray(s.log)) s.log = [];
  return s;
}

const es = (ctx) => ctx && ctx.lang === 'es';
const econ = (state) => (state.economy === 'real' || state.real ? 1 : 40);
function hofClub(state) { return state.hof && state.hof.clubs && state.hof.clubs[String(state.userTeamId)]; }

function measure(state, kind) {
  const c = hofClub(state);
  const team = U.userTeam(state);
  if (kind === 'series') return c ? U.num(c.series && c.series.w) : 0;
  if (kind === 'streak') return c && c.streak ? U.num(c.streak.cur) : 0;
  if (kind === 'title') return c ? (c.titles || []).length : 0;
  if (kind === 'circuit') { const ci = U.xstate(state).circuit; return ci ? (ci.trophies || []).length : 0; }
  if (kind === 'followers') return U.num(team && team.followers);
  return 0;
}

function progress(state, d) {
  const now = measure(state, d.kind);
  if (d.kind === 'streak') { if (now < d.base) d.base = 0; return now - d.base; } // series in a row from the day you sign
  if (d.kind === 'followers') return d.base ? Math.round((now / d.base - 1) * 1000) / 10 : 0;
  return now - d.base;
}

function makeOffer(state, r) {
  const team = U.userTeam(state);
  const f = U.num(team && team.followers);
  const lvl = (() => {
    const ids = team && Array.isArray(team.lineup) ? team.lineup : [];
    const ps = ids.map((id) => U.playerOf(state, id)).filter(Boolean);
    return ps.length ? ps.reduce((s, p) => s + U.num(p.rating), 0) / ps.length : 70;
  })();
  const kind = r.pick(KINDS);
  let target; let days;
  if (kind === 'series') { target = lvl >= 85 ? r.int(5, 7) : lvl >= 75 ? r.int(4, 6) : r.int(3, 4); days = 50; }
  else if (kind === 'streak') { target = lvl >= 85 ? r.int(4, 5) : r.int(2, 3); days = 60; }
  else if (kind === 'title') { target = 1; days = 90; }
  else if (kind === 'circuit') { target = 1; days = 60; }
  else { target = r.pick([2, 3, 4]); days = 60; }
  const base = Math.round(((2000 + f * 0.12) * econ(state)) / 100) * 100;
  const hard = { series: 1, streak: 1.3, title: lvl >= 85 ? 1.2 : 2, circuit: 1, followers: 1.1 }[kind];
  return { id: 's' + Date.parse(state.currentDate + 'T00:00:00Z') / 86400000 + r.int(0, 999), brand: r.pick(BRANDS), kind, target, days, upfront: base, bonus: Math.round((base * 1.5 * hard) / 100) * 100, offered: state.currentDate };
}

function dayStep(state, day, ctx) {
  const S = ensure(state);
  // offers
  if (S.offer && U.daysBetween(S.offer.offered, day) > OFFER_DAYS) {
    S.log.unshift({ brand: S.offer.brand, kind: S.offer.kind, target: S.offer.target, result: 'expired', date: day });
    S.offer = null;
  }
  if (!S.offer && S.active.length < MAX_ACTIVE && (!S.next || day >= S.next)) {
    const r = U.dayRng(state, ID, day, 'offer');
    if (r.chance(0.05)) {
      S.offer = makeOffer(state, r);
      S.offer.offered = day;
      S.next = U.addDays(day, 14);
      U.pushInbox(state, es(ctx) ? `${S.offer.brand} quiere patrocinarlos` : `${S.offer.brand} want to sponsor you`,
        es(ctx) ? `Pagan ${U.fmtMoney(S.offer.upfront)} ya y ${U.fmtMoney(S.offer.bonus)} más si cumplís el objetivo. Respondé en Club Life.` : `${U.fmtMoney(S.offer.upfront)} now and ${U.fmtMoney(S.offer.bonus)} more if you hit their target. Answer in Club Life.`, LINK);
    }
  }
}

function tickActive(state, ctx) {
  const S = ensure(state);
  for (const d of S.active.slice()) {
    const prog = progress(state, d);
    const done = prog >= d.target;
    const late = U.daysBetween(d.accepted, state.currentDate) > d.days;
    if (!done && !late) continue;
    S.active.splice(S.active.indexOf(d), 1);
    if (done) {
      // media trainer: a bigger cut of every sponsor bonus
      const extra = Math.round(d.bonus * Perks.perk(state, 'media', 'sponsorBonus'));
      U.earn(state, d.bonus + extra);
      if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'sponsor', amount: d.bonus + extra, note: d.brand + ' bonus' + (extra ? ' (+media trainer)' : '') });
    }
    S.log.unshift({ brand: d.brand, kind: d.kind, target: d.target, result: done ? 'success' : 'failed', bonus: done ? d.bonus : 0, date: state.currentDate });
    U.pushInbox(state, done ? (es(ctx) ? `${d.brand}: objetivo cumplido` : `${d.brand}: target met`) : (es(ctx) ? `${d.brand}: objetivo vencido` : `${d.brand}: target missed`),
      done ? (es(ctx) ? `Cobraste el bonus de ${U.fmtMoney(d.bonus)}.` : `You collected the ${U.fmtMoney(d.bonus)} bonus.`) : (es(ctx) ? 'Se terminó el plazo sin cumplirlo. El sponsor no paga el bonus.' : 'The deadline passed. No bonus this time.'), LINK);
  }
  if (S.log.length > 15) S.log.length = 15;
}

function init(state) { ensure(state); }
function onDay(state, day, ctx) { if (ctx.manager) dayStep(state, day, ctx); }
function onTick(state, ctx) { tickActive(state, ctx); }

function command(state, cmd, ctx) {
  if (!ctx.manager) return { ok: false, error: 'Only available in manager careers.' };
  const S = ensure(state);
  if (cmd.op !== 'answer') return { ok: false, error: 'Unknown sponsor command.' };
  const o = S.offer;
  if (!o || o.id !== cmd.id) return { ok: false, error: 'That offer is gone.' };
  S.offer = null;
  if (!cmd.accept) { S.log.unshift({ brand: o.brand, kind: o.kind, target: o.target, result: 'declined', date: state.currentDate }); return { ok: true }; }
  if (S.active.length >= MAX_ACTIVE) return { ok: false, error: `You already have ${MAX_ACTIVE} sponsor deals.` };
  const d = Object.assign({}, o, { accepted: state.currentDate, base: measure(state, o.kind) });
  S.active.push(d);
  U.earn(state, o.upfront);
  if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'sponsor', amount: o.upfront, note: o.brand });
  return { ok: true };
}

function snapshot(state, ctx) {
  const S = ensure(state);
  return {
    enabled: ctx.manager,
    offer: S.offer ? Object.assign({}, S.offer, { expiresIn: Math.max(0, OFFER_DAYS - U.daysBetween(S.offer.offered, state.currentDate)) }) : null,
    active: S.active.map((d) => ({ brand: d.brand, kind: d.kind, target: d.target, bonus: d.bonus, progress: progress(state, d), daysLeft: Math.max(0, d.days - U.daysBetween(d.accepted, state.currentDate)) })),
    log: S.log.slice(0, 6), max: MAX_ACTIVE,
  };
}

module.exports = { id: ID, init, onDay, onTick, command, snapshot, _test: { makeOffer, progress, measure, ensure } };
