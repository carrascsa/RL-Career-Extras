'use strict';
// Live caster (level 3): while you play a real match through the Hub, a small observer
// (src/live/observer.py, run with the Hub's own Python + RLBot) reports every play; this module turns
// the plays into lines for the two casters and sends them to the Hub window, which speaks them.
// Runs in the Hub main process. compose() is pure and tested on its own.
const fs = require('fs');
const path = require('path');
const U = require('./util');
const { buildEndScreen } = require('./broadcast-data');

const T = {
  en: {
    start: ['Welcome to {event}! {blue} against {orange}. Here we go!', 'We are live! {blue} versus {orange}, {event}. Let\'s go!', 'Game {g} of the series, {blue} and {orange}. Kickoff coming up!'],
    startSeries: ['{lead} lead the series {s}.', 'The series is tied {s}.'],
    startColor: ['Keep an eye on {star} in this one.', 'Fifty-fifties will decide this. Who wants it more?', 'I expect a fast start from {fav}.'],
    kickoff: ['Kickoff! {score}.', 'Back to the middle. {score}.', 'Here we go again, {score}.'],
    goal: ['{p} SCORES! {score}!', 'GOAL! {p}! {score}!', '{p} puts it away! {score}!', 'And {p} finds the net! {score}!'],
    goalNoName: ['GOAL for {team}! {score}!', '{team} score! {score}!'],
    AerialGoal: ['AERIAL GOAL! {p} takes it out of the sky! {score}!'],
    BicycleGoal: ['BICYCLE KICK! {p}, are you kidding me?! {score}!'],
    LongGoal: ['FROM DISTANCE! {p} with the long one! {score}!'],
    BackwardsGoal: ['BACKWARDS?! {p} scores going the wrong way! {score}!'],
    TurtleGoal: ['TURTLE GOAL! {p} on the roof! {score}!'],
    PoolShot: ['Pool shot from {p}! Off the other ball! {score}!'],
    BulletGoal: ['ROCKET from {p}! {score}!'],
    OvertimeGoal: ['{p} WINS IT IN OVERTIME! {team} take it!', 'OVERTIME WINNER! {p}! Unbelievable scenes!'],
    ownGoal: ['Oh no! Own goal from {p}! {score}.', 'That one goes in off {p}... own goal. {score}.'],
    speed: ['{kmh} kilometres an hour!', 'Clocked at {kmh}!'],
    assist: ['Lovely pass from {a}.', '{a} with the setup.', 'Great work from {a} to create that.'],
    brace: ['That\'s two for {p} this game.', '{p} is having a day.'],
    hattrick: ['HAT TRICK for {p}!'],
    leadColor: ['{team} have the lead now.', 'Big goal for {team}.', '{team} pull ahead!', 'Huge momentum swing.'],
    equalColor: ['And we are level!', 'All square again!'],
    save: ['Save by {p}!', 'Stopped by {p}!', '{p} keeps it out!'],
    epicSave: ['WHAT A SAVE from {p}!', 'INCREDIBLE save, {p}!', 'How did {p} stop that?!'],
    demo: ['{p} demolishes {v}!', 'BOOM! {p} takes out {v}!'],
    demoNoVictim: ['Demo from {p}!', '{p} with the demolition!'],
    AerialHit: ['{p} goes up for it!', 'Aerial from {p}!'],
    BicycleHit: ['Bicycle touch from {p}!'],
    JuggleHit: ['{p} juggling it!'],
    BulletHit: ['Huge hit from {p}!'],
    shot: ['Shot from {p}... {kmh}!', '{p} lets it rip!'],
    clock60: ['One minute left! {score}.', 'Sixty seconds to go, {score}.'],
    clock30: ['Thirty seconds! {score}.', 'Half a minute left!'],
    clock10: ['Ten seconds!', 'Final seconds!'],
    clockTied: ['All tied, anything can happen!'],
    clockClose: ['Can {trail} find an equaliser?', '{lead} just need to hold on!'],
    overtime: ['We are going to OVERTIME! Next goal wins!', 'OVERTIME! Sudden death!'],
    end: ['That\'s the game! {winner} win it {score}!', 'It\'s over! {winner} take the game, {score}!'],
    endMvp: ['Player of the game: {mvp}.', 'MVP for me: {mvp}.'],
    endSeries: ['{lead} now lead the series {s}.', 'The series is now tied {s}.', '{winner} win the series {s}!'],
    goalTalk: ['The rotation there was perfect.', 'That\'s what pressure does to a defense.', 'They just kept attacking, and it paid off.'],
    saveTalk: ['Great positioning on that save.', 'He read that perfectly.', 'That\'s why you stay back post.', 'The defense is holding firm.'],
    demoTalk: ['That demo opens up the whole field.', 'Smart demo, takes a man out of the play.', 'Physical play here, I love it.'],
  },
  es: {
    start: ['¡Bienvenidos a {event}! {blue} contra {orange}. ¡Vamos!', '¡Estamos en vivo! {blue} contra {orange}, {event}. ¡Arrancamos!', 'Game {g} de la serie, {blue} y {orange}. ¡Ya viene el kickoff!'],
    startSeries: ['{lead} gana la serie {s}.', 'La serie está empatada {s}.'],
    startColor: ['Ojo con {star} en este game.', 'Los cincuenta-cincuenta van a definir esto.', 'Espero un arranque fuerte de {fav}.'],
    kickoff: ['¡Kickoff! {score}.', 'Vuelven al medio. {score}.', 'Arrancamos de nuevo, {score}.'],
    goal: ['¡GOOOL de {p}! ¡{score}!', '¡GOL! ¡{p}! ¡{score}!', '¡{p} la manda a guardar! ¡{score}!', '¡Y {p} la mete! ¡{score}!'],
    goalNoName: ['¡GOL de {team}! ¡{score}!', '¡Gol de {team}! ¡{score}!'],
    AerialGoal: ['¡GOL AÉREO! ¡{p} la baja del cielo! ¡{score}!'],
    BicycleGoal: ['¡DE CHILENA! ¡{p}, no lo puedo creer! ¡{score}!'],
    LongGoal: ['¡DE MUY LEJOS! ¡{p} desde su campo! ¡{score}!'],
    BackwardsGoal: ['¡DE ESPALDAS! ¡{p} la mete al revés! ¡{score}!'],
    TurtleGoal: ['¡GOL TORTUGA! ¡{p} panza arriba! ¡{score}!'],
    PoolShot: ['¡Carambola de {p}! ¡{score}!'],
    BulletGoal: ['¡UN MISIL de {p}! ¡{score}!'],
    OvertimeGoal: ['¡{p} LO GANA EN EL ALARGUE! ¡Es para {team}!', '¡GOL DE ORO de {p}! ¡Increíble!'],
    ownGoal: ['¡No! ¡Gol en contra de {p}! {score}.', 'Se le metió a {p}... gol en contra. {score}.'],
    speed: ['¡A {kmh} kilómetros por hora!', '¡Salió a {kmh}!'],
    assist: ['Qué pase de {a}.', 'La asistencia es de {a}.', 'Gran trabajo de {a} en la jugada.'],
    brace: ['Ya van dos de {p} en este game.', '{p} está en un día enorme.'],
    hattrick: ['¡HAT TRICK de {p}!'],
    leadColor: ['{team} pasa adelante.', 'Gol importantísimo para {team}.', '¡{team} se escapa!', 'Cambio de momento enorme.'],
    equalColor: ['¡Y está empatado!', '¡Todo igual otra vez!'],
    save: ['¡Atajada de {p}!', '¡La para {p}!', '¡{p} la saca!'],
    epicSave: ['¡QUÉ ATAJADA de {p}!', '¡INCREÍBLE, {p}!', '¿¡Cómo la sacó {p}!?'],
    demo: ['¡{p} demuele a {v}!', '¡PUM! ¡{p} se lleva puesto a {v}!'],
    demoNoVictim: ['¡Demolición de {p}!', '¡{p} con la demo!'],
    AerialHit: ['¡{p} sale a buscarla por arriba!', '¡Aéreo de {p}!'],
    BicycleHit: ['¡Chilena de {p}!'],
    JuggleHit: ['¡{p} haciendo jueguito!'],
    BulletHit: ['¡Tremendo golpe de {p}!'],
    shot: ['Remate de {p}... ¡a {kmh}!', '¡{p} saca un cañonazo!'],
    clock60: ['¡Queda un minuto! {score}.', 'Sesenta segundos, {score}.'],
    clock30: ['¡Treinta segundos! {score}.', '¡Medio minuto!'],
    clock10: ['¡Diez segundos!', '¡Últimos segundos!'],
    clockTied: ['¡Empatados, puede pasar cualquier cosa!'],
    clockClose: ['¿Llegará el empate de {trail}?', '¡{lead} tiene que aguantar!'],
    overtime: ['¡Nos vamos al ALARGUE! ¡Gol de oro!', '¡ALARGUE! ¡Muerte súbita!'],
    end: ['¡Se terminó! ¡{winner} gana {score}!', '¡Final! ¡{winner} se queda con el game, {score}!'],
    endMvp: ['La figura del game: {mvp}.', 'Para mí el MVP es {mvp}.'],
    endSeries: ['{lead} ahora gana la serie {s}.', 'La serie queda empatada {s}.', '¡{winner} gana la serie {s}!'],
    goalTalk: ['La rotación ahí fue perfecta.', 'Eso es lo que hace la presión sobre una defensa.', 'Siguieron atacando y tuvo premio.'],
    saveTalk: ['Gran ubicación en esa atajada.', 'La leyó perfecto.', 'Por eso hay que quedarse en el segundo palo.', 'La defensa se mantiene firme.'],
    demoTalk: ['Esa demo abre toda la cancha.', 'Demo inteligente, saca a uno de la jugada.', 'Juego físico, me encanta.'],
  },
};

const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? p[k] : ''));

// Match context from the career + the Hub's own match spec (rlbot_match.json).
function matchContext(state, spec, players, lang) {
  const c = { blue: lang === 'es' ? 'Azul' : 'Blue', orange: lang === 'es' ? 'Naranja' : 'Orange', event: lang === 'es' ? 'el partido' : 'the match', game: 1, series: [0, 0], bestOf: 1, names: {}, star: null, fav: null };
  const userTeam = state && U.userTeam(state);
  const user = state && state.players.find((p) => p && p.isUser);
  const cars = (spec && Array.isArray(spec.cars)) ? spec.cars : [];
  for (const side of [0, 1]) {
    const club = (cars.find((x) => x && Number(x.team) === side && x.livery && x.livery.club) || {}).livery;
    let name = club && club.club;
    if (!name && cars.some((x) => x && x.type === 'human' && Number(x.team) === side) && userTeam) name = userTeam.name;
    if (!name && state) {
      const ids = (players || []).filter((p) => p.team === side && p.bot).map((p) => { const pl = state.players.find((q) => q && q.name === p.name); return pl ? pl.teamId : null; }).filter((x) => x != null);
      const t = ids.length ? U.teamOf(state, ids[0]) : null;
      if (t) name = t.name;
    }
    if (name) c[side ? 'orange' : 'blue'] = name;
  }
  // the human in the car is the career's user player
  for (const p of players || []) c.names[p.name] = !p.bot && user ? user.name : p.name;
  // fixture: event, game number and series score
  const fx = state && state.pendingMatch != null ? (state.fixtures || []).find((f) => f && f.id === Number(state.pendingMatch)) : null;
  if (fx) {
    const ev = (state.events || []).find((e) => e && e.id === fx.eventId);
    if (ev) c.event = ev.name;
    c.bestOf = Number(fx.bestOf) || 1;
    const games = (fx.games || []).filter((g) => g && (g.homeGoals != null));
    c.game = games.length + 1;
    let hw = 0; let aw = 0;
    for (const g of games) { if (U.num(g.homeGoals) > U.num(g.awayGoals)) hw++; else aw++; }
    const home = U.teamOf(state, fx.homeId);
    const blueIsHome = home && home.name === c.blue;
    c.series = blueIsHome || !home ? [hw, aw] : [aw, hw];
  }
  // star: best-rated bot
  if (state) {
    const rated = (players || []).map((p) => ({ p, pl: state.players.find((q) => q && q.name === p.name) })).filter((x) => x.pl).sort((a, b) => U.num(b.pl.rating) - U.num(a.pl.rating));
    if (rated[0]) c.star = rated[0].p.name;
    const str = [0, 1].map((side) => { const r = rated.filter((x) => x.p.team === side); return r.length ? r.reduce((s, x) => s + U.num(x.pl.rating), 0) / r.length : 0; });
    c.fav = str[0] >= str[1] ? c.blue : c.orange;
  }
  return c;
}

function makeComposer(lang, rng) {
  const L = T[lang] || T.en;
  const r = rng || U.rng('live|' + Date.now());
  const recent = {};
  const pick = (k) => {
    const arr = L[k];
    if (!arr) return '';
    const used = recent[k] || (recent[k] = []);
    let free = arr.map((_, i) => i).filter((i) => !used.includes(i));
    if (!free.length) { used.length = 0; free = arr.map((_, i) => i); }
    const i = r.pick(free);
    used.push(i);
    if (used.length > Math.max(1, arr.length - 1)) used.shift();
    return arr[i];
  };
  const S = { ctx: null, goals: {} };
  const nm = (n) => (S.ctx && S.ctx.names[n]) || n || '';
  const teamName = (side) => (S.ctx ? (side ? S.ctx.orange : S.ctx.blue) : side ? 'Orange' : 'Blue');
  const sc = (s) => (s ? `${s[0]}-${s[1]}` : '');
  // clip: the pre-recorded pro-voice clips (voice/manifest.json) that stand in for this line, played in order
  const line = (who, text, pri, kind, clip) => (clip ? { who, text, pri, kind, clip } : { who, text, pri, kind });
  const scoreClip = (s) => (s ? `s${Math.max(s[0], s[1])}-${Math.min(s[0], s[1])}` : null);
  const nameClip = (n) => 'name:' + String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const clips = (...k) => k.filter(Boolean);

  // pri: 3 = must say (interrupts), 2 = important, 1 = flavour (dropped if late)
  function compose(ev, ctxNow) {
    const out = [];
    switch (ev.k) {
      case 'roster':
        S.ctx = ctxNow;
        S.goals = {};
        break;
      case 'start': {
        S.goals = {};
        const c = S.ctx || {};
        out.push(line('pbp', fill(pick('start'), { event: c.event, blue: c.blue, orange: c.orange, g: c.game || 1 }), 3, 'start', clips('start')));
        if (c.bestOf > 1 && c.game > 1) {
          const [a, b] = c.series;
          out.push(line('pbp', a === b ? fill(L.startSeries[1], { s: `${a}-${b}` }) : fill(L.startSeries[0], { lead: a > b ? c.blue : c.orange, s: `${Math.max(a, b)}-${Math.min(a, b)}` }), 2, 'series'));
        }
        if (c.star && r.chance(0.7)) out.push(line('color', fill(pick('startColor'), { star: nm(c.star), fav: c.fav || c.blue }), 1, 'color', clips('startColor')));
        break;
      }
      case 'kickoff':
        if (ev.ot) break;
        out.push(line('pbp', fill(pick('kickoff'), { score: sc(ev.score) }), 1, 'kickoff', clips('kickoff', scoreClip(ev.score))));
        break;
      case 'goal': {
        const p = nm(ev.scorer);
        const team = teamName(ev.team != null ? ev.team : 0);
        const score = sc(ev.score);
        const tags = ev.tags || [];
        let text;
        let clip;
        if (ev.own && p) { text = fill(pick('ownGoal'), { p, score }); clip = clips('ownGoal', scoreClip(ev.score)); }
        else if (ev.ot || tags.includes('OvertimeGoal')) { text = fill(pick('OvertimeGoal'), { p: p || team, team }); clip = clips('OvertimeGoal', p && nameClip(p) + '?'); }
        else {
          const special = ['BicycleGoal', 'TurtleGoal', 'BackwardsGoal', 'AerialGoal', 'PoolShot', 'LongGoal', 'BulletGoal'].find((k) => tags.includes(k));
          if (special && p) text = fill(pick(special), { p, score });
          else if (p) text = fill(pick('goal'), { p, score });
          else text = fill(pick('goalNoName'), { team, score });
          // a named call for our own players when one was recorded, else the generic shout; then the score
          // the shout, the scorer's name ("name:x?" = only when that player was recorded), the score
          // a few players have a full recorded call ("GOAL FROM ZEN!") that replaces shout + name;
          // "a|b" = a when it was recorded, else b
          const full = p && !special ? nameClip(p).replace(/^name:/, 'goalcall:') + '|goal' : null;
          clip = clips(full || special || 'goal', p && nameClip(p) + '?', scoreClip(ev.score));
        }
        if (U.num(ev.speed) >= 100 && !ev.own) text += ' ' + fill(pick('speed'), { kmh: ev.speed });
        out.push(line('pbp', text, 3, 'goal', clip));
        if (p && !ev.own) {
          S.goals[ev.scorer] = (S.goals[ev.scorer] || 0) + 1;
          if (tags.includes('HatTrick') || S.goals[ev.scorer] === 3) out.push(line('pbp', fill(pick('hattrick'), { p }), 2, 'color', clips('hattrick', nameClip(p) + '?')));
          else if (S.goals[ev.scorer] === 2) out.push(line('color', fill(pick('brace'), { p }), 1, 'color', clips('brace')));
        }
        if (ev.assist) out.push(line('color', fill(pick('assist'), { a: nm(ev.assist) }), 1, 'color', clips('assist')));
        else if (!ev.own && !ev.ot && r.chance(0.35)) out.push(line('color', pick('goalTalk'), 1, 'color', clips('goalTalk')));
        else if (ev.score && !ev.ot) {
          const [a, b] = ev.score;
          if (a === b) out.push(line('color', pick('equalColor'), 1, 'color', clips('equalColor')));
          else if (Math.abs(a - b) === 1 && r.chance(0.6)) out.push(line('color', fill(pick('leadColor'), { team: teamName(a > b ? 0 : 1) }), 1, 'color', clips('leadColor')));
        }
        break;
      }
      case 'save':
        out.push(line('pbp', fill(pick(ev.epic ? 'epicSave' : 'save'), { p: nm(ev.name) }), ev.epic ? 2 : 1, 'save', ev.epic ? clips('epicSave', nameClip(nm(ev.name)) + '?') : clips('save')));
        if (ev.epic && r.chance(0.4)) out.push(line('color', pick('saveTalk'), 1, 'color', clips('saveTalk')));
        break;
      case 'demo':
        out.push(line('pbp', ev.victim ? fill(pick('demo'), { p: nm(ev.name), v: nm(ev.victim) }) : fill(pick('demoNoVictim'), { p: nm(ev.name) }), 1, 'demo', clips('demo', nameClip(nm(ev.name)) + '?')));
        if (r.chance(0.25)) out.push(line('color', pick('demoTalk'), 1, 'color', clips('demoTalk')));
        break;
      case 'hit':
        if (L[ev.kind]) out.push(line('pbp', fill(pick(ev.kind), { p: nm(ev.name) }), 1, 'hit', clips(ev.kind)));
        break;
      case 'shot':
        out.push(line('pbp', fill(pick('shot'), { p: nm(ev.name), kmh: ev.speed }), 1, 'shot', clips('shot')));
        break;
      case 'clock': {
        const [a, b] = ev.score || [0, 0];
        out.push(line('pbp', fill(pick('clock' + ev.left), { score: sc(ev.score) }), 2, 'clock', clips('clock' + ev.left, ev.left > 10 ? scoreClip(ev.score) : null)));
        if (ev.left <= 30) {
          if (a === b) out.push(line('color', pick('clockTied'), 1, 'color', clips('clockTied')));
          else if (Math.abs(a - b) === 1) out.push(line('color', fill(pick('clockClose'), { trail: teamName(a < b ? 0 : 1), lead: teamName(a > b ? 0 : 1) }), 1, 'color', clips('clockClose')));
        }
        break;
      }
      case 'overtime':
        out.push(line('pbp', pick('overtime'), 3, 'overtime', clips('overtime')));
        break;
      case 'end': {
        const [a, b] = ev.score || [0, 0];
        if (a === b) break;
        const wSide = a > b ? 0 : 1;
        const winner = teamName(wSide);
        out.push(line('pbp', fill(pick('end'), { winner, score: `${Math.max(a, b)}-${Math.min(a, b)}` }), 3, 'end', clips('end', scoreClip(ev.score))));
        if (ev.mvp) out.push(line('color', fill(pick('endMvp'), { mvp: nm(ev.mvp) }), 2, 'color', clips('endMvp', nameClip(nm(ev.mvp)) + '?')));
        const c = S.ctx;
        if (c && c.bestOf > 1) {
          const s = c.series.slice();
          s[wSide]++;
          const need = Math.ceil(c.bestOf / 2);
          const lead = s[0] === s[1] ? null : s[0] > s[1] ? 0 : 1;
          const str = `${Math.max(s[0], s[1])}-${Math.min(s[0], s[1])}`;
          if (lead != null && s[lead] >= need) out.push(line('pbp', fill(L.endSeries[2], { winner: teamName(lead), s: str }), 3, 'series', clips('endSeriesWin')));
          else if (lead == null) out.push(line('pbp', fill(L.endSeries[1], { s: str }), 2, 'series', clips('endSeriesGo')));
          else out.push(line('pbp', fill(L.endSeries[0], { lead: teamName(lead), s: str }), 2, 'series', clips('endSeriesGo')));
        }
        break;
      }
      default:
        break;
    }
    return out;
  }
  return { compose, state: S };
}

// ---------- process manager (Hub main process only) ----------
function createLive(opts) {
  const log = opts.log || (() => {});
  const getState = opts.getState || (() => null);
  const send = opts.send || (() => {});
  const python = opts.python;
  const script = path.join(__dirname, 'live', 'observer.py');
  const specFile = path.join(process.env.APPDATA || '', 'rl-career-hub', 'rlbot_match.json');
  const readSpec = opts.readSpec || (() => JSON.parse(fs.readFileSync(specFile, 'utf8')));
  let child = null;
  let buf = '';
  let composer = null;
  let lastPlayers = [];
  let lang = 'en';
  let backoff = 2000;
  let lastGoal = null;
  let matchCtx = null;
  let stopped = false;
  let timer = null;

  const settings = () => {
    const st = getState();
    const c = st && st.xtra && st.xtra.caster;
    const on = !(st && st.xtra && st.xtra.mods && st.xtra.mods.off && st.xtra.mods.off.caster);
    return { live: on && !(c && c.live === false), broadcast: on && !(c && c.broadcast === false), lang: c && (c.lang === 'es' || c.lang === 'en') ? c.lang : opts.lang() };
  };

  // where the live game stands, for "simulate the rest" (Club Life / Caster)
  function track(ev) {
    try {
      const st = getState();
      if (!st) return;
      const fx = st.pendingMatch != null ? (st.fixtures || []).find((f) => f && f.id === Number(st.pendingMatch)) : null;
      const home = fx ? U.teamOf(st, fx.homeId) : null;
      require('./matchsim-engine').liveUpdate(st, ev, { blueIsHome: !home || !matchCtx || home.name === matchCtx.blue });
    } catch (e) { log('matchsim track: ' + (e && e.message)); }
  }

  function onEvent(ev) {
    if (ev.k === 'hello' || ev.k === 'connected' || ev.k === 'disconnected') { log('live caster: ' + JSON.stringify(ev)); return; }
    if (ev.k === 'idle') { log('live caster: match left'); lastGoal = null; track(ev); if (opts.onMatch) opts.onMatch(false); send({ lang, event: 'idle', lines: [], unfinished: !!(ev.score && ev.remaining > 0) }); return; }
    const s = settings();
    // the Hub restarts the match for every game of a series: re-read game number and series score
    if (ev.k === 'roster') lastPlayers = ev.players || [];
    if (ev.k === 'roster' || ev.k === 'start') {
      let spec = null;
      try { spec = readSpec(); } catch { spec = null; }
      matchCtx = matchContext(getState(), spec, lastPlayers, s.lang);
    }
    track(ev);
    // performance mode follows the match: on when it starts, off when it ends or is left
    if (opts.onMatch) { if (ev.k === 'start' || ev.k === 'roster') opts.onMatch(true); else if (ev.k === 'end') opts.onMatch(false); }
    // broadcast screens after the game (series card + stat sheet), independent of the commentary
    if (ev.k === 'end' && s.broadcast && opts.onEnd) {
      try { opts.onEnd(buildEndScreen(getState(), matchCtx, ev, s.lang)); } catch (e) { log('broadcast data failed: ' + (e && e.message)); }
    }
    if (!s.live) return;
    // the same goal reported twice (a replay, a reconnect) is called once
    if (ev.k === 'start' || ev.k === 'roster') lastGoal = null;
    if (ev.k === 'goal') {
      const key = (ev.score || []).join('-');
      if (lastGoal && lastGoal.key === key && Date.now() - lastGoal.at < 20000) return;
      lastGoal = { key, at: Date.now() };
    }
    if (!composer || ev.k === 'roster' || lang !== s.lang) { lang = s.lang; composer = makeComposer(lang); }
    let ctxNow = null;
    if (ev.k === 'roster' || ev.k === 'start') {
      ctxNow = matchCtx;
      composer.state.ctx = ctxNow;
    }
    const lines = composer.compose(ev, ctxNow);
    const crowd = ['start', 'goal', 'save', 'clock', 'overtime', 'end'].includes(ev.k);
    if (lines.length || crowd) send({ lang, event: ev.k, score: ev.score || null, epic: !!ev.epic, left: ev.left || null, ot: !!ev.ot, lines, blue: composer.state.ctx && composer.state.ctx.blue, orange: composer.state.ctx && composer.state.ctx.orange });
  }

  function spawn() {
    if (stopped || child) return;
    if (!python || !fs.existsSync(python) || !fs.existsSync(script)) { log('live caster: python or observer missing (' + python + ')'); return; }
    if (!settings().live) { timer = setTimeout(spawn, 5000); return; }
    const { spawn: sp } = require('child_process');
    child = sp(python, [script, '--parent', String(process.pid)], { cwd: path.dirname(script), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    log('live caster: observer started (pid ' + child.pid + ')');
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const ln = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!ln) continue;
        try { onEvent(JSON.parse(ln)); } catch (e) { log('live caster: bad line ' + ln.slice(0, 120) + ' ' + e.message); }
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => log('live caster stderr: ' + String(d).slice(0, 300)));
    child.on('exit', (code) => {
      log('live caster: observer exited (' + code + ')');
      child = null;
      buf = '';
      if (!stopped) { timer = setTimeout(spawn, backoff); backoff = Math.min(60000, backoff * 2); }
    });
  }

  return {
    start() { stopped = false; spawn(); },
    stop() { stopped = true; if (timer) clearTimeout(timer); if (child) { try { child.kill(); } catch { /* ignore */ } } },
    _onEvent: onEvent,
  };
}

module.exports = { T, matchContext, makeComposer, createLive };
