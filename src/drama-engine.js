'use strict';
// Drama & orgs:
//  - controversies around your players (stream rage, leaked DMs, partying, false cheating claims,
//    contract tweets) that you handle: defend, fine, apologise or ignore;
//  - player beefs on Y: your player vs a rival (calm it down or let it fuel the rivalry) and AI vs AI;
//  - the org scene moves: weak clubs get sold to new organisations, clubs merge, and you can found a
//    new organisation or merge a smaller club into yours.
const U = require('./util');

const ID = 'drama';
const DECIDE_DAYS = 5;
const CONTRO_GAP = 26;
const BEEF_GAP = 18;
const ORG_GAP = 50;
const MERGE_FEE_BASE = 30000;

const NEW_ORGS = [
  ['Novadrift', 'NVD', 'Novadrift.svg'], ['Pirate Token', 'PTK', 'PirateToken.svg'], ['Sakura Esports', 'SAK', 'Sakura.png'],
  ['Synthesis', 'SYN', 'Synthesis.png'], ['Pioneers', 'PNR', 'Pioneers.png'], ['Emerald', 'EMR', 'Emerald.svg'],
  ['Rapier', 'RPR', 'Rapier.svg'], ['Nihil', 'NHL', 'Nihil.svg'], ['Instant', 'INS', 'Instant.svg'], ['Amethyst', 'AMT', 'Amethyst.png'],
  ['Magnifico', 'MAG', 'Magnifico.png'], ['Overlooked', 'OVL', 'Overlooked.png'], ['Praise', 'PRS', 'Praise.png'],
  ['Five Fears', '5FR', 'FiveFears.png'], ['Spliced', 'SPL', 'Spliced.svg'], ['Sonics', 'SNC', 'Sonics.svg'],
  ['After Party', 'AFP', 'AfterParty.png'], ['Daybreak Frontline', 'DBF', 'DaybreakFrontline.svg'], ['Fear Of God', 'FOG', 'FearOfGod.svg'],
  ['High Risk Low Reward', 'HRL', 'HighRiskLowReward.svg'], ['North Star Esports', 'NSE', 'NorthStarEsports.png'],
  ['Phoenix Esports', 'PHX', 'PhoenixEsports.png'], ['Space Bound Cowboys', 'SBC', 'SpaceBoundCowboys.png'], ['Take Flyte', 'TKF', 'TakeFlyte.png'],
  ['Team Abyssal', 'ABY', 'TeamAbyssal.png'], ['Powershooter', 'PWS', 'Powershooter.svg'], ['Lotus8 Esports', 'LT8', 'Lotus8Esports.png'],
  ['Cloud eSport', 'CLD', 'CloudeSport.png'], ['Astronic Esports', 'AST', 'AstronicEsports.png'], ['Novo Esports', 'NOV', 'NOVOEsports.png'],
];
const COLORS = [['#7c3aed', '#0b0b14'], ['#ef4444', '#111111'], ['#06b6d4', '#0b1220'], ['#22c55e', '#0a1410'], ['#f59e0b', '#151007'], ['#ec4899', '#14070f'], ['#e5e7eb', '#111827'], ['#3b82f6', '#0a0f1c']];

// ---------- texts ----------
const CONTRO = {
  rage: {
    en: { t: '{p} raged at teammates on stream', b: 'A clip of {p} flaming the team mid-scrim is all over Y.', y: ['the {p} stream clip is WILD 💀', 'imagine being {p}\'s teammate after that clip 😬', '{t} locker room must be fun rn'] },
    es: { t: '{p} explotó contra sus compañeros en stream', b: 'Un clip de {p} insultando al equipo en pleno scrim está en todo Y.' },
  },
  leak: {
    en: { t: 'Leaked DMs: {p} trashing {o}', b: 'Screenshots of {p} mocking {o} in private messages leaked overnight.', y: ['the {p} DMs about {o} 😭😭', '{o} fans are NOT happy with {p} right now', 'next {t} vs {o} is gonna be personal'] },
    es: { t: 'Se filtraron DMs de {p} burlándose de {o}', b: 'Capturas de {p} burlándose de {o} por privado se filtraron anoche.' },
  },
  party: {
    en: { t: '{p} spotted partying before match day', b: 'Photos of {p} at a club at 4am, hours before the team\'s next series, are circulating.', y: ['{p} at the club at 4am on match week? bold strategy', 'if {t} lose tomorrow we know why 🍾', 'let {p} live lol'] },
    es: { t: '{p} fue visto de fiesta antes de un partido', b: 'Circulan fotos de {p} en un boliche a las 4 de la mañana, horas antes de la próxima serie del equipo.' },
  },
  cheat: {
    en: { t: 'Rival fans accuse {p} of using macros', b: 'A slowed-down clip claims {p} used an input macro. There is no proof, but it is trending.', y: ['that {p} "macro" clip is so reached 🤦', 'not saying {p} cheats but… 🤔', 'free {p}, the clip is fake'] },
    es: { t: 'Hinchas rivales acusan a {p} de usar macros', b: 'Un clip en cámara lenta asegura que {p} usó una macro. No hay pruebas, pero es tendencia.' },
  },
  contract: {
    en: { t: '{p} posts a cryptic tweet about the contract', b: '"Know your worth 💸" — {p} posted it right after training. Fans are reading between the lines.', y: ['{p} "know your worth" tweet 👀👀', 'pay {p} whatever they want honestly', '{t} better sort {p}\'s contract fast'] },
    es: { t: '{p} publicó un tweet críptico sobre su contrato', b: '"Conocé tu valor 💸" — lo publicó {p} justo después del entrenamiento. Los hinchas leen entre líneas.' },
  },
};
// effects per option: m = player morale, o = other teammates' morale, f = team followers %, pf = player followers %, cost (money), gain (fine paid)
const OPTIONS = {
  defend: { m: 8, o: -2, f: -1.5, pf: 2 },
  fine: { m: -9, o: 3, f: 1, gain: 'wage4' },
  apologise: { m: -3, o: 1, f: 2, pf: -1 },
  ignore: { m: -2, o: -1, f: -2.5, pf: 1 },
};
const OPT_BY_KIND = {
  rage: ['fine', 'apologise', 'defend', 'ignore'],
  leak: ['apologise', 'fine', 'defend', 'ignore'],
  party: ['fine', 'defend', 'apologise', 'ignore'],
  cheat: ['defend', 'apologise', 'ignore'],
  contract: ['defend', 'fine', 'ignore'],
};
const OPT_TEXT = {
  defend: { en: 'Back the player publicly', es: 'Respaldarlo en público' },
  fine: { en: 'Fine the player (4 weeks of wages)', es: 'Multarlo (4 semanas de sueldo)' },
  apologise: { en: 'Official statement + apology', es: 'Comunicado oficial y disculpa' },
  ignore: { en: 'Say nothing', es: 'No decir nada' },
  calm: { en: 'Tell your player to delete it', es: 'Pedirle que lo borre' },
  fuel: { en: 'Let it run: it sells tickets', es: 'Dejar que siga: vende entradas' },
};
const BEEF = {
  open: ['@{h2} you play like a bot on rookie difficulty', '@{h2} funny how quiet you got after last time 🤫', 'ngl @{h2} is the most overrated player in the league',
    '@{h2} keep my name out your mouth 🫢', 'can\'t wait to play @{h2} again. easiest series of the year'],
  reply: ['@{h1} scoreboard says otherwise 📊', '@{h1} say that again when we play 😂', '@{h1} ratio + you\'re hardstuck', '@{h1} we\'ll see on the pitch',
    '@{h1} imagine typing this instead of practicing'],
  fans: ['@{h1} vs @{h2} beef is the best thing on Y right now 🍿', 'the {t1} vs {t2} series just became must-watch 👀', 'this {p1} / {p2} drama is better than any esport final'],
};

function ensure(state) {
  const x = U.xstate(state);
  let d = x.drama;
  if (!d || typeof d !== 'object') d = x.drama = { pending: null, log: [], orgLog: [], beefs: [], lastContro: '', lastBeef: '', lastOrg: '', lastWorldBeef: '', mergedSeason: null, usedOrgs: [] };
  if (!Array.isArray(d.log)) d.log = [];
  if (!Array.isArray(d.orgLog)) d.orgLog = [];
  if (!Array.isArray(d.beefs)) d.beefs = [];
  if (!Array.isArray(d.usedOrgs)) d.usedOrgs = [];
  return d;
}
const lang = (ctx) => (ctx.lang === 'es' ? 'es' : 'en');
const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p[k] != null ? p[k] : ''));
const trim = (arr, n) => { if (arr.length > n) arr.length = n; };

function strength(state, t) {
  const ids = (t && (t.lineup && t.lineup.length ? t.lineup : t.playerIds)) || [];
  const ps = ids.slice(0, 3).map((id) => U.playerOf(state, id)).filter(Boolean);
  return ps.length ? ps.reduce((s, p) => s + U.num(p.rating), 0) / ps.length : 0;
}
function rosterOf(state, t) { return ((t && t.playerIds) || []).map((id) => U.playerOf(state, id)).filter((p) => p && !p.retired); }
function aiTeams(state) { return state.teams.filter((t) => t && t.id !== state.userTeamId && !t.isUser); }

// ---------- controversies ----------
function controDay(state, day, d, ctx) {
  if (!ctx.manager || d.pending) return;
  if (d.lastContro && U.daysBetween(d.lastContro, day) < CONTRO_GAP) return;
  const r = U.dayRng(state, ID, day, 'contro');
  if (!r.chance(0.05)) return;
  const squad = U.rosterPlayers(state).filter((p) => !p.isUser);
  if (!squad.length) return;
  const p = r.pick(squad);
  const kinds = Object.keys(CONTRO);
  const kind = r.pick(kinds);
  const opp = r.pick(aiTeams(state).filter((t) => t.region === (U.userTeam(state) || {}).region).concat(aiTeams(state)).slice(0, 12));
  d.lastContro = day;
  d.pending = { type: 'contro', kind, pid: p.id, oppId: opp ? opp.id : null, date: day };
  const tm = U.userTeam(state);
  const P = { p: p.name, o: opp ? opp.name : 'rivals', t: tm ? tm.name : '' };
  for (const line of CONTRO[kind].en.y.slice(0, 2 + (r.chance(0.5) ? 1 : 0))) U.yPost(state, r, { kind: 'fan', name: 'rl' + r.pick(['watcher', 'tea', 'drama', 'clips']) + r.int(1, 999), followers: r.int(200, 9000), verified: false, text: fill(line, P) });
  const L = CONTRO[kind][lang(ctx)];
  U.pushInbox(state, '🔥 ' + fill(L.t, P), fill(L.b, P) + (lang(ctx) === 'es' ? ' Decidí qué hacer en Mundo RL → Drama.' : ' Decide what to do in RL World → Drama.'), 'xtworld');
}

function applyContro(state, d, optId, ctx, auto) {
  const k = d.pending;
  const p = U.playerOf(state, k.pid);
  const tm = U.userTeam(state);
  const o = OPTIONS[optId];
  if (!p || !tm || !o) return { ok: false, error: 'Nothing to decide.' };
  let money = 0;
  if (o.gain === 'wage4') { money = Math.round(U.num(p.wage) * 4); U.earn(state, money); if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'wages', amount: money, note: 'Fine: ' + p.name }); }
  U.moraleDelta(ctx.engine, p, o.m);
  if (o.o) for (const q of U.rosterPlayers(state)) if (q.id !== p.id && !q.isUser) U.moraleDelta(ctx.engine, q, o.o);
  // a fake cheating claim backed by the club backfires on the accusers
  const bonus = k.kind === 'cheat' && optId === 'defend' ? 3 : 0;
  tm.followers = Math.max(0, Math.round(U.num(tm.followers) * (1 + (o.f + bonus) / 100)));
  if (o.pf) p.followers = Math.max(0, Math.round(U.num(p.followers) * (1 + o.pf / 100)));
  const r = U.dayRng(state, ID, state.currentDate, 'react' + k.pid);
  const club = { defend: `We stand with ${p.name}. End of story.`, fine: `${p.name} has been disciplined internally. We expect better.`, apologise: `We apologise for ${p.name}'s behaviour. It does not represent our club.`, ignore: null }[optId];
  if (club) U.yPost(state, r, { kind: 'club', team: tm, text: club });
  d.log.unshift({ date: k.date, kind: k.kind, name: p.name, choice: optId, auto: !!auto, money });
  trim(d.log, 15);
  d.pending = null;
  return { ok: true, money };
}

// ---------- beefs ----------
function postBeef(state, r, a, b) {
  const h1 = U.handleOf(a.name); const h2 = U.handleOf(b.name);
  const t1 = U.teamOf(state, a.teamId); const t2 = U.teamOf(state, b.teamId);
  U.yPost(state, r, { kind: 'player', player: a, text: fill(r.pick(BEEF.open), { h2 }), hype: 1.4 });
  U.yPost(state, r, { kind: 'player', player: b, text: fill(r.pick(BEEF.reply), { h1 }), hype: 1.5 });
  U.yPost(state, r, { kind: 'fan', name: 'beef' + r.pick(['watch', 'tracker', 'enjoyer']) + r.int(1, 99), followers: r.int(1000, 30000), verified: false, text: fill(r.pick(BEEF.fans), { h1, h2, t1: t1 ? t1.name : '', t2: t2 ? t2.name : '', p1: a.name, p2: b.name }) });
}

function beefDay(state, day, d, ctx) {
  const r = U.dayRng(state, ID, day, 'beef');
  // AI vs AI: pure entertainment
  if ((!d.lastWorldBeef || U.daysBetween(d.lastWorldBeef, day) >= 12) && r.chance(0.07)) {
    const stars = state.players.filter((p) => p && !p.retired && !p.isUser && p.teamId >= 0 && p.teamId !== state.userTeamId && U.num(p.followers) > 15000);
    const a = stars.length ? r.pick(stars) : null;
    const pool = a ? stars.filter((q) => q.teamId !== a.teamId && (U.teamOf(state, q.teamId) || {}).region === (U.teamOf(state, a.teamId) || {}).region) : [];
    if (a && pool.length) {
      const b = r.pick(pool);
      d.lastWorldBeef = day;
      postBeef(state, r, a, b);
      const ta = U.teamOf(state, a.teamId); const tb = U.teamOf(state, b.teamId);
      d.beefs.unshift({ date: day, a: a.name, ta: ta ? ta.name : '', b: b.name, tb: tb ? tb.name : '', mine: false });
      trim(d.beefs, 12);
      U.pushNews(state, ctx, 'beef' + day, { category: 'club', teamId: ta ? ta.id : null, headline: lang(ctx) === 'es' ? `${a.name} y ${b.name} se pelean en Y` : `${a.name} and ${b.name} trade shots on Y`, body: lang(ctx) === 'es' ? `La pelea entre ${a.name} (${ta ? ta.name : ''}) y ${b.name} (${tb ? tb.name : ''}) ya es lo más comentado de la semana.` : `The spat between ${a.name} (${ta ? ta.name : ''}) and ${b.name} (${tb ? tb.name : ''}) is the talk of the week.` });
    }
  }
  // your player vs a rival
  if (!ctx.manager || d.pending) return;
  if (d.lastBeef && U.daysBetween(d.lastBeef, day) < BEEF_GAP) return;
  if (!r.chance(0.045)) return;
  const squad = U.rosterPlayers(state).filter((p) => !p.isUser);
  const tm = U.userTeam(state);
  if (!squad.length || !tm) return;
  const rivals = state.players.filter((p) => p && !p.retired && p.teamId >= 0 && p.teamId !== state.userTeamId && (U.teamOf(state, p.teamId) || {}).region === tm.region && U.num(p.rating) >= 70);
  if (!rivals.length) return;
  const a = r.pick(squad); const b = r.pick(rivals);
  d.lastBeef = day;
  postBeef(state, r, a, b);
  d.pending = { type: 'beef', pid: a.id, otherId: b.id, oppId: b.teamId, date: day };
  const tb = U.teamOf(state, b.teamId);
  U.pushInbox(state, lang(ctx) === 'es' ? `🥊 ${a.name} se peleó con ${b.name} en Y` : `🥊 ${a.name} is beefing with ${b.name} on Y`,
    lang(ctx) === 'es' ? `La pelea con ${b.name} (${tb ? tb.name : ''}) explotó en Y. Podés pedirle que lo borre o dejar que la rivalidad crezca. Decidí en Mundo RL → Drama.` : `The spat with ${b.name} (${tb ? tb.name : ''}) blew up on Y. Ask your player to delete it or let the rivalry grow. Decide in RL World → Drama.`, 'xtworld');
}

function applyBeef(state, d, optId, ctx, auto) {
  const k = d.pending;
  const a = U.playerOf(state, k.pid); const b = U.playerOf(state, k.otherId);
  const tm = U.userTeam(state);
  if (!a || !tm) { d.pending = null; return { ok: false, error: 'Player gone.' }; }
  const r = U.dayRng(state, ID, state.currentDate, 'beefend');
  if (optId === 'calm') {
    U.moraleDelta(ctx.engine, a, -3);
    U.yPost(state, r, { kind: 'player', player: a, text: r.pick(['deleted. respect to everyone, see you on the pitch 🤝', 'heat of the moment. all love', 'letting the gameplay talk from now on']) });
  } else {
    U.moraleDelta(ctx.engine, a, 4);
    a.followers = Math.round(U.num(a.followers) * 1.04);
    if (b) b.followers = Math.round(U.num(b.followers) * 1.03);
    tm.followers = Math.round(U.num(tm.followers) * 1.015);
    // the rivalry carries into the next meeting: winner's morale up, loser's down (see onTick)
    d.feud = { pid: a.id, oppId: k.oppId, since: state.currentDate };
  }
  const tb = b && U.teamOf(state, b.teamId);
  d.beefs.unshift({ date: k.date, a: a.name, ta: tm.name, b: b ? b.name : '?', tb: tb ? tb.name : '', mine: true, choice: optId, auto: !!auto });
  trim(d.beefs, 12);
  d.pending = null;
  return { ok: true };
}

function feudTick(state, d, ctx) {
  const f = d.feud;
  if (!f) return;
  if (U.daysBetween(f.since, state.currentDate) > 60) { d.feud = null; return; }
  const fx = (state.fixtures || []).find((x) => x && x.played && x.date >= f.since && ((x.homeId === state.userTeamId && x.awayId === f.oppId) || (x.awayId === state.userTeamId && x.homeId === f.oppId)) && (x.games || []).length);
  if (!fx) return;
  let hw = 0; let aw = 0;
  for (const g of fx.games) { if (U.num(g.homeGoals) > U.num(g.awayGoals)) hw++; else aw++; }
  const won = (fx.homeId === state.userTeamId) === (hw > aw);
  const p = U.playerOf(state, f.pid);
  const r = U.dayRng(state, ID, state.currentDate, 'feud');
  if (p) {
    U.moraleDelta(ctx.engine, p, won ? 6 : -6);
    U.yPost(state, r, { kind: 'player', player: p, text: won ? r.pick(['told you 🤫', 'scoreboard. that\'s the tweet 📊', 'talk is cheap. W is W']) : r.pick(['gg. they got this one', 'not my day. respect']), hype: 1.5 });
  }
  d.log.unshift({ date: state.currentDate, kind: 'feud', name: p ? p.name : '?', choice: won ? 'won' : 'lost' });
  trim(d.log, 15);
  d.feud = null;
}

// ---------- orgs ----------
function freeOrg(state, d, r, wanted) {
  const taken = new Set(state.teams.map((t) => String(t && (t.name || '')).toLowerCase()));
  const used = new Set(d.usedOrgs);
  const pool = NEW_ORGS.filter((o) => !taken.has(o[0].toLowerCase()) && !used.has(o[0]));
  if (wanted) return pool;
  return pool.length ? r.pick(pool) : null;
}
function unusedLogo(state, d, seed) {
  const usedLogos = new Set(state.teams.map((t) => t && t.logo));
  const pool = NEW_ORGS.filter((o) => !usedLogos.has(o[2]));
  return pool.length ? pool[U.hashStr(seed) % pool.length][2] : NEW_ORGS[U.hashStr(seed) % NEW_ORGS.length][2];
}

function rebrand(state, t, org, colors, d, ctx, r, why) {
  const prev = t.name;
  t.xtPrevNames = (t.xtPrevNames || []).concat([prev]).slice(-5);
  t.name = org.name;
  t.abbrev = org.abbrev;
  t.logo = org.logo;
  t.colors = colors;
  delete t.logoLum;
  t.budget = Math.round(U.num(t.budget) + (org.injection || 0));
  d.usedOrgs.push(org.name);
  d.orgLog.unshift({ date: state.currentDate, kind: why, from: prev, to: org.name, region: t.region, teamId: t.id, extra: org.extra || null });
  trim(d.orgLog, 20);
  U.yPost(state, r, { kind: 'club', team: t, text: r.pick([`New name. Same hunger. Welcome to ${org.name} 🚀`, `${org.name} has arrived. Let's get to work.`, `It's official: ${prev} is now ${org.name}. A new era starts today.`]), hype: 1.5 });
  return prev;
}

// two AI clubs merge: the stronger one takes the other's best player, the other slot is sold to a new org
function mergeAI(state, d, r, ctx) {
  const regs = [...new Set(aiTeams(state).map((t) => t.region))];
  for (let tries = 0; tries < 6; tries++) {
    const reg = r.pick(regs);
    const teams = aiTeams(state).filter((t) => t.region === reg && rosterOf(state, t).length >= 3).sort((a, b) => strength(state, b) - strength(state, a));
    if (teams.length < 6) continue;
    const mid = teams.slice(Math.floor(teams.length * 0.25));
    const A = mid[0];
    const B = r.pick(mid.slice(1));
    if (!A || !B) continue;
    const org = freeOrg(state, d, r);
    if (!org) return false;
    const bp = rosterOf(state, B).sort((x, y) => U.num(y.rating) - U.num(x.rating))[0];
    const ap = rosterOf(state, A).sort((x, y) => U.num(x.rating) - U.num(y.rating))[0];
    if (!bp || !ap) continue;
    swap(state, A, ap, B, bp);
    const name = A.name;
    rebrand(state, B, { name: org[0], abbrev: org[1], logo: org[2], injection: 150000, extra: { merged: name, star: bp.name } }, r.pick(COLORS), d, ctx, r, 'merge');
    U.yPost(state, r, { kind: 'media', name: 'RL Insider', followers: 180000, verified: true, club: '', text: `BREAKING: ${name} absorb ${d.orgLog[0].from}'s roster. ${bp.name} joins ${name}; ${ap.name} heads to the new ${org[0]} project 🔄`, hype: 1.6 });
    U.pushNews(state, ctx, 'merge' + state.currentDate, { category: 'transfer', teamId: A.id, headline: lang(ctx) === 'es' ? `Fusión: ${name} absorbe a ${d.orgLog[0].from}` : `Merger: ${name} absorb ${d.orgLog[0].from}`, body: lang(ctx) === 'es' ? `${bp.name} se suma a ${name}. La plaza de ${d.orgLog[0].from} pasa a la nueva organización ${org[0]}, que se queda con ${ap.name}.` : `${bp.name} joins ${name}. ${d.orgLog[0].from}'s slot goes to the new organisation ${org[0]}, who keep ${ap.name}.` });
    return true;
  }
  return false;
}

function swap(state, A, ap, B, bp) {
  const rep = (arr, from, to) => { if (Array.isArray(arr)) { const i = arr.indexOf(from); if (i !== -1) arr[i] = to; } };
  rep(A.playerIds, ap.id, bp.id); rep(A.lineup, ap.id, bp.id);
  rep(B.playerIds, bp.id, ap.id); rep(B.lineup, bp.id, ap.id);
  ap.teamId = B.id; bp.teamId = A.id;
}

function sellAI(state, d, r, ctx) {
  const teams = aiTeams(state).sort((a, b) => strength(state, a) - strength(state, b));
  const weak = teams.slice(0, Math.max(3, Math.floor(teams.length * 0.3)));
  const t = r.pick(weak);
  const org = freeOrg(state, d, r);
  if (!t || !org) return false;
  const prev = rebrand(state, t, { name: org[0], abbrev: org[1], logo: org[2], injection: 250000 }, r.pick(COLORS), d, ctx, r, 'sale');
  U.yPost(state, r, { kind: 'media', name: 'RL Insider', followers: 180000, verified: true, club: '', text: `${prev} have sold their RLCS slot. ${org[0]} take over the roster with a fresh budget 💰`, hype: 1.4 });
  U.pushNews(state, ctx, 'sale' + state.currentDate, { category: 'club', teamId: t.id, headline: lang(ctx) === 'es' ? `${prev} vende su plaza a ${org[0]}` : `${prev} sell their slot to ${org[0]}`, body: lang(ctx) === 'es' ? `La nueva organización ${org[0]} se queda con el roster y llega con presupuesto fresco.` : `The new organisation ${org[0]} keeps the roster and arrives with fresh money.` });
  return true;
}

function orgDay(state, day, d, ctx) {
  if (d.lastOrg && U.daysBetween(d.lastOrg, day) < ORG_GAP) return;
  if (!d.lastOrg) { d.lastOrg = day; return; }
  const r = U.dayRng(state, ID, day, 'org');
  if (!r.chance(0.06)) return;
  d.lastOrg = day;
  if (r.chance(0.45)) { if (!mergeAI(state, d, r, ctx)) sellAI(state, d, r, ctx); } else sellAI(state, d, r, ctx);
}

function mergeFee(state, t) {
  const best = rosterOf(state, t).sort((a, b) => U.num(b.rating) - U.num(a.rating))[0];
  const v = best ? Math.pow(Math.max(0, U.num(best.rating) - 55), 2) * 120 : 0;
  return Math.round((MERGE_FEE_BASE + v) / 1000) * 1000;
}
function mergeTargets(state) {
  const me = U.userTeam(state);
  if (!me) return [];
  const myStr = strength(state, me);
  return aiTeams(state).filter((t) => t.region === me.region && strength(state, t) < myStr && rosterOf(state, t).length >= 2)
    .sort((a, b) => strength(state, b) - strength(state, a)).slice(0, 8);
}

// ---------- module API ----------
function init(state) { ensure(state); }

function onDay(state, day, ctx) {
  const d = ensure(state);
  // decisions expire into the default choice
  if (d.pending && U.daysBetween(d.pending.date, day) > DECIDE_DAYS) {
    if (d.pending.type === 'contro') applyContro(state, d, 'ignore', ctx, true); else applyBeef(state, d, 'fuel', ctx, true);
    // give the club a breather before the next story
    d.lastContro = day; d.lastBeef = day;
  }
  controDay(state, day, d, ctx);
  beefDay(state, day, d, ctx);
  orgDay(state, day, d, ctx);
}

function onTick(state, ctx) {
  const d = ensure(state);
  if (d.pending && !U.playerOf(state, d.pending.pid)) d.pending = null;
  feudTick(state, d, ctx);
}

function command(state, cmd, ctx) {
  const d = ensure(state);
  const es = lang(ctx) === 'es';
  if (cmd.op === 'decide') {
    if (!ctx.manager) return { ok: false, error: es ? 'Solo en carrera de DT.' : 'Manager careers only.' };
    if (!d.pending) return { ok: false, error: es ? 'No hay nada pendiente.' : 'Nothing pending.' };
    const opt = String(cmd.choice || '');
    if (d.pending.type === 'contro') {
      if (!(OPT_BY_KIND[d.pending.kind] || []).includes(opt)) return { ok: false, error: 'Bad choice.' };
      return applyContro(state, d, opt, ctx, false);
    }
    if (opt !== 'calm' && opt !== 'fuel') return { ok: false, error: 'Bad choice.' };
    return applyBeef(state, d, opt, ctx, false);
  }
  if (cmd.op === 'found') {
    const name = String(cmd.name || '').replace(/\s+/g, ' ').trim();
    const abbrev = String(cmd.abbrev || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const region = String(cmd.region || '');
    if (name.length < 2 || name.length > 28) return { ok: false, error: es ? 'El nombre debe tener entre 2 y 28 caracteres.' : 'Name must be 2-28 characters.' };
    if (abbrev.length < 2) return { ok: false, error: es ? 'La sigla debe tener 2 a 4 letras.' : 'Tag must be 2-4 letters.' };
    if (state.teams.some((t) => t && String(t.name).toLowerCase() === name.toLowerCase())) return { ok: false, error: es ? 'Ya existe un equipo con ese nombre.' : 'A team with that name already exists.' };
    const pool = aiTeams(state).filter((t) => t.region === region).sort((a, b) => strength(state, a) - strength(state, b));
    if (!pool.length) return { ok: false, error: es ? 'No hay plazas en esa región.' : 'No slot available in that region.' };
    const t = pool[0];
    const r = U.dayRng(state, ID, state.currentDate, 'found' + name);
    const prev = rebrand(state, t, { name, abbrev, logo: unusedLogo(state, d, name), injection: 200000 }, r.pick(COLORS), d, ctx, r, 'founded');
    U.pushNews(state, ctx, 'found' + name, { category: 'club', teamId: t.id, headline: es ? `Nace ${name}` : `${name} is born`, body: es ? `La nueva organización ${name} compra la plaza de ${prev} en ${region.toUpperCase()}.` : `New organisation ${name} buys ${prev}'s slot in ${region.toUpperCase()}.` });
    return { ok: true, name, from: prev };
  }
  if (cmd.op === 'merge') {
    if (!ctx.manager) return { ok: false, error: es ? 'Solo en carrera de DT.' : 'Manager careers only.' };
    if (d.mergedSeason === state.season) return { ok: false, error: es ? 'Ya hiciste una fusión esta temporada.' : 'You already merged a club this season.' };
    const t = mergeTargets(state).find((x) => x.id === Number(cmd.teamId));
    if (!t) return { ok: false, error: es ? 'Ese club no se puede fusionar.' : 'That club cannot be merged.' };
    const me = U.userTeam(state);
    const max = (ctx.engine && Number(ctx.engine.ROSTER_MAX)) || 6;
    if ((me.playerIds || []).length >= max) return { ok: false, error: es ? 'Tu plantel está lleno.' : 'Your roster is full.' };
    const fee = mergeFee(state, t);
    const paid = U.spend(state, fee);
    if (!paid.ok) return paid;
    if (Array.isArray(state.ledger)) state.ledger.push({ date: state.currentDate, kind: 'buy', amount: -fee, note: 'Merger: ' + t.name });
    const best = rosterOf(state, t).sort((a, b) => U.num(b.rating) - U.num(a.rating))[0];
    t.playerIds = t.playerIds.filter((id) => id !== best.id);
    if (Array.isArray(t.lineup)) t.lineup = t.lineup.filter((id) => id !== best.id);
    best.teamId = me.id;
    me.playerIds.push(best.id);
    if (!best.contractSeasons) best.contractSeasons = 2;
    me.followers = Math.round(U.num(me.followers) + U.num(t.followers) * 0.5);
    d.mergedSeason = state.season;
    const r = U.dayRng(state, ID, state.currentDate, 'umerge');
    const org = freeOrg(state, d, r) || ['Phoenix Rising', 'PHR', unusedLogo(state, d, 'phoenix')];
    const prev = rebrand(state, t, { name: org[0], abbrev: org[1], logo: org[2], injection: 120000, extra: { merged: me.name, star: best.name } }, r.pick(COLORS), d, ctx, r, 'merge');
    U.yPost(state, r, { kind: 'club', team: me, text: `${prev} joins the ${me.name} family. Welcome ${best.name} 🤝`, hype: 1.6 });
    U.pushNews(state, ctx, 'umerge' + state.season, { category: 'transfer', teamId: me.id, headline: es ? `${me.name} absorbe a ${prev}` : `${me.name} absorb ${prev}`, body: es ? `${best.name} llega a ${me.name}. La plaza de ${prev} la toma ${org[0]}.` : `${best.name} joins ${me.name}. ${prev}'s slot goes to ${org[0]}.` });
    return { ok: true, fee, star: best.name, from: prev };
  }
  return { ok: false, error: 'Unknown drama command.' };
}

function snapshot(state, ctx) {
  const d = ensure(state);
  const L = lang(ctx);
  let pending = null;
  if (d.pending) {
    const k = d.pending;
    const p = U.playerOf(state, k.pid);
    const o = U.teamOf(state, k.oppId);
    const tm = U.userTeam(state);
    const P = { p: p ? p.name : '?', o: o ? o.name : '', t: tm ? tm.name : '' };
    const left = Math.max(0, DECIDE_DAYS - U.daysBetween(k.date, state.currentDate));
    if (k.type === 'contro') {
      const T = CONTRO[k.kind][L];
      pending = { type: 'contro', kind: k.kind, title: fill(T.t, P), body: fill(T.b, P), left, options: OPT_BY_KIND[k.kind].map((id) => ({ id, label: OPT_TEXT[id][L], fine: id === 'fine' && p ? Math.round(U.num(p.wage) * 4) : 0 })) };
    } else {
      const b = U.playerOf(state, k.otherId);
      pending = { type: 'beef', title: L === 'es' ? `${P.p} vs ${b ? b.name : '?'} en Y` : `${P.p} vs ${b ? b.name : '?'} on Y`, body: L === 'es' ? `Se cruzaron en Y y los hinchas de ${P.o} están encendidos.` : `They traded shots on Y and ${P.o} fans are fired up.`, left, options: ['calm', 'fuel'].map((id) => ({ id, label: OPT_TEXT[id][L] })) };
    }
  }
  const me = U.userTeam(state);
  return {
    pending,
    log: d.log.slice(0, 10),
    beefs: d.beefs.slice(0, 8),
    feud: d.feud ? (() => { const p = U.playerOf(state, d.feud.pid); const o = U.teamOf(state, d.feud.oppId); return { name: p ? p.name : '?', opp: o ? o.name : '?' }; })() : null,
    orgLog: d.orgLog.slice(0, 12),
    regions: (state.regions || []).map((r) => ({ id: r.id, name: r.short || r.name })),
    myRegion: me ? me.region : null,
    canMerge: d.mergedSeason !== state.season,
    mergeTargets: mergeTargets(state).map((t) => ({ id: t.id, name: t.name, strength: Math.round(strength(state, t) * 10) / 10, fee: mergeFee(state, t), star: (rosterOf(state, t).sort((a, b) => U.num(b.rating) - U.num(a.rating))[0] || {}).name || '' })),
  };
}

module.exports = { id: ID, init, onDay, onTick, command, snapshot, _test: { mergeAI, sellAI, swap, CONTRO, NEW_ORGS } };
