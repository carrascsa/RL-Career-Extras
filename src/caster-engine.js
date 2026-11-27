'use strict';
// Caster: two original casters call every series your club plays (and the big finals) from the
// Hub's own game data — goals and scorers, saves, shots, demos, overtime, series score and MVP.
// The Hub does not store when each goal happened, so the goal order and clock are reconstructed
// (deterministically) to fit the final score. The renderer plays the script with a scoreboard and
// reads it aloud with the system voices.
const U = require('./util');

const ID = 'caster';
const KEEP = 12;

const CASTERS = {
  pbp: { name: 'Max "Turbo" Reyes', role: { en: 'play-by-play', es: 'relator' } },
  color: { name: 'Leo "Nova" Vos', role: { en: 'analyst', es: 'comentarista' } },
};

const L = {
  en: {
    open: ['Welcome to {event}! {home} against {away}, best of {bo}. This is going to be a good one.', 'We are live from {event}! {home} and {away}, first to {need}. Let\'s go!', 'Hello everyone and welcome to {event}. {home} versus {away}, a best of {bo}!'],
    openColor: ['{fav} come in as favourites, but {dog} have nothing to lose.', 'Keep an eye on {star}. Everything goes through {star} for {starTeam}.', 'The key here is the midfield. Whoever wins the fifty-fifties wins the series.', 'I\'ve watched a lot of {home} lately and the rotation has been beautiful.'],
    rivalry: ['And there is history here. These two do NOT like each other.', 'Add the drama on Y this week and you have a proper grudge match.'],
    gameStart: ['Game {n}! Three, two, one... kickoff!', 'Here we go, game {n}. Kickoff!', 'Game {n} is underway!'],
    gameStartLate: ['Game {n}, and the pressure is ON. {lead} lead the series {s}.', 'Game {n}. {lead} are {left} away from closing it out!'],
    goal: ['{p} SCORES! {score}!', 'GOAL! {p} with the finish! {score}!', 'And {p} buries it! {score}!', 'Oh, what a goal from {p}! {score}!', '{p} puts it in the back of the net! {score}!'],
    goalBig: ['{p} again! That\'s {g} for {p} this game! {score}!', '{p} is on fire! Number {g}! {score}!'],
    equal: ['{p} levels it! {score}!', 'All square thanks to {p}! {score}!', 'And {p} ties it up! {score}!'],
    goalColor: ['Lovely touch there from {a}.', 'The defense was caught ball-chasing on that one.', 'You can\'t give {p} that much space.', 'That\'s a perfect read off the wall.', 'Clinical. Absolutely clinical.', 'The keeper had no chance.'],
    save: ['Huge save from {p}!', 'DENIED by {p}!', '{p} with the save off the line!'],
    demo: ['{p} with the demo! Clearing the way.', 'Boom, demo from {p}!'],
    ot: ['We are going to OVERTIME! Next goal wins!', 'Overtime! Sudden death, here we go!'],
    otGoal: ['{p} WINS IT IN OVERTIME! {team} take game {n}!', 'OVERTIME WINNER from {p}! Unbelievable!'],
    lateGoal: ['With {clock} on the clock, {p} scores! {score}!'],
    gameEnd: ['That\'s game! {team} take game {n}, {score}.', 'Game {n} goes to {team}, {score}.'],
    seriesScore: ['{lead} lead the series {s}.', 'Series is {s}, {lead} in front.', 'And the series is tied {s}!'],
    gameColor: ['{star} has been the difference: {gt} and {svt} this game.', '{team} have to adjust. They\'re losing every kickoff.', 'Big {shots} shots for {team} that game. The pressure told.'],
    win: ['AND THAT IS IT! {team} win the series {s}!', '{team} close it out! {s}! What a performance!'],
    winUpset: ['UPSET! {team} beat {other} {s}! Nobody saw that coming!'],
    mvp: ['Your player of the series: {p}. {gt}, {at}, {svt}.', 'MVP has to be {p}. {gt} and {svt} across the series.'],
    outro: ['Thank you for watching. See you next time!', 'What a series. Thank you everyone!'],
    outroColor: ['{other} will be disappointed, but they\'ll learn from this.', 'That\'s the level we expect from {team}.'],
  },
  es: {
    open: ['¡Bienvenidos a {event}! {home} contra {away}, al mejor de {bo}. Esto promete.', '¡Estamos en vivo desde {event}! {home} y {away}, el primero en ganar {need} se lo lleva. ¡Vamos!', 'Hola a todos y bienvenidos a {event}. {home} contra {away}, ¡al mejor de {bo}!'],
    openColor: ['{fav} llega como favorito, pero {dog} no tiene nada que perder.', 'Ojo con {star}. Todo pasa por {star} en {starTeam}.', 'La clave va a estar en el medio. El que gane los cincuenta-cincuenta gana la serie.', 'Vengo viendo mucho a {home} y la rotación está siendo hermosa.'],
    rivalry: ['Y acá hay historia. Estos dos NO se quieren.', 'Sumale la pelea en Y de esta semana y tenemos un partido de revancha.'],
    gameStart: ['¡Game {n}! Tres, dos, uno... ¡kickoff!', 'Arrancamos el game {n}. ¡Kickoff!', '¡Empieza el game {n}!'],
    gameStartLate: ['Game {n}, y la presión está al máximo. {lead} gana la serie {s}.', 'Game {n}. ¡A {lead} le falta {left} para cerrarla!'],
    goal: ['¡GOL de {p}! ¡{score}!', '¡GOOOL! ¡Lo define {p}! ¡{score}!', '¡Y {p} la manda a guardar! ¡{score}!', '¡Pero qué golazo de {p}! ¡{score}!', '¡{p} la mete! ¡{score}!'],
    goalBig: ['¡Otra vez {p}! ¡Lleva {g} en este game! ¡{score}!', '¡{p} está intratable! ¡Ya van {g}! ¡{score}!'],
    equal: ['¡{p} lo empata! ¡{score}!', '¡Empata {p}! ¡Todo igual, {score}!', '¡Y {p} pone la igualdad! ¡{score}!'],
    goalColor: ['Qué buen toque de {a} en la jugada.', 'La defensa salió a perseguir la pelota y lo pagó.', 'No le podés dar tanto espacio a {p}.', 'Lectura perfecta de la pared.', 'Clínico. Absolutamente clínico.', 'El arquero no tuvo ninguna chance.'],
    save: ['¡Atajadón de {p}!', '¡La saca {p}!', '¡{p} la salva en la línea!'],
    demo: ['¡Demolición de {p}! Le abre el camino.', '¡Pum, demo de {p}!'],
    ot: ['¡Nos vamos al ALARGUE! ¡Gol de oro!', '¡Alargue! Muerte súbita, ¡vamos!'],
    otGoal: ['¡{p} LO GANA EN EL ALARGUE! ¡{team} se queda con el game {n}!', '¡GOL DE ORO de {p}! ¡Increíble!'],
    lateGoal: ['¡Con {clock} en el reloj, gol de {p}! ¡{score}!'],
    gameEnd: ['¡Se terminó! {team} se lleva el game {n}, {score}.', 'El game {n} es para {team}, {score}.'],
    seriesScore: ['{lead} va ganando la serie {s}.', 'La serie está {s}, adelante {lead}.', '¡Y la serie está empatada {s}!'],
    gameColor: ['{star} está marcando la diferencia: {gt} y {svt} en este game.', '{team} tiene que ajustar. Está perdiendo todos los kickoffs.', '{shots} tiros de {team} en ese game. La presión pesó.'],
    win: ['¡Y SE TERMINÓ! ¡{team} gana la serie {s}!', '¡{team} la cierra! ¡{s}! ¡Qué actuación!'],
    winUpset: ['¡BATACAZO! ¡{team} le gana a {other} {s}! ¡Nadie lo esperaba!'],
    mvp: ['La figura de la serie: {p}. {gt}, {at}, {svt}.', 'El MVP tiene que ser {p}. {gt} y {svt} en la serie.'],
    outro: ['Gracias por acompañarnos. ¡Hasta la próxima!', 'Qué serie. ¡Gracias a todos!'],
    outroColor: ['{other} se va a ir con bronca, pero va a aprender de esto.', 'Ese es el nivel que se espera de {team}.'],
  },
};

function ensure(state) {
  const x = U.xstate(state);
  let c = x.caster;
  if (!c || typeof c !== 'object') c = x.caster = { lang: null, voice: true, rate: 1.1, watched: [] };
  if (!Array.isArray(c.watched)) c.watched = [];
  return c;
}
const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? p[k] : ''));
const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function strength(state, t) {
  const ids = (t && (t.lineup && t.lineup.length ? t.lineup : t.playerIds)) || [];
  const ps = ids.slice(0, 3).map((id) => U.playerOf(state, id)).filter(Boolean);
  return ps.length ? ps.reduce((s, p) => s + U.num(p.rating), 0) / ps.length : 0;
}

function casterLang(state, ctx) {
  const c = ensure(state);
  return c.lang === 'es' || c.lang === 'en' ? c.lang : ctx.lang === 'es' ? 'es' : 'en';
}

// Interleave home/away goals so the final score is right; in overtime the winner scores last.
function goalOrder(g, r) {
  const hs = (g.homeScorers || []).slice(0, U.num(g.homeGoals));
  const as = (g.awayScorers || []).slice(0, U.num(g.awayGoals));
  while (hs.length < U.num(g.homeGoals)) hs.push(null);
  while (as.length < U.num(g.awayGoals)) as.push(null);
  const homeWon = U.num(g.homeGoals) > U.num(g.awayGoals);
  let last = null;
  if (g.overtime) last = homeWon ? { side: 'home', id: hs.pop() } : { side: 'away', id: as.pop() };
  // shuffle scorers within a side, then interleave randomly
  for (const arr of [hs, as]) for (let i = arr.length - 1; i > 0; i--) { const j = r.int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  const out = [];
  let h = 0; let a = 0;
  while (h < hs.length || a < as.length) {
    let side;
    if (h >= hs.length) side = 'away'; else if (a >= as.length) side = 'home';
    else side = r() < (hs.length - h) / (hs.length - h + as.length - a) ? 'home' : 'away';
    // in regulation of an OT game, keep it level at 0:00
    out.push({ side, id: side === 'home' ? hs[h++] : as[a++] });
  }
  if (last) out.push(last);
  return out;
}

function buildScript(state, fx, lang) {
  const T = L[lang];
  const r = U.rng(U.careerKey(state) + '|caster|' + fx.id + '|' + lang);
  const H = U.teamOf(state, fx.homeId) || { name: '?' };
  const A = U.teamOf(state, fx.awayId) || { name: '?' };
  const ev = (state.events || []).find((e) => e.id === fx.eventId);
  const eventName = ev ? ev.name : lang === 'es' ? 'el torneo' : 'the event';
  const bo = U.num(fx.bestOf) || fx.games.length;
  const need = Math.ceil(bo / 2);
  const lines = [];
  const say = (who, text, extra) => lines.push(Object.assign({ who, text }, extra || {}));
  // avoid repeating a line from the same pool until most of it has been used
  const recent = {};
  const pick = (k) => {
    const arr = T[k]; const used = recent[k] || (recent[k] = []);
    let free = arr.map((_, i) => i).filter((i) => !used.includes(i));
    if (!free.length) { used.length = 0; free = arr.map((_, i) => i); }
    const i = r.pick(free);
    used.push(i);
    if (used.length > Math.max(1, arr.length - 1)) used.shift();
    return arr[i];
  };
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const gt = (n) => (lang === 'es' ? plural(n, 'gol', 'goles') : plural(n, 'goal', 'goals'));
  const at = (n) => (lang === 'es' ? plural(n, 'asistencia', 'asistencias') : plural(n, 'assist', 'assists'));
  const svt = (n) => (lang === 'es' ? plural(n, 'atajada', 'atajadas') : plural(n, 'save', 'saves'));
  const nameOf = (id, side, g) => {
    const ln = (g[side === 'home' ? 'homeLines' : 'awayLines'] || []).find((l) => l.id === id);
    if (ln) return ln.name;
    const p = U.playerOf(state, id);
    return p ? p.name : side === 'home' ? H.name : A.name;
  };
  // series-wide stats
  const tot = {};
  for (const g of fx.games) for (const side of ['homeLines', 'awayLines']) for (const l of g[side] || []) {
    const o = tot[l.id] || (tot[l.id] = { name: l.name, side: side === 'homeLines' ? 'home' : 'away', goals: 0, assists: 0, saves: 0, points: 0 });
    o.goals += U.num(l.goals); o.assists += U.num(l.assists); o.saves += U.num(l.saves); o.points += U.num(l.points);
  }
  const sH = strength(state, H); const sA = strength(state, A);
  const fav = sH >= sA ? H : A; const dog = fav === H ? A : H;
  const starRow = Object.values(tot).sort((a, b) => b.points - a.points)[0];
  const star = starRow ? starRow.name : H.name;
  const starTeam = starRow && starRow.side === 'away' ? A.name : H.name;
  const P = { event: eventName, home: H.name, away: A.name, bo, need, fav: fav.name, dog: dog.name, star, starTeam };
  say('pbp', fill(pick('open'), P), { clock: '', score: [0, 0], series: [0, 0], game: 0 });
  say('color', fill(pick('openColor'), P));
  const feud = state.xtra && state.xtra.drama && state.xtra.drama.feud;
  const other = fx.homeId === state.userTeamId ? fx.awayId : fx.awayId === state.userTeamId ? fx.homeId : null;
  if (other != null && feud && feud.oppId === other) say('color', pick('rivalry'));

  let sh = 0; let sa = 0;
  fx.games.forEach((g, gi) => {
    const n = gi + 1;
    const lead = sh === sa ? null : sh > sa ? H.name : A.name;
    if (lead && Math.max(sh, sa) === need - 1) say('pbp', fill(pick('gameStartLate'), { n, lead, s: `${Math.max(sh, sa)}-${Math.min(sh, sa)}`, left: lang === 'es' ? 'un game' : 'one game' }), { clock: '5:00', score: [0, 0], series: [sh, sa], game: n });
    else say('pbp', fill(pick('gameStart'), { n }), { clock: '5:00', score: [0, 0], series: [sh, sa], game: n });
    const order = goalOrder(g, r);
    const reg = g.overtime ? order.slice(0, -1) : order;
    // clock: spread regulation goals over 300s, sorted descending
    const times = reg.map(() => r.int(4, 296)).sort((a, b) => b - a);
    let h = 0; let a = 0;
    const perGame = {};
    const saves = [...(g.homeLines || []).map((l) => ({ l, side: 'home' })), ...(g.awayLines || []).map((l) => ({ l, side: 'away' }))].filter((x) => U.num(x.l.saves) >= 2);
    const demos = [...(g.homeLines || []), ...(g.awayLines || [])].filter((l) => U.num(l.demos) >= 3);
    let saveSaid = false; let demoSaid = false;
    let prev = 300; // clock of the previous call (counts down)
    const between = (lo) => { const hi = prev - 1; const v = hi > lo + 1 ? r.int(lo + 1, hi) : hi; prev = v; return v; };
    reg.forEach((goal, i) => {
      // a save or demo call before some goals, always between the previous call and this goal
      if (!saveSaid && saves.length && r.chance(0.45) && prev - times[i] > 6) { const sv = r.pick(saves); saveSaid = true; say('pbp', fill(pick('save'), { p: sv.l.name }), { clock: clock(between(times[i] + 2)), score: [h, a], series: [sh, sa], game: n }); }
      if (!demoSaid && demos.length && r.chance(0.3) && prev - times[i] > 4) { demoSaid = true; say('pbp', fill(pick('demo'), { p: r.pick(demos).name }), { clock: clock(between(times[i] + 1)), score: [h, a], series: [sh, sa], game: n }); }
      prev = times[i];
      if (goal.side === 'home') h++; else a++;
      const p = nameOf(goal.id, goal.side, g);
      perGame[p] = (perGame[p] || 0) + 1;
      const score = `${h}-${a}`;
      let text;
      if (times[i] <= 20) text = fill(pick('lateGoal'), { p, clock: clock(times[i]), score });
      else if (perGame[p] >= 2 && r.chance(0.6)) text = fill(pick('goalBig'), { p, g: perGame[p], score });
      else if (h === a && h > 0 && r.chance(0.6)) text = fill(pick('equal'), { p, score });
      else text = fill(pick('goal'), { p, score });
      say('pbp', text, { clock: clock(times[i]), score: [h, a], series: [sh, sa], game: n, goal: goal.side });
      if (r.chance(0.35)) {
        const mates = (g[goal.side === 'home' ? 'homeLines' : 'awayLines'] || []).filter((l) => l.name !== p && U.num(l.assists) > 0);
        say('color', fill(pick('goalColor'), { p, a: mates.length ? r.pick(mates).name : p }));
      }
    });
    if (g.overtime) {
      say('pbp', pick('ot'), { clock: '0:00', score: [h, a], series: [sh, sa], game: n });
      const w = order[order.length - 1];
      if (w.side === 'home') h++; else a++;
      const team = w.side === 'home' ? H.name : A.name;
      say('pbp', fill(pick('otGoal'), { p: nameOf(w.id, w.side, g), team, n }), { clock: '+' + clock(r.int(5, 150)), score: [h, a], series: [sh, sa], game: n, goal: w.side });
    }
    const homeWon = U.num(g.homeGoals) > U.num(g.awayGoals);
    if (homeWon) sh++; else sa++;
    const team = homeWon ? H.name : A.name;
    const fs = `${Math.max(h, a)}-${Math.min(h, a)}`;
    if (!g.overtime) say('pbp', fill(pick('gameEnd'), { team, n, score: fs }), { clock: '0:00', score: [h, a], series: [sh, sa], game: n });
    const done = sh === need || sa === need || gi === fx.games.length - 1;
    if (!done) {
      const leadNow = sh === sa ? null : sh > sa ? H.name : A.name;
      const s = `${Math.max(sh, sa)}-${Math.min(sh, sa)}`;
      say('pbp', leadNow ? fill(T.seriesScore[r.int(0, 1)], { lead: leadNow, s }) : fill(T.seriesScore[2], { s }), { score: [h, a], series: [sh, sa], game: n });
      if (r.chance(0.5)) {
        const ls = [...(g.homeLines || []), ...(g.awayLines || [])].sort((x, y) => U.num(y.points) - U.num(x.points))[0];
        const k = r.int(0, 2);
        say('color', fill(T.gameColor[k], { star: ls ? ls.name : '', gt: gt(ls ? U.num(ls.goals) : 0), svt: svt(ls ? U.num(ls.saves) : 0), team: k === 1 ? (homeWon ? A.name : H.name) : team, shots: homeWon ? U.num(g.homeShots) : U.num(g.awayShots) }));
      }
    }
  });
  const homeWon = sh > sa;
  const W = homeWon ? H : A; const Lo = homeWon ? A : H;
  const s = `${Math.max(sh, sa)}-${Math.min(sh, sa)}`;
  const upset = strength(state, Lo) - strength(state, W) >= 3;
  say('pbp', fill(upset ? pick('winUpset') : pick('win'), { team: W.name, other: Lo.name, s }), { series: [sh, sa], final: true });
  const mvp = Object.values(tot).filter((o) => (o.side === 'home') === homeWon).sort((a, b) => b.points - a.points)[0];
  if (mvp) say('color', fill(pick('mvp'), { p: mvp.name, gt: gt(mvp.goals), at: at(mvp.assists), svt: svt(mvp.saves) }));
  say('color', fill(pick('outroColor'), { team: W.name, other: Lo.name }));
  say('pbp', pick('outro'));
  return { id: fx.id, home: H.name, away: A.name, homeAbbr: H.abbrev || '', awayAbbr: A.abbrev || '', colors: [(H.colors || [])[0] || '#3b82f6', (A.colors || [])[0] || '#f97316'], event: eventName, bestOf: bo, lang, lines };
}

function castable(state) {
  return (state.fixtures || []).filter((f) => f && f.played && (f.games || []).length && f.games.every((g) => g && g.homeLines)
    && (f.homeId === state.userTeamId || f.awayId === state.userTeamId || f.stage === 'final'))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)).slice(0, KEEP);
}

function command(state, cmd, ctx) {
  const c = ensure(state);
  if (cmd.op === 'script') {
    const fx = castable(state).find((f) => f.id === Number(cmd.id));
    if (!fx) return { ok: false, error: ctx.lang === 'es' ? 'No hay relato para esa serie.' : 'No broadcast for that series.' };
    if (!c.watched.includes(fx.id)) { c.watched.unshift(fx.id); c.watched.length = Math.min(c.watched.length, 40); }
    return { ok: true, script: buildScript(state, fx, casterLang(state, ctx)) };
  }
  if (cmd.op === 'settings') {
    if (cmd.lang !== undefined) c.lang = cmd.lang === 'es' || cmd.lang === 'en' ? cmd.lang : null;
    if (cmd.voice !== undefined) c.voice = !!cmd.voice;
    if (cmd.rate !== undefined) c.rate = U.clamp(Number(cmd.rate) || 1, 0.7, 1.6);
    if (cmd.live !== undefined) c.live = !!cmd.live;
    return { ok: true };
  }
  return { ok: false, error: 'Unknown caster command.' };
}

function snapshot(state, ctx) {
  const c = ensure(state);
  const watched = new Set(c.watched);
  const list = castable(state).map((f) => {
    const H = U.teamOf(state, f.homeId) || {}; const A = U.teamOf(state, f.awayId) || {};
    const ev = (state.events || []).find((e) => e.id === f.eventId);
    let hw = 0; let aw = 0;
    for (const g of f.games) { if (U.num(g.homeGoals) > U.num(g.awayGoals)) hw++; else aw++; }
    return { id: f.id, date: f.date, home: H.name || '?', away: A.name || '?', hw, aw, event: ev ? ev.name : '', stage: f.stage || '', mine: f.homeId === state.userTeamId || f.awayId === state.userTeamId, watched: watched.has(f.id) };
  });
  return { list, lang: c.lang, effLang: casterLang(state, ctx), voice: c.voice !== false, rate: Number(c.rate) || 1.1, live: c.live !== false, casters: CASTERS, unseen: list.filter((x) => x.mine && !x.watched && U.daysBetween(x.date, state.currentDate) <= 3).length };
}

module.exports = { id: ID, command, snapshot, _test: { buildScript, goalOrder, castable } };
