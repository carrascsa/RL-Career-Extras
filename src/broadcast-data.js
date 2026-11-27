'use strict';
// Broadcast end-of-game screens: builds what the overlay shows when a real match ends (series card, then the
// game's stat sheet). Pure data from the career + the observer's "end" event; the overlay window draws it.
const U = require('./util');

const STAGES = {
  en: { group: 'Group Stage', upper: 'Upper Bracket', lower: 'Lower Bracket', quarter: 'Quarterfinal', semi: 'Semifinal', final: 'Grand Final', swiss: 'Swiss Stage', playin: 'Play-In', groupLetter: 'Group' },
  es: { group: 'Fase de grupos', upper: 'Llave superior', lower: 'Llave inferior', quarter: 'Cuartos de final', semi: 'Semifinal', final: 'Gran final', swiss: 'Fase suiza', playin: 'Play-In', groupLetter: 'Grupo' },
};
const TXT = {
  en: { game: 'Game', bestOf: 'Best of', score: 'Score', goals: 'Goals', assists: 'Assists', shots: 'Shots', saves: 'Saves', demos: 'Demos', seriesWinner: 'Series winner', lead: 'lead the series', tied: 'Series tied', win: 'win', ft: 'FT', ot: 'OT' },
  es: { game: 'Game', bestOf: 'Al mejor de', score: 'Puntaje', goals: 'Goles', assists: 'Asistencias', shots: 'Tiros', saves: 'Atajadas', demos: 'Demos', seriesWinner: 'Gana la serie', lead: 'gana la serie', tied: 'Serie empatada', win: 'gana', ft: 'FT', ot: 'OT' },
};

// "OPEN 3 | EU | GROUP STAGE | GROUP A"
function headerFor(state, fx, lang) {
  if (!fx) return '';
  const ev = (state.events || []).find((e) => e && e.id === fx.eventId);
  const S = STAGES[lang] || STAGES.en;
  const parts = [];
  if (ev && ev.name) parts.push(ev.name);
  const home = U.teamOf(state, fx.homeId);
  if (ev && !ev.international && home && home.region) parts.push(String(home.region).toUpperCase());
  if (fx.stage) parts.push(S[fx.stage] || String(fx.stage).replace(/^\w/, (c) => c.toUpperCase()));
  const g = fx.stage === 'group' && /^E\d+([A-Z])-/.exec(String(fx.slotId || ''));
  if (g) parts.push(S.groupLetter + ' ' + g[1]);
  return parts.join(' | ');
}

function teamByName(state, name) {
  return (state.teams || []).find((t) => t && t.name === name) || null;
}

// endEv: { score:[blue, orange], ot, stats:[{name, team, score, goals, assists, shots, saves, demos}] }
// fixture: optional, the fixture as it was before this game (defaults to the Hub's pending match)
function buildEndScreen(state, ctx, endEv, lang, fixture) {
  lang = lang === 'es' ? 'es' : 'en';
  const T = TXT[lang];
  const score = (endEv && endEv.score) || [0, 0];
  const winSide = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : null;
  const c = ctx || { blue: 'Blue', orange: 'Orange', series: [0, 0], bestOf: 1, game: 1, names: {} };
  const fx = fixture || (state && state.pendingMatch != null ? (state.fixtures || []).find((f) => f && f.id === Number(state.pendingMatch)) : null);
  const sides = [c.blue, c.orange].map((name, side) => {
    const t = state ? teamByName(state, name) : null;
    const colors = (t && t.colors) || [];
    return { side, name, abbrev: (t && t.abbrev) || String(name).slice(0, 3).toUpperCase(), logo: (t && t.logo) || null, dark: !!(t && t.logo && U.num(t.logoLum) < 0.15), color: colors[0] || null, color2: colors[1] || null };
  });
  // series after this game, and the game-by-game winners for the pips
  const series = (c.series || [0, 0]).slice();
  if (winSide != null) series[winSide]++;
  const bestOf = Math.max(1, Number(c.bestOf) || 1);
  const need = Math.ceil(bestOf / 2);
  const seq = [];
  if (fx) {
    const home = U.teamOf(state, fx.homeId);
    const blueIsHome = !home || home.name === c.blue;
    for (const g of (fx.games || []).filter((x) => x && x.homeGoals != null)) {
      const homeWon = U.num(g.homeGoals) > U.num(g.awayGoals);
      seq.push(homeWon === blueIsHome ? 0 : 1);
    }
  }
  if (winSide != null) seq.push(winSide);
  // players: career names, the MVP is the best score on the winning side (as in Rocket League)
  const nm = (n) => (c.names && c.names[n]) || n;
  const players = ((endEv && endEv.stats) || []).map((p) => ({
    name: nm(p.name), team: Number(p.team) === 1 ? 1 : 0,
    score: U.num(p.score), goals: U.num(p.goals), assists: U.num(p.assists), shots: U.num(p.shots), saves: U.num(p.saves), demos: U.num(p.demos),
  }));
  const winners = players.filter((p) => p.team === winSide).sort((a, b) => b.score - a.score);
  if (winners[0]) winners[0].mvp = true;
  for (const side of [0, 1]) {
    const list = players.filter((p) => p.team === side).sort((a, b) => b.score - a.score);
    sides[side].players = list;
  }
  let footer = '';
  const lead = series[0] === series[1] ? null : series[0] > series[1] ? 0 : 1;
  const hi = Math.max(series[0], series[1]); const lo = Math.min(series[0], series[1]);
  if (bestOf <= 1) footer = winSide != null ? `${sides[winSide].name} ${T.win}` : '';
  else if (lead != null && series[lead] >= need) footer = `${sides[lead].name} · ${T.seriesWinner} · ${hi}-${lo}`;
  else if (lead == null) footer = `${T.tied} ${hi}-${lo}`;
  else footer = `${sides[lead].name} ${T.lead} ${hi}-${lo}`;
  return {
    lang, header: fx ? headerFor(state, fx, lang) : (c.event || ''), game: c.game || 1, bestOf, need, series, seq,
    score, ot: !!(endEv && endEv.ot), winSide, teams: sides, footer,
    labels: { game: T.game, bestOf: T.bestOf, rows: [['score', T.score], ['goals', T.goals], ['assists', T.assists], ['shots', T.shots], ['saves', T.saves], ['demos', T.demos]], result: endEv && endEv.ot ? T.ot : T.ft },
  };
}

module.exports = { buildEndScreen, headerFor };
