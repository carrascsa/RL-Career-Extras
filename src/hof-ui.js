// RL Hall of Fame — renderer side. Injected into renderer/index.html after app.js has loaded.
// Uses the Hub's globals: S (snapshot), tab, render, topbarHtml, tabInnerHtml, esc, crest, teamById.
(function () {
  if (window.__hallOfFameUI) return;
  if (typeof topbarHtml !== 'function' || typeof tabInnerHtml !== 'function' || typeof render !== 'function') return;
  window.__hallOfFameUI = true;

  const TAB = 'halloffame';
  let view = 'overview';
  let seenSent = false;
  const toasted = new Set();

  const T = {
    en: {
      tab: 'Hall of Fame', title: 'Hall of Fame', since: 'Tracking since', empty: 'No matches recorded yet for this club. Play or sim a series and come back.',
      overview: 'Overview', records: 'Records', players: 'Players', seasons: 'Seasons', achievements: 'Achievements',
      series: 'Series', games: 'Games', goals: 'Goals', trophies: 'Trophies', finals: 'Lost finals', streak: 'Best win streak', current: 'current',
      cabinet: 'Trophy cabinet', noTrophies: 'The cabinet is still empty.', legends: 'Legends', noLegends: 'No legends yet. Induct players from the Players tab.',
      leaders: 'All-time leaders', assists: 'Assists', saves: 'Saves', mvps: 'MVPs', apps: 'Games',
      nemesis: 'Bogey team', favourite: 'Favourite victim', record: 'Record', player: 'Player', wins: 'Win %', titles: 'Titles',
      period: 'Period', status: 'Status', atClub: 'At club', former: 'Former', retiredSt: 'Retired', induct: 'Induct', remove: 'Remove', candidate: 'Candidate',
      season: 'Season', topScorer: 'Top scorer', unlocked: 'Unlocked', locked: 'Locked', newAch: 'Achievement unlocked', vs: 'vs',
      otherClubs: 'Other clubs you managed',
      r_biggestWin: 'Biggest win', r_worstLoss: 'Heaviest defeat', r_mostGoalsGame: 'Most goals in a game (team)', r_playerGoalsGame: 'Most goals in a game (player)',
      r_playerSavesGame: 'Most saves in a game', r_playerPointsGame: 'Most points in a game', r_streak: 'Longest series win streak',
      a_first_win: ['First blood', 'Win your first series.'], a_series_50: ['Regulars', 'Play 50 series.'], a_series_100: ['Centenary', 'Play 100 series.'],
      a_goals_100: ['Hundred club', 'Score 100 goals.'], a_goals_500: ['Goal machine', 'Score 500 goals.'], a_streak_5: ['On fire', 'Win 5 series in a row.'],
      a_streak_10: ['Unstoppable', 'Win 10 series in a row.'], a_sweep: ['Clean sweep', 'Win a Bo5 or longer without dropping a game.'],
      a_comeback: ['Reverse sweep', 'Win a series after going 0-2 down.'], a_clean_sheet: ['The wall', 'Win a game without conceding.'],
      a_hattrick: ['Hat-trick', 'A player scores 3 goals in one game.'], a_five_goals: ['Masterclass', 'A player scores 5 goals in one game.'],
      a_first_final: ['Big stage', 'Reach a final.'], a_first_title: ['Silverware', 'Win a tournament.'], a_titles_5: ['Dynasty', 'Win 5 tournaments.'],
      a_major_title: ['Major champions', 'Win a Major.'], a_worlds_title: ['World champions', 'Win the World Championship.'],
      a_centurion: ['Centurion', 'A player scores 100 goals for the club.'], a_first_legend: ['Immortal', 'Induct your first legend.'],
    },
    es: {
      tab: 'Salón de la Fama', title: 'Salón de la Fama', since: 'Registro desde', empty: 'Todavía no hay partidos registrados para este club. Jugá o simulá una serie y volvé.',
      overview: 'Resumen', records: 'Récords', players: 'Jugadores', seasons: 'Temporadas', achievements: 'Logros',
      series: 'Series', games: 'Partidos', goals: 'Goles', trophies: 'Trofeos', finals: 'Finales perdidas', streak: 'Mejor racha', current: 'actual',
      cabinet: 'Vitrina de trofeos', noTrophies: 'La vitrina todavía está vacía.', legends: 'Leyendas', noLegends: 'Todavía no hay leyendas. Inducí jugadores desde la pestaña Jugadores.',
      leaders: 'Líderes históricos', assists: 'Asistencias', saves: 'Atajadas', mvps: 'MVPs', apps: 'Partidos',
      nemesis: 'Bestia negra', favourite: 'Víctima favorita', record: 'Récord', player: 'Jugador', wins: '% victorias', titles: 'Títulos',
      period: 'Período', status: 'Estado', atClub: 'En el club', former: 'Ex jugador', retiredSt: 'Retirado', induct: 'Inducir', remove: 'Quitar', candidate: 'Candidato',
      season: 'Temporada', topScorer: 'Goleador', unlocked: 'Desbloqueado', locked: 'Bloqueado', newAch: 'Logro desbloqueado', vs: 'vs',
      otherClubs: 'Otros clubes que dirigiste',
      r_biggestWin: 'Mayor goleada', r_worstLoss: 'Peor derrota', r_mostGoalsGame: 'Más goles en un partido (equipo)', r_playerGoalsGame: 'Más goles en un partido (jugador)',
      r_playerSavesGame: 'Más atajadas en un partido', r_playerPointsGame: 'Más puntos en un partido', r_streak: 'Racha más larga de series ganadas',
      a_first_win: ['Primera sangre', 'Ganá tu primera serie.'], a_series_50: ['Habitués', 'Jugá 50 series.'], a_series_100: ['Centenario', 'Jugá 100 series.'],
      a_goals_100: ['Club de los 100', 'Marcá 100 goles.'], a_goals_500: ['Máquina de goles', 'Marcá 500 goles.'], a_streak_5: ['En llamas', 'Ganá 5 series seguidas.'],
      a_streak_10: ['Imparables', 'Ganá 10 series seguidas.'], a_sweep: ['Barrida', 'Ganá una Bo5 o más larga sin perder un partido.'],
      a_comeback: ['Remontada', 'Ganá una serie después de ir 0-2 abajo.'], a_clean_sheet: ['La muralla', 'Ganá un partido sin recibir goles.'],
      a_hattrick: ['Hat-trick', 'Un jugador marca 3 goles en un partido.'], a_five_goals: ['Exhibición', 'Un jugador marca 5 goles en un partido.'],
      a_first_final: ['Gran escenario', 'Llegá a una final.'], a_first_title: ['Primer trofeo', 'Ganá un torneo.'], a_titles_5: ['Dinastía', 'Ganá 5 torneos.'],
      a_major_title: ['Campeones de Major', 'Ganá un Major.'], a_worlds_title: ['Campeones del mundo', 'Ganá el Campeonato Mundial.'],
      a_centurion: ['Centurión', 'Un jugador marca 100 goles para el club.'], a_first_legend: ['Inmortal', 'Inducí a tu primera leyenda.'],
    },
  };
  const lang = () => (typeof S !== 'undefined' && S && String(S.lang || '').startsWith('es') ? 'es' : 'en');
  const t = (k) => { const d = T[lang()]; return d[k] != null ? d[k] : T.en[k] != null ? T.en[k] : k; };
  const e = (v) => (typeof esc === 'function' ? esc(v) : String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const fmtDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? (lang() === 'es' ? `${m[3]}/${m[2]}/${m[1]}` : `${m[1]}-${m[2]}-${m[3]}`) : '—'; };
  const pct = (w, l) => (w + l ? Math.round((w / (w + l)) * 100) + '%' : '—');
  const snap = () => (typeof S !== 'undefined' && S && S.hof) || null;

  const CSS = `
  .hof{--g1:#f6d47a;--g2:#c9932e;--card:rgba(14,20,32,.86);--line:rgba(246,212,122,.18);color:#e8eef7;font-family:inherit;padding:6px 2px 30px}
  .hof-head{display:flex;align-items:center;gap:16px;padding:18px 22px;border-radius:14px;background:linear-gradient(120deg,rgba(201,147,46,.22),rgba(14,20,32,.9) 55%);border:1px solid var(--line);margin-bottom:14px}
  .hof-head .hof-crest{width:56px;height:56px;display:flex;align-items:center;justify-content:center}
  .hof-head .hof-crest img{max-width:56px;max-height:56px}
  .hof-h1{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--g1);font-weight:800}
  .hof-h2{font-size:26px;font-weight:900;line-height:1.1}
  .hof-sub{font-size:12px;opacity:.65;margin-top:3px}
  .hof-nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}
  .hof-nav button{background:var(--card);border:1px solid var(--line);color:#d9e2ee;padding:7px 14px;border-radius:999px;cursor:pointer;font:inherit;font-size:13px;font-weight:700}
  .hof-nav button.on{background:linear-gradient(180deg,var(--g1),var(--g2));color:#1a1204;border-color:transparent}
  .hof-nav .hof-dot{display:inline-block;min-width:18px;padding:0 5px;margin-left:6px;border-radius:9px;background:#e5484d;color:#fff;font-size:11px}
  .hof-grid{display:grid;gap:12px}
  .hof-stats{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
  .hof-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .hof-card h3{margin:0 0 10px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--g1)}
  .hof-stat .v{font-size:24px;font-weight:900}
  .hof-stat .k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6;margin-top:2px}
  .hof-stat .s{font-size:12px;opacity:.75;margin-top:4px}
  .hof-two{grid-template-columns:repeat(auto-fit,minmax(320px,1fr));margin-top:12px}
  .hof-trophy{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)}
  .hof-trophy:last-child{border-bottom:0}
  .hof-trophy .i{font-size:20px}
  .hof-trophy .n{font-weight:800}
  .hof-trophy .d{font-size:12px;opacity:.6;margin-left:auto;white-space:nowrap}
  .hof-legends{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
  .hof-legend{border-radius:12px;padding:12px;background:linear-gradient(160deg,rgba(246,212,122,.2),rgba(14,20,32,.95));border:1px solid rgba(246,212,122,.45);text-align:center}
  .hof-legend .n{font-size:16px;font-weight:900;color:#fff}
  .hof-legend .y{font-size:11px;opacity:.65;margin:2px 0 8px}
  .hof-legend .l{display:flex;justify-content:center;gap:10px;font-size:12px}
  .hof-legend .l b{display:block;font-size:15px;color:var(--g1)}
  .hof-boards{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
  .hof-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:13px}
  .hof-row .r{opacity:.5;width:18px}
  .hof-row .nm{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hof-row .vl{font-weight:800;color:var(--g1)}
  .hof-muted{opacity:.6;font-size:13px}
  .hof-table{width:100%;border-collapse:collapse;font-size:13px}
  .hof-table th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;padding:6px 8px;border-bottom:1px solid var(--line)}
  .hof-table td{padding:7px 8px;border-bottom:1px solid rgba(255,255,255,.05)}
  .hof-table td.num,.hof-table th.num{text-align:right}
  .hof-table tr.legend td:first-child{color:var(--g1);font-weight:800}
  .hof-tag{display:inline-block;font-size:10px;padding:2px 7px;border-radius:9px;border:1px solid rgba(255,255,255,.2);opacity:.85}
  .hof-tag.gold{border-color:var(--g1);color:var(--g1)}
  .hof-btn{background:transparent;border:1px solid var(--g2);color:var(--g1);border-radius:8px;padding:3px 10px;cursor:pointer;font:inherit;font-size:12px;font-weight:700}
  .hof-btn:hover{background:rgba(246,212,122,.15)}
  .hof-records{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
  .hof-rec .v{font-size:30px;font-weight:900;color:var(--g1)}
  .hof-rec .w{font-weight:800;margin-top:2px}
  .hof-rec .c{font-size:12px;opacity:.65;margin-top:3px}
  .hof-ach{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
  .hof-a{display:flex;gap:12px;align-items:flex-start}
  .hof-a .i{font-size:28px;filter:grayscale(1);opacity:.45}
  .hof-a.on .i{filter:none;opacity:1}
  .hof-a .n{font-weight:900}
  .hof-a .d{font-size:12px;opacity:.7;margin:2px 0 6px}
  .hof-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
  .hof-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--g2),var(--g1))}
  .hof-a.on{border-color:rgba(246,212,122,.55)}
  .hof-tabbadge{display:inline-block;min-width:16px;padding:0 4px;margin-left:5px;border-radius:8px;background:#e5484d;color:#fff;font-size:10px;line-height:16px}
  .hof-toast{position:fixed;right:22px;bottom:22px;z-index:99999;display:flex;gap:12px;align-items:center;padding:12px 16px;border-radius:12px;background:linear-gradient(120deg,#2a1f08,#0e1420);border:1px solid #f6d47a;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.55);transform:translateY(20px);opacity:0;transition:all .3s}
  .hof-toast.in{transform:none;opacity:1}
  .hof-toast .i{font-size:28px}.hof-toast .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#f6d47a}.hof-toast .n{font-weight:900}
  `;
  if (!document.getElementById('hof-style')) {
    const st = document.createElement('style');
    st.id = 'hof-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function clubCrest(teamId) {
    try {
      const tm = typeof teamById === 'function' ? teamById(teamId) : null;
      return tm && typeof crest === 'function' ? crest(tm, 'big') : '';
    } catch { return ''; }
  }

  function achName(key) { const v = t('a_' + key); return Array.isArray(v) ? v[0] : key; }
  function achDesc(key) { const v = t('a_' + key); return Array.isArray(v) ? v[1] : ''; }
  function achIcon(key, h) { const a = (h.achievements || []).find((x) => x.key === key); return a ? a.icon : '🏅'; }
  function trophyIcon(kind) { return kind === 'worlds' ? '👑' : kind === 'major' ? '🌍' : kind === 'lcq' ? '🎟️' : '🏆'; }

  async function sendCmd(cmd) {
    const X = window.__xt;
    if (X && X.viaAddonManager && X.viaAddonManager()) {
      try { const res = await X.callLib('hof', cmd); render(); return res; } catch (err) { console.warn('[Hall of Fame]', err); return null; }
    }
    if (!window.hub || typeof window.hub.placeBet !== 'function') return null;
    try {
      const res = await window.hub.placeBet({ kind: 'hof:' + JSON.stringify(cmd), ref: 0, teamId: 0, stake: 0 });
      if (res && res.career !== undefined) { S = res; render(); }
      return res;
    } catch (err) {
      console.warn('[Hall of Fame]', err);
      return null;
    }
  }

  function showToast(key, h) {
    const el = document.createElement('div');
    el.className = 'hof-toast';
    el.innerHTML = `<div class="i">${achIcon(key, h)}</div><div><div class="k">${e(t('newAch'))}</div><div class="n">${e(achName(key))}</div></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 4200);
  }

  function announce(h) {
    const list = (h && h.unseen) || [];
    let delay = 0;
    for (const key of list) {
      if (toasted.has(key)) continue;
      toasted.add(key);
      setTimeout(() => showToast(key, h), delay);
      delay += 900;
    }
  }

  // ---------- pages ----------
  function statCard(v, k, s) {
    return `<div class="hof-card hof-stat"><div class="v">${v}</div><div class="k">${e(k)}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
  }

  function board(title, rows, n) {
    const body = rows && rows.length
      ? rows.slice(0, n || 5).map((r, i) => `<div class="hof-row"><span class="r">${i + 1}</span><span class="nm">${e(r.name)}</span><span class="vl">${r.value}</span></div>`).join('')
      : '<div class="hof-muted">—</div>';
    return `<div class="hof-card"><h3>${e(title)}</h3>${body}</div>`;
  }

  function overviewHtml(h) {
    const c = h.club;
    const stats = [
      statCard(`${c.series.w}-${c.series.l}`, t('series'), pct(c.series.w, c.series.l)),
      statCard(`${c.games.w}-${c.games.l}`, t('games'), pct(c.games.w, c.games.l)),
      statCard(`${c.goals.f}`, t('goals'), `${c.goals.f} : ${c.goals.a}`),
      statCard(`${c.titles.length}`, t('trophies'), `${c.finals.length} ${e(t('finals')).toLowerCase()}`),
      statCard(`${c.streak.best}`, t('streak'), `${c.streak.cur} ${e(t('current'))}`),
    ].join('');
    const cabinet = c.titles.length
      ? c.titles.map((x) => `<div class="hof-trophy"><span class="i">${trophyIcon(x.kind)}</span><span class="n">${e(x.name)}</span><span class="d">${x.year || ''}</span></div>`).join('')
      : `<div class="hof-muted">${e(t('noTrophies'))}</div>`;
    const legends = h.legends.length
      ? `<div class="hof-legends">${h.legends.map((l) => `<div class="hof-legend"><div>🏛️</div><div class="n">${e(l.name)}</div><div class="y">${(l.first || '').slice(0, 4)}–${(l.last || '').slice(0, 4)}</div><div class="l"><span><b>${l.games}</b>${e(t('apps'))}</span><span><b>${l.goals}</b>${e(t('goals'))}</span><span><b>${l.titles}</b>${e(t('titles'))}</span></div></div>`).join('')}</div>`
      : `<div class="hof-muted">${e(t('noLegends'))}</div>`;
    const rivals = [
      c.nemesis ? `<div class="hof-row"><span class="nm">😈 ${e(t('nemesis'))}: <b>${e(c.nemesis.name)}</b></span><span class="vl">${c.nemesis.w}-${c.nemesis.l}</span></div>` : '',
      c.favourite ? `<div class="hof-row"><span class="nm">😎 ${e(t('favourite'))}: <b>${e(c.favourite.name)}</b></span><span class="vl">${c.favourite.w}-${c.favourite.l}</span></div>` : '',
    ].join('');
    const L = h.leaders;
    return `
      <div class="hof-grid hof-stats">${stats}</div>
      <div class="hof-grid hof-two">
        <div class="hof-card"><h3>${e(t('cabinet'))}</h3>${cabinet}${rivals ? `<div style="margin-top:12px">${rivals}</div>` : ''}</div>
        <div class="hof-card"><h3>${e(t('legends'))}</h3>${legends}</div>
      </div>
      <div class="hof-card" style="margin-top:12px"><h3>${e(t('leaders'))}</h3>
        <div class="hof-grid hof-boards">
          ${board(t('goals'), L.goals)}${board(t('assists'), L.assists)}${board(t('saves'), L.saves)}${board(t('mvps'), L.mvps)}${board(t('apps'), L.games)}
        </div>
      </div>
      ${h.otherClubs && h.otherClubs.length ? `<div class="hof-card" style="margin-top:12px"><h3>${e(t('otherClubs'))}</h3>${h.otherClubs.map((o) => `<div class="hof-row"><span class="nm">${e(o.name)}</span><span class="vl">${o.series.w}-${o.series.l} · ${o.titles} 🏆</span></div>`).join('')}</div>` : ''}`;
  }

  function recordsHtml(h) {
    const R = h.records || {};
    const ctx = (r) => [r.opp ? `${t('vs')} ${e(r.opp)}` : '', r.event ? e(r.event) : '', fmtDate(r.date)].filter(Boolean).join(' · ');
    const cards = [];
    const add = (key, r, big, who) => { if (r) cards.push(`<div class="hof-card hof-rec"><h3>${e(t(key))}</h3><div class="v">${big}</div>${who ? `<div class="w">${e(who)}</div>` : ''}<div class="c">${ctx(r)}</div></div>`); };
    add('r_biggestWin', R.biggestWin, R.biggestWin && R.biggestWin.score);
    add('r_worstLoss', R.worstLoss, R.worstLoss && R.worstLoss.score);
    add('r_mostGoalsGame', R.mostGoalsGame, R.mostGoalsGame && R.mostGoalsGame.score);
    add('r_playerGoalsGame', R.playerGoalsGame, R.playerGoalsGame && R.playerGoalsGame.value, R.playerGoalsGame && R.playerGoalsGame.name);
    add('r_playerSavesGame', R.playerSavesGame, R.playerSavesGame && R.playerSavesGame.value, R.playerSavesGame && R.playerSavesGame.name);
    add('r_playerPointsGame', R.playerPointsGame, R.playerPointsGame && R.playerPointsGame.value, R.playerPointsGame && R.playerPointsGame.name);
    const s = h.club.streak;
    if (s.best) cards.push(`<div class="hof-card hof-rec"><h3>${e(t('r_streak'))}</h3><div class="v">${s.best}</div><div class="c">${fmtDate(s.bestTo)}</div></div>`);
    return `<div class="hof-grid hof-records">${cards.join('') || `<div class="hof-muted">—</div>`}</div>`;
  }

  function playersHtml(h) {
    const rows = h.players.map((p) => {
      const status = p.atClub ? t('atClub') : p.retired ? t('retiredSt') : t('former');
      const tags = (p.legend ? ` <span class="hof-tag gold">🏛️</span>` : '') + (p.candidate ? ` <span class="hof-tag gold">${e(t('candidate'))}</span>` : '');
      const btn = p.legend
        ? `<button class="hof-btn" data-hof-cmd="uninduct" data-hof-pid="${p.pid}">${e(t('remove'))}</button>`
        : `<button class="hof-btn" data-hof-cmd="induct" data-hof-pid="${p.pid}">${e(t('induct'))}</button>`;
      return `<tr class="${p.legend ? 'legend' : ''}"><td>${e(p.name)}${tags}</td><td class="num">${p.games}</td><td class="num">${pct(p.wins, p.games - p.wins)}</td><td class="num">${p.goals}</td><td class="num">${p.assists}</td><td class="num">${p.saves}</td><td class="num">${p.mvps}</td><td class="num">${p.titles}</td><td>${(p.first || '').slice(0, 4)}–${(p.last || '').slice(0, 4)}</td><td><span class="hof-tag">${e(status)}</span></td><td>${btn}</td></tr>`;
    }).join('');
    return `<div class="hof-card"><table class="hof-table"><thead><tr><th>${e(t('player'))}</th><th class="num">${e(t('apps'))}</th><th class="num">${e(t('wins'))}</th><th class="num">${e(t('goals'))}</th><th class="num">${e(t('assists'))}</th><th class="num">${e(t('saves'))}</th><th class="num">${e(t('mvps'))}</th><th class="num">${e(t('titles'))}</th><th>${e(t('period'))}</th><th>${e(t('status'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function seasonsHtml(h) {
    const rows = h.seasons.map((s) => `<tr><td>${e(t('season'))} ${s.season || ''} <span class="hof-muted">(${s.year || ''})</span></td><td class="num">${s.series.w}-${s.series.l}</td><td class="num">${s.games.w}-${s.games.l}</td><td class="num">${s.goals.f}:${s.goals.a}</td><td>${s.titles.length ? s.titles.map((x) => '🏆 ' + e(x)).join('<br>') : '—'}</td><td>${s.top ? e(s.top.name) + ` <b style="color:#f6d47a">${s.top.goals}</b>` : '—'}</td></tr>`).join('');
    return `<div class="hof-card"><table class="hof-table"><thead><tr><th>${e(t('season'))}</th><th class="num">${e(t('series'))}</th><th class="num">${e(t('games'))}</th><th class="num">${e(t('goals'))}</th><th>${e(t('titles'))}</th><th>${e(t('topScorer'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function achievementsHtml(h) {
    return `<div class="hof-grid hof-ach">${h.achievements.map((a) => {
      const on = !!a.unlocked;
      const w = Math.round((a.progress / a.target) * 100);
      return `<div class="hof-card hof-a ${on ? 'on' : ''}"><div class="i">${a.icon}</div><div style="flex:1"><div class="n">${e(achName(a.key))}</div><div class="d">${e(achDesc(a.key))}</div>${on ? `<div class="hof-muted">✔ ${e(t('unlocked'))} ${fmtDate(a.unlocked)}</div>` : `<div class="hof-bar"><i style="width:${w}%"></i></div><div class="hof-muted" style="margin-top:4px">${a.progress} / ${a.target}</div>`}</div></div>`;
    }).join('')}</div>`;
  }

  function pageHtml() {
    const h = snap();
    if (!h || !h.club) {
      return `<div class="hof"><div class="hof-head"><div><div class="hof-h1">🏛️ ${e(t('title'))}</div><div class="hof-sub">${e(t('empty'))}</div></div></div></div>`;
    }
    if (h.unseen && h.unseen.length && !seenSent) {
      seenSent = true;
      setTimeout(() => sendCmd({ op: 'seen' }).finally(() => { seenSent = false; }), 1500);
    }
    const views = ['overview', 'records', 'players', 'seasons', 'achievements'];
    const unlockedCount = h.achievements.filter((a) => a.unlocked).length;
    const nav = views.map((v) => `<button class="${v === view ? 'on' : ''}" data-hof-view="${v}">${e(t(v))}${v === 'achievements' ? ` <span class="hof-muted">${unlockedCount}/${h.achievements.length}</span>` : ''}</button>`).join('');
    const body = view === 'records' ? recordsHtml(h) : view === 'players' ? playersHtml(h) : view === 'seasons' ? seasonsHtml(h) : view === 'achievements' ? achievementsHtml(h) : overviewHtml(h);
    return `<div class="hof">
      <div class="hof-head"><div class="hof-crest">${clubCrest(h.club.teamId)}</div><div><div class="hof-h1">🏛️ ${e(t('title'))}</div><div class="hof-h2">${e(h.club.name)}</div><div class="hof-sub">${e(t('since'))} ${fmtDate(h.since)}</div></div></div>
      <div class="hof-nav">${nav}</div>
      ${body}
    </div>`;
  }

  // ---------- hooks into the Hub's renderer ----------
  const origTop = topbarHtml;
  topbarHtml = function () {
    const html = origTop.apply(this, arguments);
    const h = snap();
    if (!h) return html;
    const badge = h.unseen && h.unseen.length ? `<span class="hof-tabbadge">${h.unseen.length}</span>` : '';
    const btn = `<button class="xt-tb ${tab === TAB ? 'active' : ''}" data-action="tab" data-tab="${TAB}" style="color:#f6d47a">🏛️ ${e(t('tab'))}${badge}</button>`;
    const setup = /<button[^>]*data-tab="setup"[^>]*>[\s\S]*?<\/button>/;
    if (setup.test(html)) return html.replace(setup, (m) => btn + m);
    const all = html.match(/<button[^>]*data-tab="[^"]+"[^>]*>[\s\S]*?<\/button>/g);
    if (all && all.length) {
      const last = all[all.length - 1];
      const idx = html.lastIndexOf(last) + last.length;
      return html.slice(0, idx) + btn + html.slice(idx);
    }
    return html;
  };

  const origInner = tabInnerHtml;
  tabInnerHtml = function () {
    if (tab !== TAB) return origInner.apply(this, arguments);
    try { return pageHtml(); } catch (err) { console.error('[Hall of Fame]', err); return '<div class="hof"><div class="hof-card">Hall of Fame error: ' + e(err.message) + '</div></div>'; }
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target && ev.target.closest && ev.target.closest('[data-hof-view],[data-hof-cmd]');
    if (!el) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (el.dataset.hofView) { view = el.dataset.hofView; render(); return; }
    if (el.dataset.hofCmd) sendCmd({ op: el.dataset.hofCmd, pid: Number(el.dataset.hofPid) });
  }, true);

  // Toasts for new achievements, whatever tab is open.
  setInterval(() => { const h = snap(); if (h && h.unseen && h.unseen.length) announce(h); }, 2000);

  if (typeof S !== 'undefined' && S && S.career && !S.hof && window.hub && typeof window.hub.getState === 'function') {
    window.hub.getState().then((ns) => { if (ns && ns.career !== undefined) { S = ns; render(); } }).catch(() => {});
  }
  try { render(); } catch { }
})();
