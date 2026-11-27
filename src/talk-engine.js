'use strict';
// Talks: start a conversation with any player (or, in player careers, your teammates and the coach).
// Each player has a hidden personality; how they answer depends on it, their morale, your relationship
// and how often you have been bothering them. Some answer at length, some barely, some leave you on "seen".
const U = require('./util');

const ID = 'talk';
const PERS = ['chatty', 'reserved', 'moody', 'pro', 'joker', 'leader'];
const BASE = { chatty: 72, reserved: 47, moody: 52, pro: 58, joker: 64, leader: 62 };
const LIKES = {
  chatty: { checkin: 10, joke: 8, team: 6 }, reserved: { checkin: -6, joke: -10, rival: 6 }, moody: { praise: 10, demand: -15, joke: -4 },
  pro: { rival: 12, role: 8, joke: -8, demand: 4 }, joker: { joke: 18, checkin: 4, demand: -8 }, leader: { team: 14, rival: 8, demand: 6 },
};
const TOPICS = ['checkin', 'praise', 'demand', 'role', 'rival', 'team', 'future', 'joke'];
const COACH_TOPICS = ['minutes', 'feedback', 'rival'];
const LOG_MAX = 14;

// effects per topic and response: [morale, relationship]
const FX = {
  checkin: { full: [2, 3], short: [1, 1], seen: [0, -1], rude: [-1, -3] },
  praise: { full: [4, 4], short: [2, 2], seen: [1, 0], rude: [0, -2] },
  demand: { full: [-1, 1], short: [-2, -1], seen: [-2, -3], rude: [-4, -6] },
  role: { full: [2, 2], short: [1, 1], seen: [0, -1], rude: [-2, -4] },
  rival: { full: [1, 2], short: [0, 1], seen: [0, -1], rude: [-1, -3] },
  team: { full: [1, 3], short: [0, 1], seen: [0, -1], rude: [-1, -3] },
  future: { full: [2, 2], short: [0, 1], seen: [-1, -1], rude: [-3, -4] },
  joke: { full: [3, 4], short: [1, 1], seen: [0, -2], rude: [-2, -4] },
};

const ME = {
  checkin: { en: ['Hey {name}, how are you doing?', 'How are things, {name}? All good?', 'Got a minute, {name}? How are you feeling?'], es: ['Hola {name}, ¿cómo andás?', '¿Cómo va todo, {name}? ¿Todo bien?', '¿Tenés un minuto, {name}? ¿Cómo te sentís?'] },
  praise: { en: ['Great work lately, {name}. I see the effort.', '{name}, you were excellent. Keep it up.', 'Just wanted to say I am proud of how you are playing.'], es: ['Muy buen trabajo últimamente, {name}. Se nota el esfuerzo.', '{name}, estuviste excelente. Seguí así.', 'Solo quería decirte que estoy orgulloso de cómo estás jugando.'] },
  demand: { en: ['{name}, I need more from you. You know you can give more.', 'Your level has to go up, {name}. No excuses.', 'I expect more intensity in training, {name}.'], es: ['{name}, necesito más de vos. Sabés que podés dar más.', 'Tu nivel tiene que subir, {name}. Sin excusas.', 'Espero más intensidad en los entrenamientos, {name}.'] },
  role: { en: ['Let\'s talk about your role in the team, {name}.', 'How do you see your place in the squad right now?'], es: ['Hablemos de tu rol en el equipo, {name}.', '¿Cómo ves tu lugar en el plantel ahora?'] },
  rival: { en: ['What do you think about {opp}? Any read on how they play?', '{opp} is next. What should we expect?'], es: ['¿Qué pensás de {opp}? ¿Cómo creés que juegan?', 'Se viene {opp}. ¿Qué esperás de ellos?'] },
  team: { en: ['How is the mood in the squad?', 'Anything going on in the team I should know about?'], es: ['¿Cómo está el ambiente en el plantel?', '¿Pasa algo en el equipo que debería saber?'] },
  future: { en: ['How do you see your future here, {name}?', 'Are you happy with your situation at the club?'], es: ['¿Cómo ves tu futuro acá, {name}?', '¿Estás contento con tu situación en el club?'] },
  joke: { en: ['Did you see that whiff in scrims yesterday? Still laughing.', 'Rumour is you lost a 1v1 to the analyst again.', 'Who keeps stealing the good chair in the gaming house?'], es: ['¿Viste el whiff de ayer en las scrims? Todavía me río.', 'Dicen que perdiste otro 1v1 contra el analista.', '¿Quién se sigue robando la silla buena del gaming house?'] },
  minutes: { en: ['Coach, what do I need to do to play more?'], es: ['Coach, ¿qué tengo que hacer para jugar más?'] },
  feedback: { en: ['Coach, any feedback on my game?'], es: ['Coach, ¿alguna devolución sobre mi juego?'] },
};

// Player replies. {low}: low-morale teammate, {mate}: friend, {style}: rival style read.
const R = {
  checkin: {
    good: { en: ['Honestly? Feeling great. The team is clicking and I am enjoying every scrim.', 'All good, boss! Sleeping well, playing well. Can\'t ask for more.', 'Really good. I think my mechanics are at their best right now.'], es: ['¿Sinceramente? Me siento genial. El equipo está conectado y disfruto cada scrim.', '¡Todo bien, jefe! Duermo bien, juego bien. No puedo pedir más.', 'Muy bien. Creo que mis mecánicas están en su mejor momento.'] },
    meh: { en: ['I\'m alright. Bit tired, but nothing serious.', 'Could be better, could be worse. Working through it.', 'Fine. Just trying to find my rhythm again.'], es: ['Bien, un poco cansado pero nada grave.', 'Podría estar mejor, podría estar peor. Le estoy metiendo.', 'Bien. Tratando de encontrar el ritmo de nuevo.'] },
    bad: { en: ['Not great, to be honest. I feel like nothing I do is working.', 'Struggling a bit. My head isn\'t fully in it lately.', 'Rough week. I\'ll get through it, but it\'s been hard.'], es: ['No muy bien, la verdad. Siento que nada de lo que hago sale.', 'Me está costando. La cabeza no está del todo en el juego.', 'Semana difícil. Voy a salir, pero está siendo duro.'] },
    short: { en: ['good', 'fine, you?', 'all good', 'ok'], es: ['bien', 'bien, ¿vos?', 'todo bien', 'ok'] },
  },
  praise: {
    full: { en: ['Thanks, boss, that means a lot. I\'ve been putting in extra hours.', 'Appreciate it! The guys made it easy for me, honestly.', 'Thank you. I want to keep this level and help the team win something big.'], es: ['Gracias, jefe, significa mucho. Le vengo metiendo horas extra.', '¡Gracias! Los chicos me lo hicieron fácil, la verdad.', 'Gracias. Quiero mantener este nivel y ayudar a ganar algo grande.'] },
    fake: { en: ['Thanks... although I know I haven\'t been at my best.', 'Kind of you, but I don\'t feel like I deserve it right now.'], es: ['Gracias... aunque sé que no vengo en mi mejor momento.', 'Buena onda, pero no siento que lo merezca ahora.'] },
    short: { en: ['thanks', 'ty boss', '🙏', 'appreciate it'], es: ['gracias', 'grax jefe', '🙏', 'se agradece'] },
  },
  demand: {
    full: { en: ['Fair. I know I can do better. I\'ll show you in the next scrims.', 'Understood. I\'ve been sloppy with rotations. I\'ll fix it.', 'You\'re right. No excuses. Watch me.'], es: ['Es justo. Sé que puedo dar más. Te lo voy a demostrar en las próximas scrims.', 'Entendido. Vengo desprolijo con las rotaciones. Lo voy a corregir.', 'Tenés razón. Sin excusas. Mirá lo que viene.'] },
    short: { en: ['ok', 'got it', 'fine'], es: ['ok', 'entendido', 'dale'] },
  },
  role: {
    starter: { en: ['I feel trusted. I like my role and I want to keep earning it.', 'Happy with it. I know what you expect from me in the three.'], es: ['Me siento con confianza. Me gusta mi rol y quiero seguir ganándomelo.', 'Contento. Sé lo que esperás de mí en el trío titular.'] },
    bench: { en: ['Honestly, I want more minutes. I think I\'m ready.', 'I get the decision, but sitting on the bench is hard. Give me a chance.'], es: ['Sinceramente, quiero más minutos. Creo que estoy listo.', 'Entiendo la decisión, pero estar en el banco cuesta. Dame una oportunidad.'] },
    short: { en: ['it\'s ok', 'fine with it', 'could be better'], es: ['está bien', 'tranqui', 'podría ser mejor'] },
  },
  rival: {
    full: { en: ['Watched their VODs. I think they play {style}. We should prepare for that.', 'From what I saw, {opp} are pretty {style}. Their key guy is the one to watch.', 'My read? {style}. If we get the first goal, they struggle.'], es: ['Vi sus VODs. Creo que juegan {style}. Deberíamos prepararnos para eso.', 'Por lo que vi, {opp} es bastante {style}. Hay que marcar a su figura.', '¿Mi lectura? {style}. Si metemos el primer gol, les cuesta.'] },
    short: { en: ['no idea tbh', 'they\'re ok', 'we can beat them'], es: ['ni idea la verdad', 'son buenos', 'les ganamos'] },
    none: { en: ['We don\'t have a match coming up, right? Ask me when we know the rival.'], es: ['No tenemos partido cerca, ¿no? Preguntame cuando sepamos el rival.'] },
  },
  team: {
    full: { en: ['Mood is decent. I get along really well with {mate}. I\'d keep an eye on {low}, though, he seems down.', 'Good vibes mostly. {low} has been quiet lately, maybe talk to him.', 'Honestly the group is tight. {mate} keeps everyone laughing. {low} looks a bit off.'], es: ['El ambiente está bien. Me llevo muy bien con {mate}. Yo le prestaría atención a {low}, lo veo bajoneado.', 'Buena onda en general. {low} está medio callado últimamente, quizás convenga hablar con él.', 'La verdad el grupo está unido. {mate} nos hace reír a todos. A {low} lo veo medio raro.'] },
    allgood: { en: ['Everyone seems happy. Best vibe I\'ve had in a team.'], es: ['Todos parecen contentos. La mejor onda que tuve en un equipo.'] },
    short: { en: ['all good', 'normal', 'fine I guess'], es: ['todo bien', 'normal', 'bien supongo'] },
  },
  future: {
    happy: { en: ['I see myself here for a long time. I want to win titles with this club.', 'Really happy. This project is the right place for me.'], es: ['Me veo acá por mucho tiempo. Quiero ganar títulos con este club.', 'Muy contento. Este proyecto es el lugar indicado para mí.'] },
    contract: { en: ['My contract is running out. I\'d like to talk about an extension soon.', 'I want to stay, but I need to know where I stand with the contract.'], es: ['Se me termina el contrato. Me gustaría hablar de una renovación pronto.', 'Quiero quedarme, pero necesito saber en qué estoy con el contrato.'] },
    out: { en: ['I\'ll be honest: I think it\'s time for something new.', 'I\'m not sure I fit here any more. I\'d consider offers.'], es: ['Te voy a ser sincero: creo que es momento de algo nuevo.', 'No sé si encajo más acá. Escucharía ofertas.'] },
    short: { en: ['we\'ll see', 'good for now', 'idk'], es: ['ya veremos', 'bien por ahora', 'nsé'] },
  },
  joke: {
    full: { en: ['HAHA that was the internet, I swear 😂', 'Excuse me?? The analyst is secretly GC 😭', 'It\'s not stealing if you leave it unattended 😏'], es: ['JAJAJA fue el internet, lo juro 😂', '¿¿Perdón?? El analista es GC en secreto 😭', 'No es robar si la dejás sola 😏'] },
    short: { en: ['lol', 'haha', '💀'], es: ['jaja', 'jajaj', '💀'] },
  },
  rude: { en: ['Can we not do this now?', 'Not in the mood, boss.', 'Is this really important?', 'Whatever.'], es: ['¿Podemos no hacer esto ahora?', 'No estoy de humor, jefe.', '¿Es realmente importante?', 'Como sea.'] },
  coach: {
    minutes_yes: { en: ['Keep this level and you\'ll get your chance. I\'m watching.'], es: ['Mantené este nivel y vas a tener tu oportunidad. Te estoy mirando.'] },
    minutes_no: { en: ['Right now the others are ahead of you. Work on your consistency.'], es: ['Ahora mismo los otros están por delante. Trabajá la regularidad.'] },
    minutes_starter: { en: ['You\'re starting. Focus on keeping your spot, not on minutes.'], es: ['Sos titular. Enfocate en mantener el lugar, no en los minutos.'] },
    feedback_good: { en: ['You\'ve been sharp. Keep the communication up in rotations.'], es: ['Venís muy fino. Mantené la comunicación en las rotaciones.'] },
    feedback_bad: { en: ['Too many risky challenges lately. Play simpler for a while.'], es: ['Demasiados challenges arriesgados últimamente. Jugá más simple un tiempo.'] },
    short: { en: ['Later, I\'m busy.', 'We\'ll talk after scrims.'], es: ['Después, estoy ocupado.', 'Hablamos después de las scrims.'] },
  },
};
const FLAVOR = {
  joker: { en: [' 😂', ' lol', ''], es: [' 😂', ' jaja', ''] },
  chatty: { en: [' Anyway, how are YOU doing?', ' Oh and the new chairs are great btw.', ''], es: [' Igual, ¿vos cómo estás?', ' Ah, y las sillas nuevas están buenísimas.', ''] },
  leader: { en: [' We\'ll get there together.', ''], es: [' Lo vamos a sacar entre todos.', ''] },
};
const STYLE_WORD = { en: { aggressive: 'aggressive', defensive: 'defensive', possession: 'possession-heavy' }, es: { aggressive: 'agresivo', defensive: 'defensivo', possession: 'de posesión' } };

function ensure(state) {
  const x = U.xstate(state);
  let t = x.talk;
  if (!t || typeof t !== 'object') t = x.talk = { rel: {}, log: {}, dates: {}, hints: {}, coach: [] };
  for (const k of ['rel', 'log', 'dates', 'hints']) if (!t[k] || typeof t[k] !== 'object') t[k] = {};
  if (!Array.isArray(t.coach)) t.coach = [];
  return t;
}

const L = (ctx) => (ctx && ctx.lang === 'es' ? 'es' : 'en');
function fill(s, p) { return String(s).replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? p[k] : '')); }
function personality(p) { return PERS[U.hashStr('pers|' + (p.name || '') + '|' + p.id) % PERS.length]; }

function matchday() { return require('./matchday-engine'); }

function squadInfo(state, p) {
  const t = U.userTeam(state);
  const mates = U.rosterPlayers(state).filter((x) => x.id !== p.id && !x.isUser);
  const low = mates.slice().sort((a, b) => U.num(a.morale) - U.num(b.morale))[0];
  const mate = mates.slice().sort((a, b) => (U.hashStr(p.id + '|' + a.id) % 100) - (U.hashStr(p.id + '|' + b.id) % 100))[0];
  return { t, mates, low, mate, starter: !!(t && (t.lineup || []).includes(p.id)) };
}

function decide(state, p, topic, r, t) {
  const pers = personality(p);
  const morale = U.num(p.morale == null ? 70 : p.morale);
  const rel = U.num(t.rel[p.id]);
  const recent = (t.dates[p.id] || []).filter((d) => U.daysBetween(d, state.currentDate) <= 3).length;
  let s = BASE[pers] + (Math.min(morale, 78) - 60) * 0.45 + rel * 0.3 - recent * 11 + ((LIKES[pers] || {})[topic] || 0);
  if (pers === 'moody') s += (morale - 60) * 0.4;
  s += (r() - 0.5) * 34;
  if (pers === 'moody' && r() < 0.05) return 'rude';
  if (s >= 60) return 'full';
  if (s >= 36) return 'short';
  if ((pers === 'moody' || morale < 35) && r() < 0.6) return 'rude';
  return 'seen';
}

function reply(state, p, topic, resp, r, ctx) {
  const lang = L(ctx);
  const pick = (o) => r.pick(o[lang]);
  const { low, mate, starter } = squadInfo(state, p);
  const params = { name: p.name, low: low ? low.name : '', mate: mate ? mate.name : '' };
  if (resp === 'seen') return null;
  if (resp === 'rude') return pick(R.rude);
  const T = R[topic];
  let text;
  let hint = null;
  if (topic === 'checkin') {
    if (resp === 'short') text = pick(T.short);
    else { const m = U.num(p.morale) + U.num(p.form) * 4; text = pick(m >= 70 ? T.good : m >= 45 ? T.meh : T.bad); }
  } else if (topic === 'praise') text = resp === 'short' ? pick(T.short) : pick(U.num(p.form) <= -2 ? T.fake : T.full);
  else if (topic === 'demand') text = resp === 'short' ? pick(T.short) : pick(T.full);
  else if (topic === 'role') text = resp === 'short' ? pick(T.short) : pick(starter ? T.starter : T.bench);
  else if (topic === 'rival') {
    const fx = matchday()._test.nextFixture(state);
    if (!fx) text = pick(T.none);
    else if (resp === 'short') text = pick(T.short);
    else {
      const oppId = fx.homeId === state.userTeamId ? fx.awayId : fx.homeId;
      const real = matchday()._test.styleOf(state, oppId);
      const acc = personality(p) === 'pro' || personality(p) === 'leader' ? 0.85 : 0.6;
      const styles = ['aggressive', 'defensive', 'possession'];
      const said = r() < acc ? real : r.pick(styles.filter((x) => x !== real));
      const opp = (U.teamOf(state, oppId) || {}).name || '?';
      params.opp = opp;
      params.style = STYLE_WORD[lang][said];
      text = pick(T.full);
      hint = { key: [fx.id, fx.date].join('|'), style: said, by: p.name, correct: said === real };
    }
  } else if (topic === 'team') {
    if (resp === 'short') text = pick(T.short);
    else text = pick(low && U.num(low.morale) < 55 ? T.full : T.allgood);
  } else if (topic === 'future') {
    if (resp === 'short') text = pick(T.short);
    else text = pick(p.wantsOut || U.num(p.morale) < 35 ? T.out : U.num(p.contractSeasons) <= 1 ? T.contract : T.happy);
  } else if (topic === 'joke') text = resp === 'short' ? pick(T.short) : pick(T.full);
  text = fill(text, params);
  const fl = FLAVOR[personality(p)];
  if (fl && resp === 'full') text += r.pick(fl[lang]);
  return { text, hint };
}

function talkTo(state, cmd, ctx) {
  const t = ensure(state);
  const p = U.playerOf(state, Number(cmd.pid));
  if (!p || p.teamId !== state.userTeamId || p.isUser) return { ok: false, error: 'Pick a player from your squad.' };
  const topic = cmd.topic;
  if (!TOPICS.includes(topic)) return { ok: false, error: 'Unknown topic.' };
  if (!ctx.manager && (topic === 'demand' || topic === 'role' || topic === 'future')) return { ok: false, error: 'Only the manager can talk about that.' };
  const dates = t.dates[p.id] || (t.dates[p.id] = []);
  if (dates.includes(state.currentDate)) return { ok: false, error: ctx.lang === 'es' ? `Ya hablaste hoy con ${p.name}. Probá mañana.` : `You already talked to ${p.name} today. Try tomorrow.` };
  const r = U.rng(U.careerKey(state) + '|talk|' + p.id + '|' + state.currentDate + '|' + topic);
  const lang = L(ctx);
  const fx0 = matchday()._test.nextFixture(state);
  const oppName = fx0 ? ((U.teamOf(state, fx0.homeId === state.userTeamId ? fx0.awayId : fx0.homeId) || {}).name || '?') : (lang === 'es' ? 'el próximo rival' : 'our next opponent');
  const mine = fill(r.pick(ME[topic][lang]), { name: p.name, opp: oppName });
  const resp = decide(state, p, topic, r, t);
  const out = reply(state, p, topic, resp, r, ctx);
  let [mor, rel] = FX[topic][resp];
  if (topic === 'praise' && resp === 'full' && U.num(p.form) <= -2) { mor = 1; rel = 1; }
  if (topic === 'demand' && resp === 'full' && ['pro', 'leader'].includes(personality(p))) { mor = 1; rel = 2; }
  if (!ctx.manager) mor = Math.round(mor / 2);
  rel = Math.round(rel * 0.6);
  U.moraleDelta(ctx.engine, p, mor);
  t.rel[p.id] = U.clamp(U.num(t.rel[p.id]) + rel, -30, 30);
  dates.push(state.currentDate);
  if (dates.length > 8) dates.splice(0, dates.length - 8);
  const entry = { date: state.currentDate, topic, me: mine, them: out ? out.text : null, resp, mor, rel };
  const log = t.log[p.id] || (t.log[p.id] = []);
  log.push(entry);
  if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX);
  if (out && out.hint) t.hints[out.hint.key] = out.hint;
  if (ctx.manager) {
    U.chatPush(state, p.id, 'manager', mine);
    if (out) U.chatPush(state, p.id, 'player', out.text);
  }
  return { ok: true, resp, text: out ? out.text : null, mor, rel };
}

function talkCoach(state, cmd, ctx) {
  if (ctx.manager) return { ok: false, error: 'You are the coach.' };
  const t = ensure(state);
  const topic = cmd.topic;
  if (!COACH_TOPICS.includes(topic)) return { ok: false, error: 'Unknown topic.' };
  if (t.coach.some((c) => c.date === state.currentDate)) return { ok: false, error: ctx.lang === 'es' ? 'El coach ya te atendió hoy.' : 'The coach already gave you time today.' };
  const lang = L(ctx);
  const r = U.rng(U.careerKey(state) + '|coach|' + state.currentDate + '|' + topic);
  const me = U.playerOf(state, state.userPlayerId);
  const team = U.userTeam(state);
  const recent = t.coach.filter((c) => U.daysBetween(c.date, state.currentDate) <= 5).length;
  let text;
  let mor = 0;
  if (recent >= 2 && r() < 0.6) { text = r.pick(R.coach.short[lang]); mor = -1; }
  else if (topic === 'minutes') {
    const starter = team && me && (team.lineup || []).includes(me.id);
    const better = U.rosterPlayers(state).filter((p) => p.id !== (me && me.id) && U.num(p.rating) > U.num(me && me.rating)).length;
    text = r.pick((starter ? R.coach.minutes_starter : better <= 2 ? R.coach.minutes_yes : R.coach.minutes_no)[lang]);
    mor = starter ? 1 : better <= 2 ? 2 : -1;
  } else if (topic === 'feedback') {
    text = r.pick((U.num(me && me.form) >= 0 ? R.coach.feedback_good : R.coach.feedback_bad)[lang]);
    mor = 1;
  } else {
    const fx = matchday()._test.nextFixture(state);
    if (!fx) text = r.pick(R.rival.none[lang]);
    else {
      const oppId = fx.homeId === state.userTeamId ? fx.awayId : fx.homeId;
      const style = matchday()._test.styleOf(state, oppId);
      text = fill(r.pick(R.rival.full[lang]), { opp: (U.teamOf(state, oppId) || {}).name || '?', style: STYLE_WORD[lang][style] });
      t.hints[[fx.id, fx.date].join('|')] = { key: [fx.id, fx.date].join('|'), style, by: 'Coach', correct: true };
    }
    mor = 1;
  }
  if (me) U.moraleDelta(ctx.engine, me, mor);
  t.coach.push({ date: state.currentDate, topic, me: ME[topic] ? r.pick(ME[topic][lang]) : '', them: text });
  if (t.coach.length > LOG_MAX) t.coach.splice(0, t.coach.length - LOG_MAX);
  return { ok: true, text, mor };
}

function command(state, cmd, ctx) {
  if (cmd.op === 'talk') return talkTo(state, cmd, ctx);
  if (cmd.op === 'coach') return talkCoach(state, cmd, ctx);
  return { ok: false, error: 'Unknown talk command.' };
}

function init(state) { ensure(state); }
// relationships drift back toward neutral every week, so one good (or bad) run does not lock a player in
function onDay(state, day) {
  if (U.weekday(day) !== 1) return;
  const t = ensure(state);
  for (const k of Object.keys(t.rel)) t.rel[k] = Math.round(U.num(t.rel[k]) * 0.85);
}
function onSeason(state) {
  const t = ensure(state);
  for (const k of Object.keys(t.rel)) t.rel[k] = Math.round(U.num(t.rel[k]) * 0.7);
  t.hints = {};
}

function snapshot(state, ctx) {
  const t = ensure(state);
  const team = U.userTeam(state);
  const fx = matchday()._test.nextFixture(state);
  const hint = fx ? t.hints[[fx.id, fx.date].join('|')] || null : null;
  return {
    manager: ctx.manager,
    topics: ctx.manager ? TOPICS : TOPICS.filter((x) => !['demand', 'role', 'future'].includes(x)),
    coachTopics: ctx.manager ? [] : COACH_TOPICS,
    players: U.rosterPlayers(state).filter((p) => !p.isUser).map((p) => ({
      id: p.id, name: p.name, morale: Math.round(U.num(p.morale)), rel: U.num(t.rel[p.id]), starter: !!(team && (team.lineup || []).includes(p.id)),
      talkedToday: (t.dates[p.id] || []).includes(state.currentDate), absent: !!p.absence,
      known: (t.log[p.id] || []).length >= 3 ? personality(p) : null,
      log: (t.log[p.id] || []).slice(-8),
    })),
    coach: t.coach.slice(-8),
    hint: hint ? { style: hint.style, by: hint.by } : null,
  };
}

module.exports = { id: ID, TOPICS, init, onSeason, onDay, command, snapshot, _test: { personality, decide, ensure } };
