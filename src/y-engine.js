'use strict';
// Y (the Hub's social network) made livelier:
//  1) the Hub's most repeated player/club lines are swapped for fresh variants (same mood, same score);
//  2) fans, media and insiders react to your real results, streaks, the table and the transfer market.
// Other Extras modules (drama, prospects, orgs) post through U.yPost too.
const U = require('./util');

const ID = 'ysocial';
const RECENT = 120;          // posts checked for repeats
const FX_WINDOW = 4;         // days a played series can still get reactions

// ---------- fresh variants for the Hub's repeated lines ----------
const PLAYER = {
  grind: [
    'scrims went 9 games deep and i still want more 😤', 'aerial training until my hands stop working', 'new car hitbox who dis 🧪',
    'free play warriors, where you at', 'my coach said "rotate back" 47 times today and he was right every time', 'one more replay review and then sleep. maybe.',
    'grinding 1s at 3am is a lifestyle choice 🌙', 'today the ball listened to me. rare.', 'kickoff practice > sleep',
    'watching my own vods is a horror movie 💀', 'workshop maps, coffee, repeat ☕', 'reset ladder: 3 for 10. we cook tomorrow',
    'if you see me in casuals no you did not', 'the grind is quiet. the results won\'t be', 'muscle memory loading… 63% 🔄',
    'team dinner then back on the pc. no days off', 'tried a new camera setting for 4 minutes and went back. never again',
  ],
  win: [
    'that one felt good {score} ✅', 'boys showed up today 🔥', 'GG. on to the next', 'trust the process. {score}',
    'my teammates are actually cracked fr', 'clean. no notes. {score}', 'the comms were insane today 🗣️',
    'we needed that one. {score} 🙏', 'quiet confidence. loud results', 'W. sleep. repeat.', 'love playing with these two 🫶',
    'not our best but a W is a W', 'that last goal >>> 🚀', 'vod review is gonna be fun for once',
  ],
  loss: [
    'tough one. we learn and move {score}', 'not good enough today. on me', 'we go back to the lab 🧪',
    'gg to them, deserved', 'pain. that\'s it. that\'s the tweet', 'one bad series doesn\'t define us',
    'we\'ll be back. promise', 'i hate losing more than i love winning', 'need a long walk after that 🚶',
    'rough day at the office {score}', 'my rotation today was a crime scene 🚨', 'heads up. next one is ours',
  ],
  out: [
    'season\'s over for us. thanks for the support all year 💙', 'we fell short. it stings', 'time to reset and come back hungrier',
    'thank you to everyone who cheered. we owe you one', 'not the ending we wanted', 'this one will hurt for a while',
  ],
  window: [
    'my DMs are open 👀', 'exciting times ahead', 'big decisions coming', 'no comment 🤐', 'stay tuned 👀',
  ],
  signed: [
    'new chapter ✍️', 'ready to work. let\'s get it', 'happy to be here 🙌', 'can\'t wait to play in front of you all',
  ],
};
const CLUB_LOSS = [
  'Not the result we wanted. {score}.', 'We regroup and go again. {score}.', 'Tough series. Heads up. {score}',
  'Credit to the opponents. We\'ll be back. {score}', 'Lessons learned today. {score}', 'Not our day. Back to the drawing board.',
];
const CLUB_WIN = [
  'Job done. {score} ✅', 'What a performance. {score} 🔥', 'Another one. {score} 💪', 'Business as usual. {score}',
  'That\'s how we do it. {score} 🚀', 'Massive W. {score}', 'Huge series from the boys. {score} 👏',
];

// ---------- fan / media reactions ----------
const FAN_EN = {
  winStar: ['{p} is HIM. {g} goals in the series 🐐', 'give {p} a raise immediately', 'the ball owes {p} money or something 🔥',
    'if {p} isn\'t top 10 in the world i\'m deleting Y', 'i\'ve watched that {p} goal 40 times. still not over it', '{p} different breed fr'],
  winTeam: ['{t} looking scary right now 👀', '{t} {score}. not even close', 'nobody wants to play {t} right now', 'that {t} roster is a problem for everyone',
    'told y\'all {t} were legit', '{t} fans eating good tonight 🍽️'],
  streakW: ['{n} in a row for {t}. this is a run 🏃', '{t} haven\'t lost in {n} series. let that sink in', '{t} on a {n}-game heater 🔥🔥'],
  lossBlame: ['{p} was invisible today', 'bench {p} for one series, i\'m begging', '{p} whiffed more balls than they touched 💀',
    'whoever is coaching {t} needs to explain that draft', 'not {p} going for every ball again 😭', 'where was {p}??'],
  lossTeam: ['{t} {score}. embarrassing honestly', 'i\'m not even mad, i\'m disappointed. {t} 😔', '{t} fans we\'re used to it by now 🫠',
    'the {t} rebuild starts now apparently', 'yeah {t} need a roster move asap'],
  streakL: ['{n} losses in a row for {t}. something is broken', 'the manager has to go if {t} lose again', '{t} {n} straight Ls. pain'],
};
const FAN_ES = {
  winStar: ['{p} es OTRO NIVEL. {g} goles en la serie 🐐', 'subanle el sueldo a {p} ya', 'a {p} la pelota le debe plata 🔥',
    '{p} top 10 del mundo y no se discute', 'vi el gol de {p} 40 veces y sigo sin creerlo'],
  winTeam: ['{t} da miedo ahora mismo 👀', '{t} {score}. ni cerca', 'nadie quiere cruzarse con {t}', 'les dije que {t} iba en serio', 'hinchas de {t} comiendo bien hoy 🍽️'],
  streakW: ['{n} seguidas de {t}. esto es una racha 🏃', '{t} no pierde hace {n} series. impresionante', '{t} prendido fuego, {n} al hilo 🔥'],
  lossBlame: ['{p} no apareció hoy', 'banquen a {p} una serie, por favor', '{p} erró más de lo que tocó 💀', '¿dónde estaba {p}??', 'el DT de {t} tiene que explicar eso'],
  lossTeam: ['{t} {score}. una vergüenza', 'no estoy enojado, estoy decepcionado. {t} 😔', 'hinchas de {t} ya estamos acostumbrados 🫠', '{t} necesita un fichaje urgente'],
  streakL: ['{n} derrotas seguidas de {t}. algo está roto', 'si {t} pierde otra vez, que se vaya el DT', '{t} {n} al hilo perdiendo. dolor'],
};
const MEDIA = {
  statline: ['{p} ({t}) put up {g} goals, {a} assists and {s} saves in the {score} series vs {o} 📊', 'Statline of the day: {p} — {g}G {a}A {s}S vs {o} 🔥'],
  upset: ['UPSET ALERT 🚨 {t} take down {o} {score}', 'Nobody saw that coming: {t} beat {o} {score} 😱'],
  power: ['Power rankings this week:\n1. {a}\n2. {b}\n3. {c}\n4. {d}\n5. {e}', 'Top 5 teams in the world right now 📈\n1 {a} · 2 {b} · 3 {c} · 4 {d} · 5 {e}'],
  rumorOut: ['Sources: {p} is unhappy at {t} and open to a move 👀', 'Hearing {p} has asked {t} for clarity on the future. Situation to monitor.', 'Multiple orgs have called {t} about {p}, per sources 📞'],
  rumorFa: ['{p} is still a free agent and talking to several teams 📝', 'Don\'t sleep on free agent {p} — rated {r} and available right now'],
  meme: ['every RL pro after losing a game 5: "we learn from it" 😭', 'the 50/50 at the start of overtime is the most stressful thing in esports', 'POV: you\'re the third man and both teammates went for the same ball',
    'pros: "rotation is key"\nalso pros: double commit on every kickoff', 'Rocket League is the only sport where the goalkeeper is also the striker and the midfielder at the same time'],
};

function ensure(state) {
  const x = U.xstate(state);
  let y = x.ysocial;
  if (!y || typeof y !== 'object') y = x.ysocial = { lastId: 0, seenFx: [], rewritten: 0, posted: 0, lastWeekly: '' };
  if (!Array.isArray(y.seenFx)) y.seenFx = [];
  return y;
}

const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? p[k] : ''));
const clean = (s) => s.replace(/\s+([.✅])/g, '$1').replace(/\s{2,}/g, ' ').replace(/\s+$/, '').replace(/\.\s*\./g, '.');

function fanName(r) {
  const a = ['RL', 'rocket', 'flip', 'aerial', 'boost', 'demo', 'kickoff', 'turtle', 'whiff', 'ceiling', 'musty', 'flick', 'pinch', 'dribble'];
  const b = ['Enjoyer', 'Fan', 'Goblin', 'Andy', 'Merchant', 'Watcher', 'Truther', 'Hater', 'Lord', 'Kid', 'Gremlin', 'Analyst'];
  const n = r.pick(a) + (r.chance(0.5) ? '_' : '') + r.pick(b) + (r.chance(0.6) ? r.int(1, 999) : '');
  return r.chance(0.4) ? n.toLowerCase() : n;
}
function fanPost(state, r, text, opts) {
  return U.yPost(state, r, Object.assign({ kind: 'fan', name: fanName(r), followers: r.int(40, 3200), verified: false, text }, opts || {}));
}
function mediaPost(state, r, text, name, followers, hype) {
  return U.yPost(state, r, { kind: 'media', name: name || r.pick(['RL Insider', 'Octane Report', 'Boost Pad News', 'RLCS Highlights', 'Kickoff Weekly']), followers: followers || r.int(90000, 420000), verified: true, club: '', text, hype });
}

// ---------- 1) refresh repeated Hub lines ----------
function untouchable(p) {
  if (!p || p.xt || p.mine || p.own || p.replyTo != null || p.mention || p.viewer || p.gif || p.tone) return true;
  for (const k in p) if (k.startsWith('cp')) return true;
  return false;
}
function refresh(state, y, ctx) {
  const posts = state.social && Array.isArray(state.social.posts) ? state.social.posts : null;
  if (!posts || !posts.length) return;
  const maxId = posts.reduce((m, p) => Math.max(m, U.num(p && p.id)), 0);
  if (!y.lastId) { y.lastId = maxId; return; } // never rewrite history on install
  const fresh = posts.filter((p) => p && U.num(p.id) > y.lastId);
  y.lastId = Math.max(y.lastId, maxId);
  if (!fresh.length) return;
  const recent = posts.slice(0, RECENT);
  for (const p of fresh) {
    if (untouchable(p)) continue;
    const others = recent.filter((q) => q !== p).map((q) => q.text);
    const used = new Set(others);
    if (!used.has(p.text)) continue;
    const m = /(\d+)\s*-\s*(\d+)/.exec(p.text || '');
    const score = m ? m[1] + '-' + m[2] : '';
    let pool = null;
    if (p.kind === 'player' && PLAYER[p.ctx]) pool = PLAYER[p.ctx];
    else if (p.kind === 'club') {
      if (/not our day|back to work|go again|tough|regroup/i.test(p.text)) pool = CLUB_LOSS;
      else if (/job done|that is the way|that's the way|✅/i.test(p.text)) pool = CLUB_WIN;
    }
    if (!pool) continue;
    const r = U.rng(U.careerKey(state) + '|yref|' + p.id);
    const opts = pool.map((s) => clean(fill(s, { score }))).filter((s) => !used.has(s) && (score || !/\{score\}/.test(s)));
    if (!opts.length) continue;
    p.text = r.pick(opts);
    p.xtFresh = true;
    y.rewritten++;
  }
}

// ---------- 2) reactions to real results ----------
function seriesOf(fx) {
  let hw = 0; let aw = 0;
  const lines = {};
  for (const g of fx.games || []) {
    if (U.num(g.homeGoals) > U.num(g.awayGoals)) hw++; else aw++;
    for (const side of ['homeLines', 'awayLines']) for (const l of g[side] || []) {
      const o = lines[l.id] || (lines[l.id] = { id: l.id, name: l.name, side: side === 'homeLines' ? 'home' : 'away', goals: 0, assists: 0, saves: 0, points: 0 });
      o.goals += U.num(l.goals); o.assists += U.num(l.assists); o.saves += U.num(l.saves); o.points += U.num(l.points);
    }
  }
  return { hw, aw, lines: Object.values(lines) };
}

function streakOf(state, teamId) {
  const fx = (state.fixtures || []).filter((f) => f && f.played && (f.homeId === teamId || f.awayId === teamId) && (f.games || []).length)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  let n = 0; let kind = null;
  for (const f of fx) {
    const s = seriesOf(f);
    const won = (f.homeId === teamId) === (s.hw > s.aw);
    if (kind == null) kind = won;
    if (won !== kind) break;
    n++;
  }
  return { n, won: kind };
}

function strengthOf(state, team) {
  const ids = (team && (team.lineup && team.lineup.length ? team.lineup : team.playerIds)) || [];
  const ps = ids.map((id) => U.playerOf(state, id)).filter(Boolean);
  return ps.length ? ps.reduce((s, p) => s + U.num(p.rating), 0) / ps.length : 0;
}

function reactTo(state, fx, ctx) {
  const r = U.rng(U.careerKey(state) + '|yfx|' + fx.id);
  const user = state.userTeamId;
  const mine = fx.homeId === user || fx.awayId === user;
  const s = seriesOf(fx);
  const homeWon = s.hw > s.aw;
  const winId = homeWon ? fx.homeId : fx.awayId;
  const loseId = homeWon ? fx.awayId : fx.homeId;
  const W = U.teamOf(state, winId); const Lt = U.teamOf(state, loseId);
  if (!W || !Lt) return 0;
  const score = Math.max(s.hw, s.aw) + '-' + Math.min(s.hw, s.aw);
  let n = 0;
  const upset = strengthOf(state, Lt) - strengthOf(state, W) >= 4;
  if (!mine) {
    if (upset && r.chance(0.6)) { mediaPost(state, r, fill(r.pick(MEDIA.upset), { t: W.name, o: Lt.name, score }), null, null, 1.3); n++; }
    return n;
  }
  const team = U.teamOf(state, user);
  const won = winId === user;
  // fans quote the score from their club's side ("1-3" after a loss)
  const myScore = (fx.homeId === user ? s.hw : s.aw) + '-' + (fx.homeId === user ? s.aw : s.hw);
  const side = fx.homeId === user ? 'home' : 'away';
  const myLines = s.lines.filter((l) => l.side === side).sort((a, b) => b.points - a.points);
  const star = myLines[0]; const worst = myLines[myLines.length - 1];
  const es = team && team.region === 'sam';
  // one language per reaction (so the same joke never shows up twice in two languages)
  const lang0 = es && r.chance(0.45) ? FAN_ES : FAN_EN;
  const pool = () => lang0;
  // never the same line twice in one reaction
  const used = new Set();
  const pickOnce = (P, cat) => {
    const arr = P[cat];
    const free = arr.map((_, i) => i).filter((i) => !used.has(cat + i));
    const i = free.length ? r.pick(free) : r.int(0, arr.length - 1);
    used.add(cat + i);
    return arr[i];
  };
  const opp = won ? Lt : W;
  const k = 1 + (r.chance(0.6) ? 1 : 0) + (upset ? 1 : 0);
  for (let i = 0; i < k; i++) {
    const P = pool();
    let text;
    if (won) text = star && i === 0 && star.goals >= 3 ? fill(pickOnce(P, 'winStar'), { p: star.name, g: star.goals }) : fill(pickOnce(P, 'winTeam'), { t: team.name, score: myScore });
    else text = worst && i === 0 && r.chance(0.6) ? fill(pickOnce(P, 'lossBlame'), { p: worst.name, t: team.name }) : fill(pickOnce(P, 'lossTeam'), { t: team.name, score: myScore });
    const target = won ? star : worst;
    const pl = target && U.playerOf(state, target.id);
    fanPost(state, r, text, pl && i === 0 && pl.isUser ? { targetId: pl.id } : null);
    n++;
  }
  const st = streakOf(state, user);
  if (st.n >= 3 && r.chance(0.7)) { const P = pool(); fanPost(state, r, fill(r.pick(st.won ? P.streakW : P.streakL), { t: team.name, n: st.n })); n++; }
  if (star && (star.goals >= 5 || star.points >= 1500) && r.chance(0.65)) {
    mediaPost(state, r, fill(r.pick(MEDIA.statline), { p: star.name, t: team.name, g: star.goals, a: star.assists, s: star.saves, o: opp.name, score: myScore }));
    n++;
  }
  if (upset && won) { mediaPost(state, r, fill(r.pick(MEDIA.upset), { t: W.name, o: Lt.name, score }), null, null, 1.4); n++; }
  return n;
}

// ---------- 3) weekly world posts ----------
function weekly(state, day, y, ctx) {
  const r = U.dayRng(state, ID, day, 'weekly');
  let n = 0;
  const rank = state.ranking && typeof state.ranking === 'object' ? Object.entries(state.ranking).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];
  if (rank.length === 5 && r.chance(0.7)) {
    const nm = rank.map(([id]) => { const t = U.teamOf(state, Number(id)); return t ? t.name : '?'; });
    mediaPost(state, r, fill(r.pick(MEDIA.power), { a: nm[0], b: nm[1], c: nm[2], d: nm[3], e: nm[4] }), 'Octane Report', 260000);
    n++;
  }
  const unhappy = state.players.filter((p) => p && !p.retired && !p.isUser && p.teamId >= 0 && p.wantsOut && p.teamId !== state.userTeamId);
  if (unhappy.length && r.chance(0.6)) {
    const p = r.pick(unhappy); const t = U.teamOf(state, p.teamId);
    if (t) { mediaPost(state, r, fill(r.pick(MEDIA.rumorOut), { p: p.name, t: t.name }), 'RL Insider', 180000, 1.2); n++; }
  }
  const fas = state.players.filter((p) => p && !p.retired && (p.teamId == null || p.teamId < 0) && U.num(p.rating) >= 78).sort((a, b) => b.rating - a.rating).slice(0, 8);
  if (fas.length && r.chance(0.5)) { const p = r.pick(fas); mediaPost(state, r, fill(r.pick(MEDIA.rumorFa), { p: p.name, r: p.rating }), 'RL Insider', 180000); n++; }
  if (r.chance(0.5)) { fanPost(state, r, r.pick(MEDIA.meme), { followers: r.int(2000, 40000) }); n++; }
  return n;
}

function init(state) { ensure(state); }

function onDay(state, day, ctx) {
  const y = ensure(state);
  if (U.weekday(day) === 1 && y.lastWeekly !== day && U.daysBetween(day, state.currentDate) <= 2) {
    y.lastWeekly = day;
    y.posted += weekly(state, day, y, ctx);
  }
}

function onTick(state, ctx) {
  const y = ensure(state);
  refresh(state, y, ctx);
  const seen = new Set(y.seenFx);
  const due = (state.fixtures || []).filter((f) => f && f.played && !seen.has(f.id) && (f.games || []).length
    && U.daysBetween(f.date, state.currentDate) <= FX_WINDOW && U.daysBetween(f.date, state.currentDate) >= 0);
  for (const f of due) {
    y.seenFx.push(f.id);
    y.posted += reactTo(state, f, ctx);
  }
  if (y.seenFx.length > 400) y.seenFx.splice(0, y.seenFx.length - 400);
  // keep our own posts' ids above the watermark so they are never "refreshed"
  const posts = state.social && state.social.posts;
  if (Array.isArray(posts) && posts.length) y.lastId = Math.max(y.lastId, U.num(posts[0].id));
}

function snapshot(state) {
  const y = ensure(state);
  return { rewritten: y.rewritten, posted: y.posted };
}

module.exports = { id: ID, init, onDay, onTick, snapshot, _test: { refresh, reactTo, seriesOf, streakOf, PLAYER } };
