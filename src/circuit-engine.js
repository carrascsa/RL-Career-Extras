'use strict';
// Third-party circuit: S/A/B/C/D-tier tournaments between the official events, in 3v3, 2v2 and 1v1.
// Played by simulation (the Hub only launches real 3v3 matches for official fixtures).
const U = require('./util');

const ID = 'circuit';
const LINK = 'xtcircuit';
const OPEN_DAYS = 14; // registration opens this many days before the start
const CLOSE_DAYS = 2; // and closes this many days before
const TIERS = {
  S: { pool: [100000, 250000], follow: 3.0, morale: [6, 3, -1], travel: 8000, label: 'S' },
  A: { pool: [50000, 90000], follow: 1.6, morale: [5, 2, -1], travel: 0, label: 'A' },
  B: { pool: [10000, 40000], follow: 0.8, morale: [4, 1, 0], travel: 0, label: 'B' },
  C: { pool: [2000, 5000], follow: 0.35, morale: [3, 1, 0], travel: 0, label: 'C' },
  D: { pool: [300, 1000], follow: 0.12, morale: [2, 0, 0], travel: 0, label: 'D' },
};
const SHARE = [0.5, 0.25, 0.1, 0.1, 0.0125, 0.0125, 0.0125, 0.0125]; // by place 1..8 (3-4 and 5-8 tied)
const NAMES = {
  S: ['Apex Invitational', 'Titan Cup', 'Crown Masters', 'Orbit Invitational', 'Zenith Cup'],
  A: ['Vanguard Pro Series', 'Rival Circuit Finals', 'Nitro League', 'Pinnacle Cup', 'Ascent Series'],
  B: ['Starline Showdown', 'Summit Clash', 'Overdrive Cup', 'Boost Brawl Invitational', 'Redline Cup'],
  C: ['Bubble Cup', 'Kickoff Classic', 'Rumble Night', 'Weekend Warriors Cup', 'Turbo Trials'],
  D: ['Community Cup', 'Grassroots Open', 'Night Owl Cup', 'Sunday Cup', 'Rookie Rumble'],
};
// One season's circuit, spread between the official events.
const PLAN = [
  { tier: 'D', format: '3v3' }, { tier: 'C', format: '1v1' }, { tier: 'B', format: '3v3' }, { tier: 'C', format: '3v3' },
  { tier: 'A', format: '3v3' }, { tier: 'D', format: '2v2' }, { tier: 'B', format: '2v2' }, { tier: 'S', format: '3v3' },
  { tier: 'C', format: '3v3' }, { tier: 'B', format: '1v1' }, { tier: 'A', format: '2v2', marquee: 'doubles' }, { tier: 'D', format: '3v3' },
  { tier: 'B', format: '3v3' }, { tier: 'S', format: '1v1', marquee: 'duels' }, { tier: 'A', format: '3v3' }, { tier: 'S', format: '3v3' },
];
const SIZE = { '3v3': 3, '2v2': 2, '1v1': 1 };
// Fun-mode events: more upsets (chaos), smaller prizes, more followers.
const MODES = {
  hoops: { name: 'Hoops Hysteria', chaos: 1.4 }, dropshot: { name: 'Dropshot Showdown', chaos: 1.3 }, rumble: { name: 'Rumble Royale', chaos: 2.2 },
  snowday: { name: 'Snow Day Classic', chaos: 1.5 }, heatseeker: { name: 'Heatseeker Havoc', chaos: 1.8 },
};
const MODE_PLAN = [
  { mode: 'hoops', format: '2v2', tier: 'C' }, { mode: 'rumble', format: '3v3', tier: 'B' }, { mode: 'dropshot', format: '3v3', tier: 'C' },
  { mode: 'snowday', format: '3v3', tier: 'D' }, { mode: 'heatseeker', format: '2v2', tier: 'D' },
];

function ensure(state) {
  const x = U.xstate(state);
  let c = x.circuit;
  if (!c || typeof c !== 'object') c = x.circuit = { season: null, events: [], trophies: [], log: [], seq: 1, played: [] };
  if (!Array.isArray(c.events)) c.events = [];
  if (!Array.isArray(c.trophies)) c.trophies = [];
  if (!Array.isArray(c.log)) c.log = [];
  if (!Array.isArray(c.played)) c.played = [];
  return c;
}

const es = (ctx) => ctx && ctx.lang === 'es';
const econScale = (state) => (state.economy === 'real' || state.real ? 1 : 40);
const regionOf = (state) => { const t = U.userTeam(state); return (t && t.region) || null; };

// ---------- strength ----------
function pStrength(ctx, p) {
  if (!p) return 40;
  if (ctx && ctx.engine && typeof ctx.engine.matchRating === 'function') {
    try { const v = Number(ctx.engine.matchRating(p)); if (Number.isFinite(v)) return v; } catch { /* fall back */ }
  }
  return U.num(p.rating) + U.num(p.form);
}

function available(state, team) {
  return (team.playerIds || []).map((id) => U.playerOf(state, id)).filter((p) => p && !p.retired && !p.absence);
}

function bestOf(state, team, n, ctx) {
  const lineup = Array.isArray(team.lineup) ? team.lineup.map((id) => U.playerOf(state, id)).filter((p) => p && !p.retired && !p.absence) : [];
  const rest = available(state, team).filter((p) => !lineup.includes(p)).sort((a, b) => pStrength(ctx, b) - pStrength(ctx, a));
  const pool = n === 3 ? lineup.concat(rest) : available(state, team).sort((a, b) => pStrength(ctx, b) - pStrength(ctx, a));
  return pool.slice(0, n);
}

function clubTeams(state) {
  return state.teams.filter((t) => t && !t.national && Array.isArray(t.playerIds) && t.playerIds.length >= 3);
}

function rankPoints(state, id) { return U.num(state.ranking && state.ranking[String(id)]); }

function ranked(state, teams, ctx) {
  const s = new Map(teams.map((t) => [t.id, avg(bestOf(state, t, 3, ctx), ctx)]));
  return teams.slice().sort((a, b) => rankPoints(state, b.id) - rankPoints(state, a.id) || s.get(b.id) - s.get(a.id));
}
function avg(ps, ctx) { return ps.length ? ps.reduce((s, p) => s + pStrength(ctx, p), 0) / ps.length : 40; }

function userRanks(state, ctx) {
  const all = ranked(state, clubTeams(state), ctx);
  const reg = all.filter((t) => t.region === regionOf(state));
  return { world: all.findIndex((t) => t.id === state.userTeamId) + 1, region: reg.findIndex((t) => t.id === state.userTeamId) + 1, all, reg };
}

// ---------- schedule ----------
function seasonWindow(state) {
  const evs = (state.events || []).filter((e) => e && e.startDate);
  const end = evs.reduce((m, e) => (String(e.endDate || e.startDate) > m ? String(e.endDate || e.startDate) : m), String(state.currentDate));
  return { start: U.addDays(state.currentDate, 4), end: U.addDays(end, -3) };
}

function blocked(state, day, list) {
  for (const e of state.events || []) {
    if (!e || !e.startDate) continue;
    if (day >= U.addDays(e.startDate, -2) && day <= U.addDays(e.endDate || e.startDate, 1)) return true;
  }
  for (const c of list) if (Math.abs(U.daysBetween(c.start, day)) < 4) return true;
  return false;
}

function schedule(state, ctx) {
  const c = ensure(state);
  c.season = U.num(state.season);
  c.events = c.events.filter((e) => e.status === 'done' && e.season === c.season);
  const { start, end } = seasonWindow(state);
  const span = U.daysBetween(start, end);
  if (span < 10) return;
  const r = U.rng(U.careerKey(state) + '|circuit|' + c.season);
  const full = PLAN.length;
  // mid-season: only the part of the plan that fits in what is left
  const left = Math.max(2, Math.min(full, Math.round(full * span / 300)));
  const plan = PLAN.slice(full - left);
  const step = span / (plan.length + 1);
  const list = [];
  plan.forEach((p, i) => {
    let day = U.addDays(start, Math.round(step * (i + 1)));
    for (let k = 0; k < 20 && blocked(state, day, list); k++) day = U.addDays(day, k % 2 ? -(k + 1) : k + 1);
    if (blocked(state, day, list) || day < start || day > end) return;
    const T = TIERS[p.tier];
    const pool = Math.round((r.int(T.pool[0], T.pool[1]) * econScale(state)) / 100) * 100;
    let name;
    if (p.marquee === 'duels') name = es(ctx) ? 'Campeonato de Duelos 1v1' : 'Duels Championship 1v1';
    else if (p.marquee === 'doubles') name = es(ctx) ? 'Campeonato de Dobles 2v2' : 'Doubles Championship 2v2';
    else name = r.pick(NAMES[p.tier]) + (p.format === '3v3' ? '' : ' ' + p.format);
    if (p.tier !== 'S' && regionOf(state)) name += ' · ' + String(regionOf(state)).toUpperCase();
    list.push({
      id: 'c' + c.season + '-' + (c.seq++), season: c.season, tier: p.tier, format: p.format, marquee: p.marquee || null, name,
      start: day, pool, status: 'upcoming', invited: false, eligible: false, entered: null, pids: [], field: [], rounds: [], place: null, prize: 0,
    });
  });
  list.sort((a, b) => a.start.localeCompare(b.start));
  c.events = c.events.concat(list);
  scheduleModes(state, ctx);
}

function scheduleModes(state, ctx) {
  const c = ensure(state);
  c.modesSeason = U.num(state.season);
  const { start, end } = seasonWindow(state);
  const span = U.daysBetween(start, end);
  if (span < 10) return;
  const r = U.rng(U.careerKey(state) + '|cmodes|' + c.modesSeason);
  const left = Math.max(1, Math.min(MODE_PLAN.length, Math.round(MODE_PLAN.length * span / 300)));
  const plan = MODE_PLAN.slice(MODE_PLAN.length - left);
  const step = span / (plan.length + 1);
  const taken = c.events.filter((e) => e.season === c.modesSeason);
  const list = [];
  plan.forEach((p, i) => {
    let day = U.addDays(start, Math.round(step * (i + 0.5)));
    for (let k = 0; k < 20 && blocked(state, day, taken.concat(list)); k++) day = U.addDays(day, k % 2 ? -(k + 1) : k + 1);
    if (blocked(state, day, taken.concat(list)) || day < start || day > end) return;
    const T = TIERS[p.tier];
    const pool = Math.round((r.int(T.pool[0], T.pool[1]) * 0.6 * econScale(state)) / 100) * 100;
    let name = MODES[p.mode].name + (p.format === '3v3' ? '' : ' ' + p.format);
    if (regionOf(state)) name += ' · ' + String(regionOf(state)).toUpperCase();
    list.push({
      id: 'c' + c.modesSeason + '-' + (c.seq++), season: c.modesSeason, tier: p.tier, format: p.format, mode: p.mode, marquee: null, name,
      start: day, pool, status: 'upcoming', invited: false, eligible: false, entered: null, pids: [], field: [], rounds: [], place: null, prize: 0,
    });
  });
  c.events = c.events.concat(list).sort((a, b) => a.start.localeCompare(b.start));
}

// ---------- fields ----------
function entrantFromTeam(state, team, format, ctx, pids) {
  const n = SIZE[format];
  let ps = pids && pids.length ? pids.map((id) => U.playerOf(state, id)).filter(Boolean) : bestOf(state, team, n, ctx);
  ps = ps.slice(0, n);
  if (ps.length < n) return null;
  const tag = team.abbrev || team.name;
  const name = format === '3v3' ? team.name : format === '2v2' ? `${ps.map((p) => p.name).join(' & ')} (${tag})` : `${ps[0].name} (${tag})`;
  return { key: 't' + team.id, teamId: team.id, name, pids: ps.map((p) => p.id), s: Math.round(avg(ps, ctx) * 10) / 10, mine: team.id === state.userTeamId };
}

function candidates(state, ev, ctx) {
  const { all, reg } = userRanks(state, ctx);
  const others = (list) => list.filter((t) => t.id !== state.userTeamId);
  if (ev.tier === 'S') return others(all).slice(0, 12);
  if (ev.tier === 'A') return others(reg).slice(0, 10);
  if (ev.tier === 'B') return others(reg).slice(2, 18);
  if (ev.tier === 'C') return others(reg).slice(6, 30);
  return others(reg).slice(12);
}

function eligibility(state, ev, ctx) {
  const { world, region } = userRanks(state, ctx);
  if (ev.tier === 'S') return { invited: world > 0 && world <= 8, eligible: world > 0 && world <= 8, qualifier: false };
  if (ev.tier === 'A') return { invited: region > 0 && region <= 6, eligible: true, qualifier: !(region > 0 && region <= 6) };
  return { invited: false, eligible: true, qualifier: false };
}

function buildField(state, ev, ctx) {
  const r = U.rng(U.careerKey(state) + '|cfield|' + ev.id);
  const cands = candidates(state, ev, ctx);
  const pool = ev.tier === 'S' || ev.tier === 'A' ? cands.slice() : cands.slice().sort(() => r() - 0.5);
  const field = [];
  if (ev.entered) {
    const me = entrantFromTeam(state, U.userTeam(state), ev.format, ctx, ev.pids);
    if (me) field.push(me);
    else ev.entered = false;
  }
  for (const t of pool) {
    if (field.length >= 8) break;
    const en = entrantFromTeam(state, t, ev.format, ctx);
    if (en) field.push(en);
  }
  let k = 1;
  while (field.length < 8) field.push({ key: 'x' + k, name: (es(ctx) ? 'Equipo invitado ' : 'Wildcard ') + k++, pids: [], s: 50 + r.int(0, 8) });
  // seed by strength: 1v8, 4v5, 2v7, 3v6
  field.sort((a, b) => b.s - a.s);
  ev.field = field;
  const o = [0, 7, 3, 4, 1, 6, 2, 5];
  ev.rounds = [[0, 1, 2, 3].map((i) => ({ a: field[o[i * 2]].key, b: field[o[i * 2 + 1]].key, aw: null, bw: null, w: null }))];
}

// ---------- simulation ----------
function series(sa, sb, bo, r, format, mode) {
  const k = (format === '1v1' ? 3.5 : format === '2v2' ? 4.2 : 5) * (mode && MODES[mode] ? MODES[mode].chaos : 1);
  const p = 1 / (1 + Math.exp(-(sa - sb) / k));
  const need = Math.ceil(bo / 2);
  let aw = 0; let bw = 0;
  while (aw < need && bw < need) { if (r() < p) aw++; else bw++; }
  return { aw, bw };
}

function playRound(state, ev, ctx) {
  const r = U.rng(U.careerKey(state) + '|cplay|' + ev.id + '|' + ev.rounds.length);
  const byKey = Object.fromEntries(ev.field.map((f) => [f.key, f]));
  const cur = ev.rounds[ev.rounds.length - 1];
  const bo = cur.length === 1 ? 7 : 5;
  for (const m of cur) {
    if (m.w) continue;
    const s = series(byKey[m.a].s + r() * 2, byKey[m.b].s + r() * 2, bo, r, ev.format, ev.mode);
    m.aw = s.aw; m.bw = s.bw; m.w = s.aw > s.bw ? m.a : m.b;
  }
  if (cur.length > 1) {
    const next = [];
    for (let i = 0; i < cur.length; i += 2) next.push({ a: cur[i].w, b: cur[i + 1].w, aw: null, bw: null, w: null });
    ev.rounds.push(next);
  }
}

function placeOf(ev, key) {
  const [qf, sf, f] = ev.rounds;
  if (f && f[0].w) { if (f[0].w === key) return 1; if (f[0].a === key || f[0].b === key) return 2; }
  if (sf && sf.some((m) => (m.a === key || m.b === key) && m.w && m.w !== key)) return 3;
  if (qf && qf.some((m) => (m.a === key || m.b === key) && m.w && m.w !== key)) return 5;
  return null;
}

function finish(state, ev, ctx, day) {
  ev.status = 'done';
  const f = ev.rounds[2] && ev.rounds[2][0];
  const champ = f && ev.field.find((x) => x.key === f.w);
  ev.champion = champ ? champ.name : null;
  const c = ensure(state);
  const me = ev.field.find((x) => x.mine);
  if (!me) return;
  const T = TIERS[ev.tier];
  const place = placeOf(ev, me.key) || 5;
  ev.place = place;
  ev.prize = Math.round(ev.pool * SHARE[place - 1]);
  if (ev.prize > 0) {
    U.earn(state, ev.prize);
    if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'prize', amount: ev.prize, note: ev.name });
  }
  const team = U.userTeam(state);
  const pf = place === 1 ? 1 : place === 2 ? 0.5 : place <= 4 ? 0.25 : 0.1;
  if (team) team.followers = Math.round(U.num(team.followers) * (1 + (T.follow * pf * (ev.mode ? 2 : 1)) / 100));
  const mor = place === 1 ? T.morale[0] : place <= 2 ? T.morale[1] : T.morale[2];
  for (const pid of me.pids) {
    const p = U.playerOf(state, pid);
    if (!p || p.isUser) continue;
    U.moraleDelta(ctx.engine, p, mor);
    // too many events in a short time wears players out
    const recent = c.played.filter((x) => x.pid === pid && U.daysBetween(x.date, state.currentDate) <= 21).length;
    if (recent >= 2) U.moraleDelta(ctx.engine, p, -3);
    c.played.push({ pid, date: day || state.currentDate });
  }
  c.played = c.played.filter((x) => U.daysBetween(x.date, state.currentDate) <= 30);
  c.log.unshift({ season: ev.season, date: state.currentDate, name: ev.name, tier: ev.tier, format: ev.format, mode: ev.mode || null, place, prize: ev.prize, champion: ev.champion });
  if (c.log.length > 40) c.log.length = 40;
  if (place === 1) {
    c.trophies.unshift({ season: ev.season, date: state.currentDate, name: ev.name, tier: ev.tier, format: ev.format, who: me.name });
    if (['S', 'A'].includes(ev.tier) || ev.marquee) {
      U.pushNews(state, ctx, ev.id, {
        category: 'club', teamId: state.userTeamId,
        headline: es(ctx) ? `${me.name} gana el ${ev.name}` : `${me.name} win the ${ev.name}`,
        body: es(ctx) ? `Título de tier ${ev.tier} y ${U.fmtMoney(ev.prize)} en premios.` : `A ${ev.tier}-tier title and ${U.fmtMoney(ev.prize)} in prize money.`,
      });
    }
  }
  U.pushInbox(state, es(ctx) ? `${ev.name}: ${placeText(place, ctx)}` : `${ev.name}: ${placeText(place, ctx)}`,
    es(ctx) ? `Terminaron ${placeText(place, ctx)} (${ev.format}, tier ${ev.tier}).${ev.prize ? ' Premio: ' + U.fmtMoney(ev.prize) + '.' : ''}` : `You finished ${placeText(place, ctx)} (${ev.format}, ${ev.tier}-tier).${ev.prize ? ' Prize: ' + U.fmtMoney(ev.prize) + '.' : ''}`, LINK);
}

function placeText(place, ctx) {
  if (es(ctx)) return place === 1 ? 'campeones' : place === 2 ? 'segundos' : place <= 4 ? 'semifinalistas (3°-4°)' : 'cuartos de final (5°-8°)';
  return place === 1 ? 'champions' : place === 2 ? 'runners-up' : place <= 4 ? 'semi-finalists (3rd-4th)' : 'quarter-finalists (5th-8th)';
}

// qualifier for A-tier events: win two Bo5 against regional teams outside the invites
function qualifier(state, ev, ctx) {
  const r = U.rng(U.careerKey(state) + '|cqual|' + ev.id);
  const me = entrantFromTeam(state, U.userTeam(state), ev.format, ctx, ev.pids);
  if (!me) return false;
  const { reg } = userRanks(state, ctx);
  const opps = reg.filter((t) => t.id !== state.userTeamId).slice(6, 24).sort(() => r() - 0.5).slice(0, 2)
    .map((t) => entrantFromTeam(state, t, ev.format, ctx)).filter(Boolean);
  ev.qual = [];
  for (const o of opps) {
    const s = series(me.s, o.s, 5, r, ev.format, ev.mode);
    ev.qual.push({ opp: o.name, aw: s.aw, bw: s.bw });
    if (s.aw < s.bw) return false;
  }
  return true;
}

// ---------- day loop ----------
function dayStep(state, day, ctx) {
  const c = ensure(state);
  for (const ev of c.events) {
    if (ev.status === 'done') continue;
    const toStart = U.daysBetween(day, ev.start);
    if (ev.status === 'upcoming' && toStart <= OPEN_DAYS) {
      ev.status = 'open';
      const el = eligibility(state, ev, ctx);
      Object.assign(ev, el);
      if (!ctx.manager) ev.entered = el.invited || (ev.tier !== 'S' && ev.tier !== 'A' && U.rng(ev.id).chance(0.5));
      if (ctx.manager && el.invited) {
        U.pushInbox(state, es(ctx) ? `Invitación: ${ev.name}` : `Invitation: ${ev.name}`,
          es(ctx) ? `Te invitan a un torneo tier ${ev.tier} (${ev.format}) el ${ev.start}, con ${U.fmtMoney(ev.pool)} en premios. Respondé en la pestaña Circuit.` : `You're invited to a ${ev.tier}-tier event (${ev.format}) on ${ev.start} with a ${U.fmtMoney(ev.pool)} prize pool. Reply in the Circuit tab.`, LINK);
      }
    }
    if (ev.status === 'open' && toStart <= CLOSE_DAYS) {
      if (ev.entered && ev.qualifier && !ev.invited) ev.entered = qualifier(state, ev, ctx);
      if (ev.entered && TIERS[ev.tier].travel) {
        const pay = U.spend(state, TIERS[ev.tier].travel * econScale(state));
        if (!pay.ok) ev.entered = false;
      }
      ev.status = 'locked';
      buildField(state, ev, ctx);
    }
    if (ev.status === 'locked' && toStart <= 0) { playRound(state, ev, ctx); ev.status = 'running'; }
    if (ev.status === 'running' && toStart <= -1) {
      while (!(ev.rounds[2] && ev.rounds[2][0].w)) playRound(state, ev, ctx);
      finish(state, ev, ctx, day);
    }
  }
}

// ---------- lifecycle ----------
function init(state, ctx) { const c = ensure(state); if (c.season !== U.num(state.season)) schedule(state, ctx); else if (c.modesSeason !== c.season) scheduleModes(state, ctx); }
function onSeason(state, ctx) { schedule(state, ctx); }
function onDay(state, day, ctx) { dayStep(state, day, ctx); }
function onTick(state, ctx) { const c = ensure(state); if (c.season !== U.num(state.season)) schedule(state, ctx); else if (c.modesSeason !== c.season) scheduleModes(state, ctx); }

function command(state, cmd, ctx) {
  const c = ensure(state);
  const ev = c.events.find((e) => e.id === cmd.id);
  if (!ctx.manager) return { ok: false, error: 'Only the manager decides which events to play.' };
  if (!ev) return { ok: false, error: 'Unknown event.' };
  if (ev.status !== 'open') return { ok: false, error: 'Registration is closed.' };
  if (cmd.op === 'enter') {
    if (!ev.eligible) return { ok: false, error: 'Your club is not eligible for this event.' };
    const n = SIZE[ev.format];
    let pids = Array.isArray(cmd.pids) ? [...new Set(cmd.pids.map(Number))] : [];
    const mine = new Set(U.rosterPlayers(state).filter((p) => !p.absence).map((p) => p.id));
    if (pids.some((id) => !mine.has(id))) return { ok: false, error: 'Pick available players from your squad.' };
    if (ev.format !== '3v3') {
      if (pids.length && pids.length !== n) return { ok: false, error: `Pick ${n} player(s).` };
      if (!pids.length) pids = bestOf(state, U.userTeam(state), n, ctx).map((p) => p.id);
    } else pids = [];
    ev.entered = true;
    ev.pids = pids;
    return { ok: true };
  }
  if (cmd.op === 'withdraw') { ev.entered = false; ev.pids = []; return { ok: true }; }
  return { ok: false, error: 'Unknown circuit command.' };
}

function snapshot(state, ctx) {
  const c = ensure(state);
  const ranks = userRanks(state, ctx);
  const nameOf = (ev, key) => { const f = ev.field.find((x) => x.key === key); return f ? f.name : '?'; };
  const evs = c.events.filter((e) => e.season === U.num(state.season)).map((ev) => ({
    id: ev.id, tier: ev.tier, format: ev.format, name: ev.name, start: ev.start, pool: ev.pool, status: ev.status,
    invited: !!ev.invited, eligible: !!ev.eligible, qualifier: !!ev.qualifier, entered: ev.entered, pids: ev.pids,
    inDays: U.daysBetween(state.currentDate, ev.start), opensIn: U.daysBetween(state.currentDate, ev.start) - OPEN_DAYS,
    travel: TIERS[ev.tier].travel * econScale(state), mode: ev.mode || null,
    qual: ev.qual || null, place: ev.place, prize: ev.prize, champion: ev.champion || null, marquee: ev.marquee,
    field: ev.field.map((f) => ({ name: f.name, s: f.s, mine: !!f.mine })),
    rounds: ev.rounds.map((rd) => rd.map((m) => ({ a: nameOf(ev, m.a), b: nameOf(ev, m.b), aw: m.aw, bw: m.bw, w: m.w ? nameOf(ev, m.w) : null, mine: ev.field.some((f) => f.mine && (f.key === m.a || f.key === m.b)) }))),
  }));
  return {
    enabled: ctx.manager,
    worldRank: ranks.world, regionRank: ranks.region, region: regionOf(state),
    events: evs,
    trophies: c.trophies.slice(0, 30),
    log: c.log.slice(0, 12),
    earnings: c.log.reduce((s, l) => s + U.num(l.prize), 0),
    roster: U.rosterPlayers(state).filter((p) => !p.absence).map((p) => ({ id: p.id, name: p.name, rating: p.rating, isUser: !!p.isUser })),
  };
}

module.exports = { id: ID, TIERS, PLAN, MODES, init, onSeason, onDay, onTick, command, snapshot, _test: { schedule, buildField, playRound, finish, eligibility, userRanks, series, placeOf } };
