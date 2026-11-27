'use strict';
// Matchday: opponent analysis (game plans) + post-match press conferences.
const U = require('./util');

const ID = 'matchday';
const STYLES = ['aggressive', 'defensive', 'possession'];
const COUNTER = { aggressive: 'counter', defensive: 'patient', possession: 'press' };
const PLANS = ['press', 'counter', 'patient'];
const REPORT_COST = { open: 1500, lcq: 3000, major: 5000, worlds: 8000 };
const GOOD_FORM = 2;
const BAD_FORM = -1;
const PRESS_EXPIRE_DAYS = 4;
const TIERS = ['rookie', 'pro', 'allstar'];

// ---------- press texts ----------
const Q = {
  q_win: {
    en: ['A {score} win over {opp}. What made the difference?', 'The whole squad stuck to the plan. Credit to {opp}, they made it hard.', "We were simply better. That's the level we expect every day.", 'Honestly? {opp} never had a chance. Anyone else want a go?'],
    es: ['Victoria {score} ante {opp}. ¿Qué marcó la diferencia?', 'Todo el equipo respetó el plan. Mérito de {opp} también, nos complicaron.', 'Fuimos superiores, simplemente. Es el nivel que exigimos todos los días.', '¿Sinceramente? {opp} nunca tuvo chances. ¿Alguien más quiere probar?'],
    fx: [{ t: 1, f: 0.3, r: 3 }, { t: 2, f: 0.8, r: 1 }, { t: 2, f: 1.5, r: -4 }],
  },
  q_loss: {
    en: ['{opp} beat you {score}. What went wrong?', "They deserved it. We'll study the replays and come back better.", "One bad day doesn't change who we are. We'll be fine.", "I'm not happy. Some players need to look in the mirror tonight."],
    es: ['{opp} les ganó {score}. ¿Qué salió mal?', 'Lo merecieron. Vamos a estudiar las repeticiones y volver mejores.', 'Un mal día no cambia quiénes somos. Vamos a estar bien.', 'No estoy contento. Algunos jugadores tienen que mirarse al espejo esta noche.'],
    fx: [{ t: 1, f: 0, r: 3 }, { t: 2, f: 0.2, r: 0 }, { t: -3, f: 0.5, r: -3 }],
  },
  q_mvp: {
    en: ['{mvp} was outstanding. How important is {mvp} to this team?', 'Very, but this is a team game. Everyone contributed.', '{mvp} is one of the best players in the world. Simple as that.', 'Good game, but I expect even more. The ceiling is much higher.'],
    es: ['{mvp} estuvo impresionante. ¿Qué tan importante es {mvp} para este equipo?', 'Mucho, pero esto es un juego de equipo. Todos aportaron.', '{mvp} es uno de los mejores jugadores del mundo. Así de simple.', 'Buen partido, pero espero todavía más. Tiene mucho más techo.'],
    fx: [{ t: 1, m: -1, f: 0.2, r: 2 }, { t: 0, m: 6, f: 0.6, r: 1 }, { t: 0, m: -5, f: 0.3, r: -1 }],
  },
  q_opp: {
    en: ['What do you make of {opp} as a rival?', 'Top organisation. We respect them a lot.', 'A good team, but we know how to beat them.', 'Overrated. Their fans talk more than their players play.'],
    es: ['¿Qué opinás de {opp} como rival?', 'Una organización de primer nivel. Los respetamos mucho.', 'Buen equipo, pero sabemos cómo ganarles.', 'Sobrevalorados. Sus hinchas hablan más de lo que juegan sus jugadores.'],
    fx: [{ t: 0, f: 0.2, r: 3 }, { t: 1, f: 0.5, r: 0 }, { t: 2, f: 1.2, r: -5 }],
  },
  q_next: {
    en: ["What's the goal for the rest of {event}?", 'Game by game. No point looking too far ahead.', "We're here to win it. Nothing less.", 'Trophy or nothing. Anyone who thinks otherwise can leave.'],
    es: ['¿Cuál es el objetivo para lo que queda de {event}?', 'Partido a partido. No sirve mirar demasiado lejos.', 'Vinimos a ganarlo. Nada menos.', 'Trofeo o nada. El que piense distinto se puede ir.'],
    fx: [{ t: 0, f: 0.1, r: 2 }, { t: 2, f: 0.6, r: 0 }, { t: -1, f: 0.8, r: -2 }],
  },
  q_streak: {
    en: ["That's {streak} series wins in a row. Can anyone stop you?", 'Streaks end. We stay focused on the next one.', 'If we play like this, no.', 'Let them try.'],
    es: ['Llevan {streak} series ganadas seguidas. ¿Alguien los puede frenar?', 'Las rachas se cortan. Seguimos enfocados en la próxima.', 'Si jugamos así, no.', 'Que lo intenten.'],
    fx: [{ t: 1, f: 0.2, r: 2 }, { t: 2, f: 0.8, r: 0 }, { t: 2, f: 1.2, r: -3 }],
  },
  q_pressure: {
    en: ["There's talk of pressure on your job. Are you worried?", "The board's trust is earned with results. I'll keep working.", 'No. I know exactly where this project is going.', 'Whoever is spreading that can come say it to my face.'],
    es: ['Se habla de presión sobre tu cargo. ¿Estás preocupado?', 'La confianza de la directiva se gana con resultados. Voy a seguir trabajando.', 'No. Sé exactamente hacia dónde va este proyecto.', 'El que anda diciendo eso que me lo venga a decir en la cara.'],
    fx: [{ t: 1, f: 0, r: 3 }, { t: 2, f: 0.3, r: 1 }, { t: -1, f: 0.6, r: -6 }],
  },
  q_fans: {
    en: ['A message for the fans?', 'Thank you. We feel the support every match.', 'Keep believing. Big things are coming.', 'Get loud. We need the whole arena behind us.'],
    es: ['¿Un mensaje para los hinchas?', 'Gracias. Sentimos el apoyo en cada partido.', 'Sigan creyendo. Se vienen cosas grandes.', 'Hagan ruido. Necesitamos a toda la arena con nosotros.'],
    fx: [{ t: 1, f: 0.5, r: 2 }, { t: 1, f: 0.8, r: 1 }, { t: 1, f: 1.0, r: -1 }],
  },
};

function fill(s, p) { return String(s).replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? p[k] : '')); }
function L(ctx) { return ctx.lang === 'es' ? 'es' : 'en'; }

function ensure(state) {
  const x = U.xstate(state);
  let m = x.matchday;
  if (!m || typeof m !== 'object') m = x.matchday = { seenFx: {}, plans: {}, history: [], press: null, rep: 0, pressLog: [] };
  if (!m.seenFx) m.seenFx = {};
  if (!m.plans) m.plans = {};
  if (!Array.isArray(m.history)) m.history = [];
  if (!Array.isArray(m.pressLog)) m.pressLog = [];
  if (typeof m.rep !== 'number') m.rep = 0;
  return m;
}

const fxKey = (fx) => [fx.id, fx.date].join('|');
const eventOf = (state, id) => (id == null ? null : (state.events || []).find((e) => e && e.id === id) || null);

function styleOf(state, oppId) {
  return STYLES[U.hashStr(U.careerKey(state) + '|style|' + oppId + '|' + state.season) % STYLES.length];
}

function nextFixture(state) {
  const me = state.userTeamId;
  return (state.fixtures || [])
    .filter((fx) => fx && !fx.played && fx.homeId != null && fx.awayId != null && (fx.homeId === me || fx.awayId === me) && fx.date >= state.currentDate)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.id - b.id)[0] || null;
}

function lineupOf(state, team) {
  if (!team) return [];
  const ids = Array.isArray(team.lineup) && team.lineup.length ? team.lineup : (team.playerIds || []).slice(0, 3);
  return ids.map((id) => U.playerOf(state, id)).filter(Boolean);
}

function recentForm(state, teamId) {
  return (state.fixtures || [])
    .filter((fx) => fx && fx.played && (fx.homeId === teamId || fx.awayId === teamId))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
    .map((fx) => {
      const home = fx.homeId === teamId;
      const w = U.num(home ? fx.homeWins : fx.awayWins);
      const l = U.num(home ? fx.awayWins : fx.homeWins);
      return { won: w > l, score: w + '-' + l, opp: (U.teamOf(state, home ? fx.awayId : fx.homeId) || {}).name || '?', date: fx.date };
    });
}

function reportCost(state, fx) {
  const ev = eventOf(state, fx.eventId);
  return REPORT_COST[ev && ev.kind] || 2500;
}

// ---------- plan effects ----------
function revert(state, plan) {
  for (const [pid, d] of Object.entries(plan.applied || {})) {
    const p = U.playerOf(state, Number(pid));
    if (p) p.form = U.clamp(U.num(p.form) - d, -5, 5);
  }
  plan.applied = null;
}

function apply(state, plan) {
  const delta = plan.correct ? GOOD_FORM : BAD_FORM;
  plan.applied = {};
  for (const p of lineupOf(state, U.userTeam(state))) {
    const before = U.num(p.form);
    p.form = U.clamp(before + delta, -5, 5);
    const real = p.form - before;
    if (real) plan.applied[p.id] = real;
  }
}

function settlePlans(state, ctx) {
  const m = ensure(state);
  for (const [k, plan] of Object.entries(m.plans)) {
    const fx = (state.fixtures || []).find((f) => f && fxKey(f) === k);
    if (!fx) {
      // fixture vanished (new season): undo and drop
      if (plan.applied) revert(state, plan);
      delete m.plans[k];
      continue;
    }
    if (fx.played) {
      if (plan.applied) revert(state, plan);
      const home = fx.homeId === state.userTeamId;
      const won = U.num(home ? fx.homeWins : fx.awayWins) > U.num(home ? fx.awayWins : fx.homeWins);
      m.history.unshift({ date: fx.date, opp: plan.oppName, plan: plan.plan, style: plan.style, correct: plan.correct, report: plan.report, won });
      if (m.history.length > 12) m.history.length = 12;
      delete m.plans[k];
      continue;
    }
    if (plan.plan && !plan.applied && U.daysBetween(state.currentDate, fx.date) <= 1) apply(state, plan);
  }
}

// ---------- press conferences ----------
function streakOf(state) {
  const c = state.hof && state.hof.clubs && state.hof.clubs[String(state.userTeamId)];
  return c ? U.num(c.streak && c.streak.cur) : 0;
}

function buildPress(state, fx, ctx) {
  const home = fx.homeId === state.userTeamId;
  const w = U.num(home ? fx.homeWins : fx.awayWins);
  const l = U.num(home ? fx.awayWins : fx.homeWins);
  const won = w > l;
  const oppId = home ? fx.awayId : fx.homeId;
  const ev = eventOf(state, fx.eventId);
  const team = U.userTeam(state);
  const mvp = fx.mvpId != null && team && (team.playerIds || []).includes(fx.mvpId) ? U.playerOf(state, fx.mvpId) : null;
  const r = U.rng(U.careerKey(state) + '|press|' + fxKey(fx));
  const qs = [won ? 'q_win' : 'q_loss'];
  const pool = [];
  if (mvp && won) pool.push('q_mvp');
  pool.push('q_opp', 'q_fans');
  if (ev && ev.stage !== 'done') pool.push('q_next');
  if (won && streakOf(state) >= 3) pool.push('q_streak', 'q_streak');
  if (!won) pool.push('q_pressure', 'q_pressure');
  while (qs.length < 3 && pool.length) {
    const q = pool.splice(r.int(0, pool.length - 1), 1)[0];
    if (!qs.includes(q)) qs.push(q);
  }
  return {
    key: fxKey(fx),
    date: state.currentDate,
    won,
    score: w + '-' + l,
    oppId,
    opp: (U.teamOf(state, oppId) || {}).name || '?',
    event: ev ? ev.name : '',
    mvpId: mvp ? mvp.id : null,
    mvp: mvp ? mvp.name : '',
    streak: streakOf(state),
    questions: qs,
  };
}

const PRESS_GAP_DAYS = 6;
const PRESS_RANDOM = 0.2;

function important(state, fx) {
  if (fx.stage === 'final' || fx.stage === 'semi') return true;
  const ev = eventOf(state, fx.eventId);
  return !!(ev && ['major', 'worlds'].includes(ev.kind) && fx.stage && fx.stage !== 'group');
}

function scanForPress(state, ctx) {
  const m = ensure(state);
  const me = state.userTeamId;
  const played = (state.fixtures || [])
    .filter((fx) => fx && fx.played && (fx.homeId === me || fx.awayId === me))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (const fx of played) {
    const k = fxKey(fx);
    if (m.seenFx[k]) continue;
    m.seenFx[k] = fx.date;
    if (m.press || !ctx.manager) continue;
    const big = important(state, fx);
    if (!big && m.lastPress && U.daysBetween(m.lastPress, fx.date) < PRESS_GAP_DAYS) continue;
    const r = U.rng(U.careerKey(state) + '|presschance|' + k);
    if (big || r.chance(PRESS_RANDOM)) {
      m.press = buildPress(state, fx, ctx);
      m.lastPress = fx.date;
      U.pushInbox(state, ctx.lang === 'es' ? 'Te esperan en la sala de prensa' : 'The press room is waiting',
        ctx.lang === 'es' ? `Después del ${m.press.score} ante ${m.press.opp}, los periodistas quieren hablar con vos. Andá a la pestaña Club Life.` : `After the ${m.press.score} against ${m.press.opp}, journalists want a word. Head to the Club Life tab.`, 'xtclublife');
    }
  }
  for (const [k, d] of Object.entries(m.seenFx)) if (U.daysBetween(d, state.currentDate) > 420) delete m.seenFx[k];
}

function applyPressEffects(state, press, answers, ctx) {
  const m = ensure(state);
  const team = U.userTeam(state);
  let t = 0; let mv = 0; let f = 0; let rep = 0;
  press.questions.forEach((q, i) => {
    const e = Q[q].fx[answers[i]] || Q[q].fx[0];
    t += e.t || 0; mv += e.m || 0; f += e.f || 0; rep += e.r || 0;
  });
  for (const p of U.rosterPlayers(state)) {
    if (p.isUser) continue;
    U.moraleDelta(ctx.engine, p, t + (p.id === press.mvpId ? mv : 0));
  }
  if (team) team.followers = Math.round(U.num(team.followers) * (1 + f / 100));
  m.rep = U.clamp(m.rep + rep, -100, 100);
  return { t, mv, f, rep };
}

function pushPressNews(state, press, answers, ctx) {
  const lang = L(ctx);
  // headline quotes the boldest answer
  let best = 0;
  answers.forEach((a, i) => { if (a > answers[best]) best = i; });
  const q = Q[press.questions[best]][lang];
  const params = { opp: press.opp, score: press.score, event: press.event, mvp: press.mvp, streak: press.streak };
  const quote = fill(q[1 + answers[best]], params);
  const team = U.userTeam(state);
  const who = (state.profile && (state.profile.managerName || state.profile.name)) || state.managerName || (lang === 'es' ? 'El DT' : 'The manager');
  const item = {
    category: 'club',
    teamId: state.userTeamId,
    headline: `${(team && team.name) || ''}: "${quote}"`,
    body: (lang === 'es' ? `${who} habló en conferencia de prensa tras el ${press.score} ante ${press.opp}` : `${who} spoke to the press after the ${press.score} against ${press.opp}`) + (press.event ? ` (${press.event}).` : '.'),
  };
  try {
    if (ctx.engine && typeof ctx.engine.pushNews === 'function') ctx.engine.pushNews(state, U.rng(U.careerKey(state) + press.key), item);
  } catch (e) { ctx.log('pushNews err: ' + e.message); }
}

// ---------- lifecycle ----------
function init(state, ctx) {
  const m = ensure(state);
  // don't hold press conferences for matches played before the add-on was installed
  for (const fx of state.fixtures || []) if (fx && fx.played) m.seenFx[fxKey(fx)] = fx.date;
}

function onDay(state, day, ctx) {
  const m = ensure(state);
  if (U.weekday(day) === 1 && m.rep) {
    const team = U.userTeam(state);
    if (team) team.followers = Math.max(0, Math.round(U.num(team.followers) * (1 + m.rep / 20000)));
  }
}

function onTick(state, ctx) {
  const m = ensure(state);
  settlePlans(state, ctx);
  scanForPress(state, ctx);
  if (m.press && U.daysBetween(m.press.date, state.currentDate) > PRESS_EXPIRE_DAYS) {
    m.rep = U.clamp(m.rep - 5, -100, 100);
    for (const p of U.rosterPlayers(state)) if (!p.isUser) U.moraleDelta(ctx.engine, p, -1);
    m.pressLog.unshift({ date: m.press.date, opp: m.press.opp, score: m.press.score, skipped: true });
    m.press = null;
  }
  if (m.pressLog.length > 10) m.pressLog.length = 10;
}

function onSeason(state) {
  const m = ensure(state);
  for (const plan of Object.values(m.plans)) if (plan.applied) revert(state, plan);
  m.plans = {};
}

function command(state, cmd, ctx) {
  const m = ensure(state);
  if (cmd.op === 'report' || cmd.op === 'plan') {
    const fx = nextFixture(state);
    if (!fx || fxKey(fx) !== cmd.key) return { ok: false, error: 'That match is no longer the next one.' };
    const oppId = fx.homeId === state.userTeamId ? fx.awayId : fx.homeId;
    const k = fxKey(fx);
    const plan = m.plans[k] || (m.plans[k] = { fixtureId: fx.id, oppId, oppName: (U.teamOf(state, oppId) || {}).name || '?', style: styleOf(state, oppId), report: false, plan: null, correct: false, applied: null });
    if (cmd.op === 'report') {
      if (plan.report) return { ok: true };
      const pay = U.spend(state, reportCost(state, fx));
      if (!pay.ok) return pay;
      plan.report = true;
      return { ok: true };
    }
    if (!PLANS.includes(cmd.plan)) return { ok: false, error: 'Unknown plan.' };
    if (plan.applied) revert(state, plan);
    plan.plan = cmd.plan;
    plan.correct = COUNTER[plan.style] === cmd.plan;
    if (U.daysBetween(state.currentDate, fx.date) <= 1) apply(state, plan);
    return { ok: true };
  }
  if (cmd.op === 'answer') {
    const press = m.press;
    if (!press || press.key !== cmd.key) return { ok: false, error: 'No press conference pending.' };
    const answers = Array.isArray(cmd.answers) ? cmd.answers.map((a) => U.clamp(Math.round(U.num(a)), 0, 2)) : [];
    if (answers.length !== press.questions.length) return { ok: false, error: 'Answer every question.' };
    const fx = applyPressEffects(state, press, answers, ctx);
    pushPressNews(state, press, answers, ctx);
    m.pressLog.unshift({ date: press.date, opp: press.opp, score: press.score, effects: fx });
    m.press = null;
    return { ok: true, effects: fx };
  }
  if (cmd.op === 'skip_press') {
    if (!m.press) return { ok: true };
    m.press.date = U.addDays(state.currentDate, -PRESS_EXPIRE_DAYS - 1);
    onTick(state, ctx);
    return { ok: true };
  }
  return { ok: false, error: 'Unknown matchday command.' };
}

// Real matches: a correct game plan drops the opposing bot one tier.
function wrapEngine(engine, api) {
  const orig = engine.botDifficultyFor;
  if (typeof orig !== 'function' || orig.__xtWrap) return;
  const wrapped = function xtBotDifficulty(state, fx, ...rest) {
    const tier = orig.call(this, state, fx, ...rest);
    try {
      const off = state && state.xtra && state.xtra.mods && state.xtra.mods.off;
      if (off && off.matchday) return tier;
      const m = state && state.xtra && state.xtra.matchday;
      const plan = m && fx && m.plans[fxKey(fx)];
      if (plan && plan.plan && plan.correct) {
        const i = TIERS.indexOf(tier);
        if (i > 0) { api.log('game plan: bot ' + tier + ' -> ' + TIERS[i - 1]); return TIERS[i - 1]; }
      }
    } catch { /* keep original */ }
    return tier;
  };
  wrapped.__xtWrap = true;
  engine.botDifficultyFor = wrapped;
}

function snapshot(state, ctx) {
  const m = ensure(state);
  const lang = L(ctx);
  const fx = nextFixture(state);
  let next = null;
  if (fx) {
    const oppId = fx.homeId === state.userTeamId ? fx.awayId : fx.homeId;
    const opp = U.teamOf(state, oppId);
    const plan = m.plans[fxKey(fx)] || null;
    const ev = eventOf(state, fx.eventId);
    const oppLine = lineupOf(state, opp).map((p) => ({ name: p.name, rating: p.rating, form: U.num(p.form), morale: Math.round(U.num(p.morale)) }));
    const key = oppLine.slice().sort((a, b) => b.rating + b.form - (a.rating + a.form))[0] || null;
    const h2h = state.hof && state.hof.clubs && state.hof.clubs[String(state.userTeamId)] && state.hof.clubs[String(state.userTeamId)].h2h[String(oppId)];
    next = {
      key: fxKey(fx),
      date: fx.date,
      inDays: U.daysBetween(state.currentDate, fx.date),
      oppId,
      opp: opp ? opp.name : '?',
      event: ev ? ev.name : '',
      bestOf: fx.bestOf || null,
      lineup: oppLine,
      form: recentForm(state, oppId),
      h2h: h2h ? { w: h2h.w, l: h2h.l } : null,
      cost: reportCost(state, fx),
      report: !!(plan && plan.report),
      style: plan && plan.report ? plan.style : null,
      keyPlayer: plan && plan.report && key ? key.name : null,
      plan: plan ? plan.plan : null,
      applied: !!(plan && plan.applied),
    };
  }
  let press = null;
  if (m.press) {
    const P = m.press;
    const params = { opp: P.opp, score: P.score, event: P.event || (lang === 'es' ? 'el torneo' : 'the event'), mvp: P.mvp, streak: P.streak };
    press = {
      key: P.key, opp: P.opp, score: P.score, won: P.won, event: P.event,
      expiresIn: Math.max(0, PRESS_EXPIRE_DAYS - U.daysBetween(P.date, state.currentDate)),
      questions: P.questions.map((q) => ({ id: q, text: fill(Q[q][lang][0], params), answers: [1, 2, 3].map((i) => fill(Q[q][lang][i], params)) })),
    };
  }
  return { next, press, rep: m.rep, history: m.history, pressLog: m.pressLog, counters: COUNTER };
}

module.exports = { id: ID, init, onDay, onTick, onSeason, command, snapshot, wrapEngine, _test: { nextFixture, styleOf, COUNTER, buildPress, Q } };
