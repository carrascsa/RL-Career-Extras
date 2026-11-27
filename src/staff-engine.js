'use strict';
// Backroom staff: five roles on top of the Hub's own scouts, each hired at one of three tiers (Bad / Mid / Best)
// with its own weekly wage:
//  🧠 Mental coach        softens morale drops (chats, ego clashes, results) and lifts morale every week
//  📣 Media trainer       bigger sponsor payouts (the Hub's media deals and the add-on's sponsors), faster follower growth
//  📋 Assistant coach     shorter training cooldown, stronger sessions; the Best one runs training for you
//  🛠️ Engineer            cheaper facility upgrades
//  🌱 Youth dev. coach    academy growth and intake potential, slower rating decline for veterans
// The Hub's scouts (state.staff) can also be hired or released here at Bad / Mid / Best.
const U = require('./util');
const Perks = require('./perks');

const ID = 'staff';
const { ROLES, TIERS } = Perks;
const SCOUT_WAGE = { bad: 150, mid: 300, best: 600 };
const FIRST = ['Alex', 'Sam', 'Jordan', 'Robin', 'Charlie', 'Nico', 'Mika', 'Dani', 'Kai', 'Noa', 'Lou', 'Rene', 'Ari', 'Jules', 'Teo', 'Iris', 'Marta', 'Hugo', 'Lena', 'Omar', 'Sofia', 'Ivan', 'Yara', 'Pablo'];
const LAST = ['Moreau', 'Kowalski', 'Silva', 'Novak', 'Haddad', 'Lindqvist', 'Okafor', 'Romero', 'Tanaka', 'Fischer', 'Duarte', 'Varga', 'Ahmadi', 'Costa', 'Berg', 'Laine', 'Mendez', 'Rossi', 'Petrov', 'Weber'];

function ensure(state) {
  state.xtra = state.xtra || {};
  const s = state.xtra.staff || (state.xtra.staff = { members: [], nextId: 1, log: [] });
  s.members = s.members || [];
  s.log = s.log || [];
  return s;
}
const es = (ctx) => ctx.lang === 'es';
const userPlayers = (state) => state.players.filter((p) => p && !p.retired && p.teamId === state.userTeamId);
const team = (state) => U.teamOf(state, state.userTeamId);

// candidates for each role and tier change every season
function candidate(state, role, tier) {
  const r = U.dayRng(state, ID, 'cand-' + (state.season || 1), role + tier);
  return { name: r.pick(FIRST) + ' ' + r.pick(LAST), role, tier, wage: ROLES[role].wage[TIERS.indexOf(tier)] };
}

function note(state, text) {
  const s = ensure(state);
  s.log.unshift({ date: state.currentDate, text });
  if (s.log.length > 30) s.log.length = 30;
}

function init(state) { ensure(state); }

// weekly: wages, the mental coach's lift and the media trainer's follower boost
function onDay(state, day, ctx) {
  const s = ensure(state);
  if (U.weekday(day) !== 1) return;
  const bill = s.members.reduce((t, m) => t + U.num(m.wage), 0);
  if (bill > 0) {
    U.spend(state, bill);
    if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'wages', amount: -bill, note: es(ctx) ? 'Cuerpo técnico (Career Extras)' : 'Backroom staff (Career Extras)' });
  }
  const lift = Perks.perk(state, 'mental', 'weeklyMorale');
  if (lift) for (const p of userPlayers(state)) U.moraleDelta(ctx.engine, p, lift);
  const boost = Perks.perk(state, 'media', 'followerBoost');
  const t = team(state);
  if (t) {
    const last = s.followers || {};
    if (boost && last.team != null && U.num(t.followers) > last.team) t.followers = Math.round(U.num(t.followers) + (U.num(t.followers) - last.team) * boost);
    if (boost) {
      for (const p of userPlayers(state)) {
        const was = last.p && last.p[p.id];
        if (was != null && U.num(p.followers) > was) p.followers = Math.round(U.num(p.followers) + (U.num(p.followers) - was) * boost);
      }
    }
    s.followers = { team: U.num(t.followers), p: Object.fromEntries(userPlayers(state).map((p) => [p.id, U.num(p.followers)])) };
  }
}

// daily: the Best assistant coach runs training as soon as it is available
function onTick(state, ctx) {
  if (!Perks.perk(state, 'assistant', 'autoTrain')) return;
  const eng = ctx.engine;
  if (!eng || typeof eng.trainingReady !== 'function' || typeof eng.runTraining !== 'function') return;
  try {
    if (!eng.trainingReady(state)) return;
    const slots = (state.training && state.training.slots) || [];
    if (!slots.some((x) => x && x.pid != null) && typeof eng.trainableIds === 'function' && typeof eng.setTrainingSlot === 'function') {
      // nothing planned: train the players with the most room to grow
      const ids = eng.trainableIds(state).map((id) => U.playerOf(state, id)).filter(Boolean).sort((a, b) => (U.num(b.potential) - U.num(b.rating)) - (U.num(a.potential) - U.num(a.rating))).map((p) => p.id);
      for (let i = 0; i < 5 && ids.length; i++) eng.setTrainingSlot(state, i, ids[i % ids.length], null);
    }
    const r = eng.runTraining(state);
    if (r && r.ok) {
      const s = ensure(state);
      s.autoSessions = (s.autoSessions || 0) + 1;
      note(state, es(ctx) ? 'El asistente hizo el entrenamiento de la semana.' : 'Your assistant coach ran this week\'s training.');
    }
  } catch (e) {
    ctx.log('staff auto-train: ' + e.message);
  }
}

function command(state, cmd, ctx) {
  const s = ensure(state);
  const E = es(ctx);
  if (cmd.op === 'hire') {
    const role = String(cmd.role || '');
    const tier = String(cmd.tier || '');
    if (!ROLES[role] || !TIERS.includes(tier)) return { ok: false, error: E ? 'Ese puesto no existe.' : 'Unknown role.' };
    const c = candidate(state, role, tier);
    // signing fee: two weeks of wages
    const fee = c.wage * 2;
    const pay = U.spend(state, fee);
    if (!pay.ok) return { ok: false, error: E ? 'No alcanza el presupuesto.' : 'Not enough budget.' };
    if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'wages', amount: -fee, note: (E ? 'Fichaje de ' : 'Hired ') + c.name });
    s.members = s.members.filter((m) => m.role !== role);
    s.members.push(Object.assign({ id: s.nextId++, hired: state.currentDate }, c));
    note(state, (E ? 'Contrataste a ' : 'You hired ') + c.name);
    return { ok: true, name: c.name, fee };
  }
  if (cmd.op === 'fire') {
    const m = s.members.find((x) => x.role === cmd.role);
    if (!m) return { ok: false, error: E ? 'No hay nadie en ese puesto.' : 'Nobody in that role.' };
    s.members = s.members.filter((x) => x !== m);
    note(state, (E ? 'Despediste a ' : 'You let go of ') + m.name);
    return { ok: true, name: m.name };
  }
  // the Hub's own scouts
  if (cmd.op === 'scoutHire') {
    const tier = TIERS.includes(cmd.tier) ? cmd.tier : 'mid';
    state.staff = Array.isArray(state.staff) ? state.staff : [];
    if (state.staff.filter((x) => x && x.role === 'scout').length >= 5) return { ok: false, error: E ? 'Máximo 5 scouts.' : '5 scouts at most.' };
    const c = candidate(state, 'scout' + state.staff.length, tier);
    const id = state.staff.reduce((mx, x) => Math.max(mx, U.num(x.id)), 0) + 1;
    state.staff.push({ id, role: 'scout', name: c.name, wage: SCOUT_WAGE[tier], tier });
    return { ok: true, name: c.name };
  }
  if (cmd.op === 'scoutRelease') {
    const busy = new Set(((state.scouts && state.scouts.jobs) || []).map((j) => j && (j.staffId != null ? j.staffId : j.scoutId)));
    const i = (state.staff || []).findIndex((x) => x && x.role === 'scout' && x.id === Number(cmd.id));
    if (i < 0) return { ok: false, error: E ? 'No encuentro ese scout.' : 'Scout not found.' };
    if (busy.has(state.staff[i].id)) return { ok: false, error: E ? 'Está con un informe en curso.' : 'That scout is on an assignment.' };
    const [gone] = state.staff.splice(i, 1);
    return { ok: true, name: gone.name };
  }
  return { ok: false, error: 'Unknown staff command.' };
}

// engine hooks: the effects that act on the Hub's own systems
function wrapEngine(engine, api) {
  const wrap = (name, fn) => {
    const orig = engine[name];
    if (typeof orig !== 'function' || orig.__xtStaff) return;
    const w = function (...args) { return fn.call(this, orig, ...args); };
    w.__xtStaff = true;
    engine[name] = w;
  };
  const budget = (state) => { const t = state && U.teamOf(state, state.userTeamId); return t ? U.num(t.budget) : 0; };

  // 🧠 mental coach: part of every morale drop is given back
  wrap('advance', function (orig, state, ...rest) {
    const k = Perks.perk(state, 'mental', 'moraleRefund');
    const before = k ? new Map(userPlayers(state).map((p) => [p.id, U.num(p.morale)])) : null;
    const out = orig.call(this, state, ...rest);
    try {
      if (before) for (const p of userPlayers(state)) { const was = before.get(p.id); if (was != null && U.num(p.morale) < was) p.morale = Math.min(100, U.num(p.morale) + (was - U.num(p.morale)) * k); }
    } catch (e) { api.log('staff mental: ' + e.message); }
    return out;
  });

  // 📋 assistant coach: stronger sessions and a shorter cooldown
  wrap('runTraining', function (orig, state, ...rest) {
    const boost = Perks.perk(state, 'assistant', 'trainingBoost');
    const cd = Perks.perk(state, 'assistant', 'trainingCooldown');
    const before = new Map(userPlayers(state).map((p) => [p.id, U.num(p.ratingExact != null ? p.ratingExact : p.rating)]));
    const out = orig.call(this, state, ...rest);
    try {
      if (out && out.ok) {
        if (boost) for (const p of userPlayers(state)) {
          const was = before.get(p.id);
          const now = U.num(p.ratingExact != null ? p.ratingExact : p.rating);
          if (was != null && now > was) {
            const cap = U.num(p.potential) || 99;
            p.ratingExact = Math.min(cap, now + (now - was) * boost);
            p.rating = Math.min(cap, Math.floor(p.ratingExact));
          }
        }
        if (cd && state.training && state.training.lastDate) state.training.lastDate = U.addDays(state.training.lastDate, -cd);
      }
    } catch (e) { api.log('staff training: ' + e.message); }
    return out;
  });

  // 🛠️ engineer: part of a facility upgrade is refunded
  wrap('buyFacility', function (orig, state, ...rest) {
    const k = Perks.perk(state, 'engineer', 'facilityDiscount');
    const b0 = budget(state);
    const out = orig.call(this, state, ...rest);
    try {
      const paid = b0 - budget(state);
      if (k && out && out.ok !== false && paid > 0) {
        const back = Math.round(paid * k);
        U.earn(state, back);
        if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'buy', amount: back, note: 'Engineer discount' });
      }
    } catch (e) { api.log('staff engineer: ' + e.message); }
    return out;
  });

  // 📣 media trainer: a bigger cut of the Hub's media deals
  wrap('acceptMediaOffer', function (orig, state, ...rest) {
    const k = Perks.perk(state, 'media', 'sponsorBonus');
    const b0 = budget(state);
    const out = orig.call(this, state, ...rest);
    try {
      const got = budget(state) - b0;
      if (k && out && out.ok !== false && got > 0) {
        const extra = Math.round(got * k);
        U.earn(state, extra);
        if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'sponsor', amount: extra, note: 'Media trainer bonus' });
      }
    } catch (e) { api.log('staff media: ' + e.message); }
    return out;
  });

  // 🌱 youth development coach: veterans lose less rating when they age at the season change
  wrap('startNextSeason', function (orig, state, ...rest) {
    const k = Perks.perk(state, 'youth', 'declineRefund');
    const before = k ? new Map(userPlayers(state).map((p) => [p.id, U.num(p.ratingExact != null ? p.ratingExact : p.rating)])) : null;
    const out = orig.call(this, state, ...rest);
    try {
      if (before) for (const p of userPlayers(state)) {
        const was = before.get(p.id);
        const now = U.num(p.ratingExact != null ? p.ratingExact : p.rating);
        if (was != null && now < was) { p.ratingExact = now + (was - now) * k; p.rating = Math.floor(p.ratingExact); }
      }
    } catch (e) { api.log('staff youth: ' + e.message); }
    return out;
  });
}

function snapshot(state, ctx) {
  const s = ensure(state);
  const roles = Object.keys(ROLES).map((role) => {
    const m = s.members.find((x) => x.role === role) || null;
    return { role, icon: ROLES[role].icon, member: m, perks: ROLES[role].perks, wages: ROLES[role].wage, candidates: TIERS.map((tier) => candidate(state, role, tier)) };
  });
  const scouts = (state.staff || []).filter((x) => x && x.role === 'scout').map((x) => ({ id: x.id, name: x.name, tier: x.tier || 'mid', wage: x.wage }));
  return {
    roles, scouts, scoutWage: SCOUT_WAGE, bill: s.members.reduce((t, m) => t + U.num(m.wage), 0), log: s.log.slice(0, 8), autoSessions: s.autoSessions || 0,
    facilityTier: Perks.facilityTier(state, ctx), manager: !(ctx.engine && typeof ctx.engine.isPlayerCareer === 'function' && ctx.engine.isPlayerCareer(state)),
  };
}

module.exports = { id: ID, init, onDay, onTick, command, wrapEngine, snapshot };
