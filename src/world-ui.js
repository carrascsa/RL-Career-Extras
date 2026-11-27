// RL Career Extras — "RL World" tab: world top (all-time / current / teams), prospects radar,
// drama & orgs, and the mod manager.
(function () {
  const X = window.__xt;
  if (!X || window.__xtWorldUi) return;
  window.__xtWorldUi = true;
  const TAB = 'xtworld';
  const e = X.e;

  const D = {
    en: {
      tab: 'RL World', title: 'RL World', sub: 'Rankings, prospects, drama, orgs and your mods',
      v_top: 'World top', v_prospects: 'Prospects', v_drama: 'Drama & orgs', v_mods: 'Mods', v_editor: 'Player editor',
      ed_info: 'Change any player\'s name, photo and PlayStyle (the bot he plays as in real Rocket League matches). Everything else stays: rating, contract, titles and stats.',
      ed_search: 'Search a player', ed_go: 'Search', ed_team: 'Team', ed_myteam: 'My team', ed_edit: 'Edit', ed_name: 'Name', ed_saveName: 'Save name',
      ed_photo: 'Photo', ed_upload: 'Upload image', ed_style: 'PlayStyle', ed_apply: 'Apply', ed_reset: 'Restore original', ed_edited: 'edited',
      ed_styleInfo: 'Main style · bot · secondary styles. With the Hub\'s V1 bot system (everyone is Nexto) PlayStyles have no effect.',
      ed_pick: 'Pick a player to edit.', ed_none: 'No players found.', ed_renamed: 'Renamed', ed_styled: 'New PlayStyle', ed_photoDone: 'Photo updated', ed_restored: 'Restored', ed_loading: 'Loading…',
      allTime: 'All-time', current: 'Right now', teams: 'Teams',
      allTimeInfo: 'Every RLCS title counts: the real ones from Liquipedia (Season 1, 2016 → RLCS 2026, shipped with the Hub) plus what is won in this career. Legends who retired before this world starts are listed too.',
      currentInfo: 'Rating, form, this season\'s numbers and titles from the last two years.',
      teamsInfo: 'Ranking points this season, then lineup strength.',
      player: 'Player', team: 'Team', pts: 'Pts', worlds: 'Worlds', majors: 'Majors', finals: 'Finals', solo: '1v1/2v2', span: 'Years', real: 'Real', career: 'Career', mvp: 'Season MVP',
      rating: 'Rtg', form: 'Form', games: 'GP', g: 'G', a: 'A', s: 'S', wr: 'Win%', recent: 'Titles 2y', score: 'Score', strength: 'Lineup', region: 'Reg', roster: 'Roster',
      retired: 'Retired', fa: 'Free agent', age: 'Age', legend: 'Legend (not in this world)',
      radar: 'Prospect radar (20 and under)', radarInfo: 'Every season a new class of teenagers appears as free agents in each region, plus the odd ranked breakout. Sign them from the Hub\'s transfer screens before someone else does.',
      pot: 'Pot', newTag: 'NEW', radarFa: 'Free agents — sign them now', radarClub: 'Already at clubs', youngLog: 'Latest classes and breakouts', classLog: 'Season {s} class: {n} prospects. Best: {b}', breakout: 'Ranked breakout: {name} ({age}, {r})',
      decide: 'Needs a decision', leftDays: '{n} days left (then: {d})', noPending: 'Nothing to handle right now. Controversies and Y beefs show up here.',
      dramaLog: 'Recent drama', beefs: 'Beefs on Y', orgs: 'Org moves', feud: 'Active feud: {p} vs {o}. The next series between you settles it.',
      ch_defend: 'backed', ch_fine: 'fined', ch_apologise: 'apologised', ch_ignore: 'ignored', ch_calm: 'deleted', ch_fuel: 'let it run', ch_won: 'won the grudge match', ch_lost: 'lost the grudge match', auto: '(no answer)',
      k_rage: 'stream rage', k_leak: 'leaked DMs', k_party: 'party photos', k_cheat: 'cheating claim', k_contract: 'contract tweet', k_feud: 'grudge match',
      o_sale: '{from} sold their slot → {to}', o_merge: '{from} merged into {m} ({star}); slot → {to}', o_founded: '{to} founded (bought {from}\'s slot)',
      found: 'Found a new organisation', foundInfo: 'Buys the weakest AI club\'s slot in that region and renames it (name, tag, colours and a logo).', name: 'Name', tag: 'Tag', create: 'Create',
      merge: 'Merge a smaller club into yours', mergeInfo: 'Once per season. You pay the fee, sign their best player and half their fanbase; their slot goes to a new org.', star: 'Best player', fee: 'Fee', doMerge: 'Merge',
      mergeDone: 'Already merged this season.', mergeNone: 'No smaller club in your region.', confirmMerge: 'Merge {t} into your club for {m}?',
      modsInfo: 'Switch any part of Career Extras on or off for this career. A module that is off stops running and hides its screens; switching it back on picks up from today (nothing is replayed). Your data is kept.',
      on: 'On', off: 'Off', allOn: 'All on', allOff: 'All off', always: 'Always on',
      foundDone: '{n} is born', mergedDone: '{s} joins you', decided: 'Done',
    },
    es: {
      tab: 'Mundo RL', title: 'Mundo RL', sub: 'Rankings, promesas, drama, organizaciones y tus mods',
      v_top: 'Top mundial', v_prospects: 'Promesas', v_drama: 'Drama y orgs', v_mods: 'Mods', v_editor: 'Editor de jugadores',
      ed_info: 'Cambiá el nombre, la foto y el estilo de juego (el bot con el que juega en los partidos reales) de cualquier jugador. Todo lo demás queda igual: nivel, contrato, títulos y estadísticas.',
      ed_search: 'Buscar un jugador', ed_go: 'Buscar', ed_team: 'Equipo', ed_myteam: 'Mi equipo', ed_edit: 'Editar', ed_name: 'Nombre', ed_saveName: 'Guardar nombre',
      ed_photo: 'Foto', ed_upload: 'Subir imagen', ed_style: 'Estilo de juego', ed_apply: 'Aplicar', ed_reset: 'Restaurar original', ed_edited: 'editado',
      ed_styleInfo: 'Estilo principal · bot · estilos secundarios. Con el sistema de bots V1 del Hub (todos son Nexto) el estilo no tiene efecto.',
      ed_pick: 'Elegí un jugador para editar.', ed_none: 'No hay jugadores.', ed_renamed: 'Nombre cambiado', ed_styled: 'Nuevo estilo', ed_photoDone: 'Foto actualizada', ed_restored: 'Restaurado', ed_loading: 'Cargando…',
      allTime: 'Histórico', current: 'Actual', teams: 'Equipos',
      allTimeInfo: 'Cuenta cada título RLCS: los reales de Liquipedia (Temporada 1, 2016 → RLCS 2026, incluidos en el Hub) más lo que se gane en esta carrera. También figuran las leyendas que ya estaban retiradas cuando empieza este mundo.',
      currentInfo: 'Media, forma, números de esta temporada y títulos de los últimos dos años.',
      teamsInfo: 'Puntos de ranking de la temporada y después la fuerza de la alineación.',
      player: 'Jugador', team: 'Equipo', pts: 'Pts', worlds: 'Mundiales', majors: 'Majors', finals: 'Finales', solo: '1v1/2v2', span: 'Años', real: 'Reales', career: 'Carrera', mvp: 'MVP de temporada',
      rating: 'Med', form: 'Forma', games: 'PJ', g: 'G', a: 'A', s: 'At', wr: '%Vic', recent: 'Títulos 2a', score: 'Puntaje', strength: 'Alineación', region: 'Reg', roster: 'Plantel',
      retired: 'Retirado', fa: 'Agente libre', age: 'Edad', legend: 'Leyenda (fuera del juego)',
      radar: 'Radar de promesas (20 años o menos)', radarInfo: 'Cada temporada aparece una camada nueva de adolescentes como agentes libres en cada región, y de vez en cuando alguno explota en ranked. Fichalos desde los traspasos del Hub antes que otro.',
      pot: 'Pot', newTag: 'NUEVO', radarFa: 'Agentes libres — se pueden fichar ya', radarClub: 'Ya están en clubes', youngLog: 'Últimas camadas y revelaciones', classLog: 'Camada temporada {s}: {n} promesas. Las mejores: {b}', breakout: 'Revelación en ranked: {name} ({age}, {r})',
      decide: 'Necesita una decisión', leftDays: 'Quedan {n} días (si no: {d})', noPending: 'Nada para resolver ahora. Acá aparecen las polémicas y las peleas en Y.',
      dramaLog: 'Polémicas recientes', beefs: 'Peleas en Y', orgs: 'Movimientos de organizaciones', feud: 'Pelea activa: {p} vs {o}. La próxima serie entre ustedes lo define.',
      ch_defend: 'lo respaldaste', ch_fine: 'lo multaste', ch_apologise: 'pediste disculpas', ch_ignore: 'no dijiste nada', ch_calm: 'lo borró', ch_fuel: 'lo dejaste seguir', ch_won: 'ganó el revanchismo', ch_lost: 'perdió el revanchismo', auto: '(sin respuesta)',
      k_rage: 'enojo en stream', k_leak: 'DMs filtrados', k_party: 'fotos de fiesta', k_cheat: 'acusación de trampa', k_contract: 'tweet por contrato', k_feud: 'partido de revancha',
      o_sale: '{from} vendió su plaza → {to}', o_merge: '{from} se fusionó con {m} ({star}); plaza → {to}', o_founded: 'Nace {to} (compró la plaza de {from})',
      found: 'Fundar una organización nueva', foundInfo: 'Compra la plaza del club IA más débil de esa región y la renombra (nombre, sigla, colores y logo).', name: 'Nombre', tag: 'Sigla', create: 'Crear',
      merge: 'Fusionar un club más chico con el tuyo', mergeInfo: 'Una vez por temporada. Pagás la cuota, te quedás con su mejor jugador y la mitad de sus seguidores; su plaza pasa a una organización nueva.', star: 'Mejor jugador', fee: 'Cuota', doMerge: 'Fusionar',
      mergeDone: 'Ya hiciste una fusión esta temporada.', mergeNone: 'No hay clubes más chicos en tu región.', confirmMerge: '¿Fusionar {t} con tu club por {m}?',
      modsInfo: 'Prendé o apagá cualquier parte de Career Extras en esta carrera. Un módulo apagado deja de funcionar y esconde sus pantallas; al prenderlo sigue desde hoy (no se repiten días). Tus datos se guardan.',
      on: 'Prendido', off: 'Apagado', allOn: 'Prender todo', allOff: 'Apagar todo', always: 'Siempre activo',
      foundDone: 'Nace {n}', mergedDone: '{s} se suma a tu club', decided: 'Listo',
    },
  };
  const t = (k, p) => X.tr(D, k, p);
  const args = (o) => e(JSON.stringify(o));

  const MODS = [
    ['hof', '🏛️', { en: 'Hall of Fame', es: 'Salón de la Fama' }, { en: 'Legends, records and club history.', es: 'Leyendas, récords e historia del club.' }],
    ['academy', '🎓', { en: 'Academy & B team', es: 'Cantera y Equipo B' }, { en: 'Youth prospects, B team and development league.', es: 'Juveniles, Equipo B y liga de desarrollo.' }],
    ['matchday', '📋', { en: 'Match day & press', es: 'Previa y prensa' }, { en: 'Scouting reports, game plans and press conferences.', es: 'Informes del rival, planes de juego y conferencias.' }],
    ['club', '🏢', { en: 'Dressing room & board', es: 'Vestuario y directiva' }, { en: 'Internal conflicts and investor offers.', es: 'Conflictos internos y ofertas de inversores.' }],
    ['talk', '💬', { en: 'Talks', es: 'Charlas' }, { en: 'Talk to players and the coach; some reply, some ignore you.', es: 'Hablá con jugadores y el DT; algunos responden y otros te ignoran.' }],
    ['world', '🌍', { en: 'Rotating hosts', es: 'Sedes rotativas' }, { en: 'Majors and Worlds in 58 cities.', es: 'Majors y Mundiales en 58 ciudades.' }],
    ['circuit', '🏟️', { en: 'Circuit (S–D tiers, 1v1, 2v2, fun modes)', es: 'Circuito (tiers S–D, 1v1, 2v2, modos)' }, { en: 'Extra tournaments with prize money.', es: 'Torneos extra con premios.' }],
    ['freestyle', '🤸', { en: 'Freestyle division', es: 'División Freestyle' }, { en: 'Freestylers, hype and freestyle events.', es: 'Freestylers, hype y torneos de freestyle.' }],
    ['travel', '✈️', { en: 'Travel', es: 'Viajes' }, { en: 'Jet lag, visas, bootcamps and home crowds.', es: 'Jet lag, visas, bootcamps y público local.' }],
    ['awards', '🏆', { en: 'Awards & All-Star', es: 'Premios y All-Star' }, { en: 'End-of-season awards and the All-Star game.', es: 'Premios de fin de temporada y el All-Star.' }],
    ['sponsor', '🤝', { en: 'Sponsors with goals', es: 'Sponsors con objetivos' }, { en: 'Deals that pay bonuses for targets.', es: 'Contratos que pagan bonus por objetivos.' }],
    ['wellbeing', '🔋', { en: 'Streaming & burnout', es: 'Streaming y burnout' }, { en: 'Fatigue, streaming income and vacations.', es: 'Cansancio, ingresos por stream y vacaciones.' }],
    ['ysocial', '🐦', { en: 'Livelier Y', es: 'Y más vivo' }, { en: 'Fresh posts, fan reactions to your results, rumours and power rankings.', es: 'Posts nuevos, reacciones a tus resultados, rumores y power rankings.' }],
    ['prospects', '🌱', { en: 'World prospects', es: 'Promesas mundiales' }, { en: 'New teenage free agents every season and ranked breakouts.', es: 'Adolescentes nuevos como agentes libres cada temporada y revelaciones de ranked.' }],
    ['drama', '🔥', { en: 'Drama & orgs', es: 'Drama y organizaciones' }, { en: 'Controversies, Y beefs, mergers, slot sales and new orgs.', es: 'Polémicas, peleas en Y, fusiones, ventas de plazas y orgs nuevas.' }],
    ['caster', '📺', { en: 'Caster', es: 'Caster' }, { en: 'Replays of your series with two casters, a scoreboard and voice.', es: 'Repeticiones de tus series con dos casters, marcador y voz.' }],
    ['editor', '✏️', { en: 'Player editor', es: 'Editor de jugadores' }, { en: 'Rename players, change their photo and PlayStyle.', es: 'Cambiá nombre, foto y estilo de juego de los jugadores.' }],
    ['ranking', '📊', { en: 'World top', es: 'Top mundial' }, { en: 'All-time and current player rankings.', es: 'Rankings de jugadores históricos y actuales.' }],
  ];

  let topView = 'allTime';
  const L = () => X.lang();
  const flagless = (s) => e(s || '');
  const status = (r) => (r.team ? e(r.team) : r.status === 'legend' ? `<span class="xt-pill">${e(t('legend'))}</span>` : r.status === 'retired' ? `<span class="xt-muted">${e(t('retired'))}</span>` : `<span class="xt-muted">${e(t('fa'))}</span>`);
  const rowCls = (r) => (r.mine || r.user ? ' class="me"' : '');

  function topAll(R) {
    const rows = R.allTime.map((r) => `<tr${rowCls(r)}><td class="num">${r.rank}</td><td><b>${e(r.name)}</b> <span class="xt-muted">${flagless(r.nation)}</span></td><td>${status(r)}</td>
      <td class="num">${r.worlds || ''}</td><td class="num">${r.majors || ''}</td><td class="num">${r.finals || ''}</td><td class="num">${r.solo || ''}</td><td class="num">${r.mvps || ''}</td>
      <td class="num">${e(r.span)}</td><td class="num"><b>${r.pts}</b>${r.career ? ` <span class="xt-pill acc" title="${e(t('career'))}">+${r.career}</span>` : ''}</td></tr>`).join('');
    return `<div class="xt-muted" style="margin-bottom:8px">${e(t('allTimeInfo'))}</div><table class="xt-table"><thead><tr><th class="num">#</th><th>${e(t('player'))}</th><th>${e(t('team'))}</th>
      <th class="num">${e(t('worlds'))}</th><th class="num">${e(t('majors'))}</th><th class="num">${e(t('finals'))}</th><th class="num">${e(t('solo'))}</th><th class="num" title="${e(t('mvp'))}">MVP</th><th class="num">${e(t('span'))}</th><th class="num">${e(t('pts'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function topNow(R) {
    const rows = R.current.map((r) => `<tr${rowCls(r)}><td class="num">${r.rank}</td><td><b>${e(r.name)}</b> <span class="xt-muted">${flagless(r.nation)} · ${r.age}</span></td><td>${e(r.team)}</td>
      <td class="num">${r.rating}</td><td class="num">${r.form > 0 ? '+' : ''}${r.form}</td><td class="num">${r.games}</td><td class="num">${r.goals}</td><td class="num">${r.assists}</td><td class="num">${r.saves}</td>
      <td class="num">${r.winRate}</td><td class="num">${r.recent || ''}</td><td class="num"><b>${r.score}</b></td></tr>`).join('');
    return `<div class="xt-muted" style="margin-bottom:8px">${e(t('currentInfo'))}</div><table class="xt-table"><thead><tr><th class="num">#</th><th>${e(t('player'))}</th><th>${e(t('team'))}</th>
      <th class="num">${e(t('rating'))}</th><th class="num">${e(t('form'))}</th><th class="num">${e(t('games'))}</th><th class="num">${e(t('g'))}</th><th class="num">${e(t('a'))}</th><th class="num">${e(t('s'))}</th><th class="num">${e(t('wr'))}</th><th class="num">${e(t('recent'))}</th><th class="num">${e(t('score'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function topTeams(R) {
    const rows = R.teams.map((r) => `<tr${rowCls(r)}><td class="num">${r.rank}</td><td><b>${e(r.name)}</b></td><td>${e(String(r.region || '').toUpperCase())}</td><td class="xt-muted">${e(r.roster.join(', '))}</td><td class="num">${r.strength}</td><td class="num"><b>${r.pts}</b></td></tr>`).join('');
    return `<div class="xt-muted" style="margin-bottom:8px">${e(t('teamsInfo'))}</div><table class="xt-table"><thead><tr><th class="num">#</th><th>${e(t('team'))}</th><th>${e(t('region'))}</th><th>${e(t('roster'))}</th><th class="num">${e(t('strength'))}</th><th class="num">${e(t('pts'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function topView_(R) {
    if (!R) return off('ranking');
    const nav = ['allTime', 'current', 'teams'].map((k) => `<button class="xt-btn ${topView === k ? 'on' : ''}" data-xt-local="top:${k}">${e(t(k))}</button>`).join(' ');
    const body = topView === 'current' ? topNow(R) : topView === 'teams' ? topTeams(R) : topAll(R);
    return `<div class="xt-card"><h3><span>📊 ${e(t('v_top'))}</span><span class="xt-actions">${nav}</span></h3>${body}</div>`;
  }

  function prospectsView(P) {
    if (!P) return off('prospects');
    const row = (p) => `<tr${p.mine ? ' class="me"' : ''}><td><b>${e(p.name)}</b>${p.fresh ? ` <span class="xt-pill good">${e(t('newTag'))}</span>` : ''}</td><td class="num">${p.age}</td><td>${e(p.nation || '')}</td><td>${e(String(p.region || '—').toUpperCase())}</td>
      <td>${p.team ? e(p.team) : `<span class="xt-pill acc">${e(t('fa'))}</span>`}</td><td class="num">${p.rating}</td><td class="num"><b>${p.pot}</b></td><td style="width:90px">${X.bar(p.rating / p.pot * 100)}</td></tr>`;
    const head = `<thead><tr><th>${e(t('player'))}</th><th class="num">${e(t('age'))}</th><th></th><th>${e(t('region'))}</th><th>${e(t('team'))}</th><th class="num">${e(t('rating'))}</th><th class="num">${e(t('pot'))}</th><th></th></tr></thead>`;
    const fa = P.radar.filter((p) => !p.team).map(row).join('');
    const club = P.radar.filter((p) => p.team).map(row).join('');
    const log = P.log.map((l) => `<div class="xt-row"><span class="xt-muted">${X.fmtDate(l.date)}</span><span>${e(l.kind === 'class' ? t('classLog', { s: l.season, n: l.n, b: (l.best || []).join(', ') }) : t('breakout', { name: l.name, age: l.age, r: String(l.region || '').toUpperCase() }))}</span></div>`).join('');
    return `<div class="xt-card"><h3>🌱 ${e(t('radar'))}</h3><div class="xt-muted" style="margin-bottom:8px">${e(t('radarInfo'))}</div>
      <h3 style="margin-top:6px">🆓 ${e(t('radarFa'))}</h3><table class="xt-table">${head}<tbody>${fa}</tbody></table>
      <h3 style="margin-top:16px">🏢 ${e(t('radarClub'))}</h3><table class="xt-table">${head}<tbody>${club}</tbody></table></div>
      ${log ? `<div class="xt-card" style="margin-top:12px"><h3>📜 ${e(t('youngLog'))}</h3>${log}</div>` : ''}`;
  }

  function dramaView(Dr, manager) {
    if (!Dr) return off('drama');
    let pend;
    if (Dr.pending) {
      const p = Dr.pending;
      const def = p.type === 'contro' ? t('ch_ignore') : t('ch_fuel');
      pend = `<div class="xt-card alert"><h3><span>🔥 ${e(t('decide'))}</span><span class="xt-muted">${e(t('leftDays', { n: p.left, d: def }))}</span></h3>
        <div class="xt-h2" style="font-size:19px">${e(p.title)}</div><div class="xt-muted" style="margin:4px 0 10px">${e(p.body)}</div>
        ${p.options.map((o) => `<button class="xt-opt" data-xt-cmd="drama:decide" data-xt-args="${args({ choice: o.id })}">${e(o.label)}${o.fine ? ` <span class="xt-muted">(+${X.money(o.fine)})</span>` : ''}</button>`).join('')}</div>`;
    } else pend = `<div class="xt-card"><h3>🔥 ${e(t('decide'))}</h3><div class="xt-muted">${e(t('noPending'))}</div>${Dr.feud ? `<div class="xt-row"><span>⚔️ ${e(t('feud', { p: Dr.feud.name, o: Dr.feud.opp }))}</span></div>` : ''}</div>`;
    const log = Dr.log.map((l) => `<div class="xt-row"><span>${e(l.name)} · <span class="xt-muted">${e(t('k_' + l.kind))}</span></span><span>${e(t('ch_' + l.choice))} ${l.auto ? `<span class="xt-muted">${e(t('auto'))}</span>` : ''}${l.money ? ` <span class="xt-pill good">+${X.money(l.money)}</span>` : ''}</span></div>`).join('') || `<div class="xt-muted">—</div>`;
    const beefs = Dr.beefs.map((b) => `<div class="xt-row"><span>${b.mine ? '⭐ ' : ''}<b>${e(b.a)}</b> <span class="xt-muted">${e(b.ta)}</span> vs <b>${e(b.b)}</b> <span class="xt-muted">${e(b.tb)}</span></span><span class="xt-muted">${b.choice ? e(t('ch_' + b.choice)) : X.fmtDate(b.date)}</span></div>`).join('') || `<div class="xt-muted">—</div>`;
    const orgs = Dr.orgLog.map((o) => `<div class="xt-row"><span>${e(t('o_' + o.kind, { from: o.from, to: o.to, m: o.extra && o.extra.merged || '', star: o.extra && o.extra.star || '' }))}</span><span class="xt-muted">${e(String(o.region || '').toUpperCase())} · ${X.fmtDate(o.date)}</span></div>`).join('') || `<div class="xt-muted">—</div>`;
    const regions = Dr.regions.map((r) => `<option value="${e(r.id)}"${r.id === Dr.myRegion ? ' selected' : ''}>${e(r.name)}</option>`).join('');
    const inp = 'background:rgba(0,0,0,.35);border:1px solid var(--line);color:#e8eef7;border-radius:8px;padding:6px 9px;font:inherit;font-size:13px';
    const found = `<div class="xt-card"><h3>🏗️ ${e(t('found'))}</h3><div class="xt-muted" style="margin-bottom:10px">${e(t('foundInfo'))}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="xt-org-name" maxlength="28" placeholder="${e(t('name'))}" style="${inp};flex:1;min-width:150px">
      <input id="xt-org-tag" maxlength="4" placeholder="${e(t('tag'))}" style="${inp};width:70px;text-transform:uppercase"><select id="xt-org-region" style="${inp}">${regions}</select>
      <button class="xt-btn" data-xt-cmd="drama:found">${e(t('create'))}</button></div></div>`;
    let merge = '';
    if (manager) {
      const rows = !Dr.canMerge ? `<div class="xt-muted">${e(t('mergeDone'))}</div>` : !Dr.mergeTargets.length ? `<div class="xt-muted">${e(t('mergeNone'))}</div>`
        : `<table class="xt-table"><thead><tr><th>${e(t('team'))}</th><th class="num">${e(t('strength'))}</th><th>${e(t('star'))}</th><th class="num">${e(t('fee'))}</th><th></th></tr></thead><tbody>${Dr.mergeTargets.map((m) => `<tr><td>${e(m.name)}</td><td class="num">${m.strength}</td><td>${e(m.star)}</td><td class="num">${X.money(m.fee)}</td><td class="xt-actions"><button class="xt-btn" data-xt-cmd="drama:merge" data-xt-args="${args({ teamId: m.id })}" data-xt-confirm="${e(t('confirmMerge', { t: m.name, m: X.money(m.fee) }))}">${e(t('doMerge'))}</button></td></tr>`).join('')}</tbody></table>`;
      merge = `<div class="xt-card"><h3>🔗 ${e(t('merge'))}</h3><div class="xt-muted" style="margin-bottom:10px">${e(t('mergeInfo'))}</div>${rows}</div>`;
    }
    return `<div class="xt-grid xt-two">${pend}<div class="xt-card"><h3>🗞️ ${e(t('dramaLog'))}</h3>${log}</div></div>
      <div class="xt-grid xt-two" style="margin-top:12px"><div class="xt-card"><h3>🥊 ${e(t('beefs'))}</h3>${beefs}</div><div class="xt-card"><h3>🏢 ${e(t('orgs'))}</h3>${orgs}</div></div>
      <div class="xt-grid xt-two" style="margin-top:12px">${found}${merge}</div>`;
  }

  function modsView(s) {
    const on = new Map((s.mods || []).map((m) => [m.id, m.on]));
    const lg = L();
    const rows = MODS.map(([id, icon, name, desc]) => {
      const fixed = id === 'hof';
      const isOn = fixed || on.get(id) !== false;
      const btn = fixed ? `<span class="xt-pill acc">${e(t('always'))}</span>` : `<button class="xt-btn ${isOn ? 'on' : ''}" data-xt-cmd="mods:toggle" data-xt-args="${args({ id, value: !isOn })}">${e(isOn ? t('on') : t('off'))}</button>`;
      return `<div class="xt-row" style="padding:9px 0"><span><span style="font-size:18px;margin-right:8px">${icon}</span><b>${e(name[lg] || name.en)}</b><br><span class="xt-muted" style="margin-left:30px">${e(desc[lg] || desc.en)}</span></span>${btn}</div>`;
    }).join('');
    return `<div class="xt-card"><h3><span>🧩 ${e(t('v_mods'))}</span><span class="xt-actions"><button class="xt-btn" data-xt-cmd="mods:all" data-xt-args="${args({ value: true })}">${e(t('allOn'))}</button><button class="xt-btn warn" data-xt-cmd="mods:all" data-xt-args="${args({ value: false })}">${e(t('allOff'))}</button></span></h3>
      <div class="xt-muted" style="margin-bottom:8px">${e(t('modsInfo'))}</div>${rows}</div>`;
  }

  function off(id) {
    const m = MODS.find((x) => x[0] === id);
    return `<div class="xt-card xt-muted">${m ? m[1] + ' ' + e(m[2][L()] || m[2].en) + ' — ' : ''}${e(t('off'))}. <a href="#" data-xt-view="${TAB}:mods">${e(t('v_mods'))}</a></div>`;
  }

  // ---------- player editor ----------
  const ED = { q: '', teamId: '', rows: null, teams: [], styles: {}, bots: [], sel: null, player: null, loading: false };
  async function edList() {
    ED.loading = true;
    const res = await X.cmd('editor', 'list', { q: ED.q, teamId: ED.teamId });
    ED.loading = false;
    if (res && res.ok !== false && res.rows) { ED.rows = res.rows; ED.teams = res.teams || []; ED.styles = res.styles || {}; ED.bots = res.bots || []; }
    render();
  }
  async function edGet(id) {
    const res = await X.cmd('editor', 'get', { id });
    if (res && res.player) { ED.sel = id; ED.player = res.player; ED.styles = res.styles || ED.styles; ED.bots = res.bots || ED.bots; }
    render();
  }
  async function edDo(op, args, done) {
    const res = await X.cmd('editor', op, Object.assign({ id: ED.sel }, args));
    if (res && res.ok) { if (done) X.toast('✏️', done, res.name || res.botName || ''); await edGet(ED.sel); await edList(); }
  }
  // photos are scaled down to 512 px before they are saved
  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('bad image'));
        img.onload = () => {
          const k = Math.min(1, 512 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function editorView() {
    if (ED.rows === null && !ED.loading) setTimeout(edList, 0);
    const teamOpts = `<option value="">${e(t('ed_myteam'))}</option>` + ED.teams.map((x) => `<option value="${x.id}"${String(ED.teamId) === String(x.id) ? ' selected' : ''}>${e(x.name)}</option>`).join('');
    const search = `<div class="xt-row" style="gap:8px;flex-wrap:wrap"><input id="xt-ed-q" value="${e(ED.q)}" placeholder="${e(t('ed_search'))}" style="flex:1;min-width:160px;background:rgba(0,0,0,.35);border:1px solid var(--line);color:#e8eef7;border-radius:8px;padding:6px 10px;font:inherit">
      <button class="xt-btn" data-xt-local="ed:search">🔎 ${e(t('ed_go'))}</button>
      <select id="xt-ed-team" style="background:rgba(0,0,0,.35);border:1px solid var(--line);color:#e8eef7;border-radius:8px;padding:6px 8px;font:inherit;max-width:220px">${teamOpts}</select></div>`;
    const rows = ED.rows === null ? `<div class="xt-muted">${e(t('ed_loading'))}</div>` : !ED.rows.length ? `<div class="xt-muted">${e(t('ed_none'))}</div>` : ED.rows.map((r) => `<div class="xt-row"${ED.sel === r.id ? ' style="background:color-mix(in srgb,var(--a1) 12%,transparent);border-radius:8px;padding:4px 6px"' : ''}>
        <span><b>${e(r.name)}</b>${r.edited ? ` <span class="xt-pill acc">${e(t('ed_edited'))}</span>` : ''}<br><span class="xt-muted">${e(r.team || '—')} · ${r.rating} · ${e(r.styleName || '—')}${r.botName ? ' (' + e(r.botName) + ')' : ''}</span></span>
        <button class="xt-btn" data-xt-local="ed:sel:${r.id}">✏️ ${e(t('ed_edit'))}</button></div>`).join('');
    let editor = `<div class="xt-card xt-muted">${e(t('ed_pick'))}</div>`;
    const P = ED.player;
    if (P) {
      const groups = Object.keys(ED.styles).map((k) => {
        const opts = ED.bots.filter((b) => b.main === k).map((b) => `<option value="${e(b.id)}"${b.id === P.bot ? ' selected' : ''}>${e(ED.styles[k])} · ${e(b.name)}${b.extra.length ? ' · +' + b.extra.map((x) => e(ED.styles[x] || x)).join(', ') : ''}</option>`).join('');
        return opts ? `<optgroup label="${e(ED.styles[k])}">${opts}</optgroup>` : '';
      }).join('');
      const pic = P.photoUrl ? `<img src="${e(P.photoUrl)}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">` : `<div style="width:96px;height:96px;border-radius:12px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;font-size:36px">👤</div>`;
      const inp = 'background:rgba(0,0,0,.35);border:1px solid var(--line);color:#e8eef7;border-radius:8px;padding:6px 10px;font:inherit';
      editor = `<div class="xt-card"><h3><span>✏️ ${e(P.name)}</span><span class="xt-muted">${e(P.team || '—')} · ${P.rating} · ${e(P.nation)}</span></h3>
        <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
          <div style="display:flex;flex-direction:column;gap:8px;align-items:center">${pic}
            <label class="xt-btn" style="cursor:pointer">🖼️ ${e(t('ed_upload'))}<input id="xt-ed-file" type="file" accept="image/png,image/jpeg,image/webp" style="display:none"></label></div>
          <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:10px">
            <div class="xt-row" style="gap:8px"><span style="width:110px">${e(t('ed_name'))}</span><input id="xt-ed-name" maxlength="24" value="${e(P.name)}" style="flex:1;${inp}"><button class="xt-btn" data-xt-local="ed:name">💾 ${e(t('ed_saveName'))}</button></div>
            <div class="xt-row" style="gap:8px"><span style="width:110px">${e(t('ed_style'))}</span><select id="xt-ed-bot" style="flex:1;${inp}">${groups}</select><button class="xt-btn" data-xt-local="ed:style">✔️ ${e(t('ed_apply'))}</button></div>
            <div class="xt-muted" style="font-size:12px">${e(t('ed_styleInfo'))}</div>
            ${P.edited ? `<div><button class="xt-btn warn" data-xt-local="ed:reset">↩️ ${e(t('ed_reset'))}</button></div>` : ''}
          </div></div></div>`;
    }
    return `<div class="xt-card" style="margin-bottom:12px"><h3>✏️ ${e(t('v_editor'))}</h3><div class="xt-muted" style="margin-bottom:8px">${e(t('ed_info'))}</div>${search}</div>
      <div class="xt-grid" style="grid-template-columns:minmax(260px,1fr) 1.6fr;align-items:start"><div class="xt-card">${rows}</div><div>${editor}</div></div>`;
  }
  document.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (!el || !el.id) return;
    if (el.id === 'xt-ed-team') { ED.teamId = el.value; ED.q = ''; edList(); }
    if (el.id === 'xt-ed-file' && el.files && el.files[0] && ED.sel != null) {
      try { const data = await readPhoto(el.files[0]); await edDo('photo', { data }, t('ed_photoDone')); } catch (err) { X.toast('⚠️', t('ed_photo'), String(err && err.message || err), true); }
    }
  }, true);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target && ev.target.id === 'xt-ed-q') { ED.q = ev.target.value; edList(); } }, true);

  function page() {
    const s = X.snap();
    if (!s) return '<div class="xt wld"><div class="xt-card xt-muted">…</div></div>';
    const v = X.view(TAB, 'top');
    const nav = ['top', 'prospects', 'drama', 'editor', 'mods'].filter((k) => k !== 'editor' || X.on('editor')).map((k) => `<button class="${v === k ? 'on' : ''}" data-xt-view="${TAB}:${k}">${e(t('v_' + k))}${k === 'drama' && s.drama && s.drama.pending ? ' <span class="xt-tabbadge">1</span>' : ''}</button>`).join('');
    const body = v === 'prospects' ? prospectsView(s.prospects) : v === 'drama' ? dramaView(s.drama, s.manager !== false) : v === 'mods' ? modsView(s) : v === 'editor' ? (X.on('editor') ? editorView() : off('editor')) : topView_(s.ranking);
    return `<div class="xt wld"><div class="xt-head"><div style="font-size:40px">🌐</div><div class="grow"><div class="xt-h1">${e(t('title'))}</div><div class="xt-h2">${e(t('sub'))}</div></div></div><div class="xt-nav">${nav}</div>${body}</div>`;
  }

  if (!document.getElementById('xt-style-wld')) {
    const st = document.createElement('style');
    st.id = 'xt-style-wld';
    st.textContent = '.xt.wld{--a1:#a5b4fc;--a2:#6366f1;--line:rgba(165,180,252,.2)}';
    document.head.appendChild(st);
  }

  X.addTab({
    id: TAB,
    icon: '🌐',
    color: '#a5b4fc',
    label: () => t('tab'),
    badge: () => { const s = X.snap(); return s && s.drama && s.drama.pending ? 1 : 0; },
    render: page,
    local(v) {
      if (v.startsWith('top:')) topView = v.slice(4);
      if (v === 'ed:search') { const q = document.getElementById('xt-ed-q'); ED.q = q ? q.value : ''; edList(); return; }
      if (v.startsWith('ed:sel:')) { edGet(Number(v.slice(7))); return; }
      if (v === 'ed:name') { const n = document.getElementById('xt-ed-name'); edDo('rename', { name: n ? n.value : '' }, t('ed_renamed')); return; }
      if (v === 'ed:style') { const b = document.getElementById('xt-ed-bot'); edDo('style', { bot: b ? b.value : '' }, t('ed_styled')); return; }
      if (v === 'ed:reset') { edDo('reset', {}, t('ed_restored')); return; }
      render();
    },
    beforeCmd(m, op, a) {
      if (m === 'drama' && op === 'found') {
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        return Object.assign({}, a, { name: val('xt-org-name'), abbrev: val('xt-org-tag'), region: val('xt-org-region') });
      }
      return a;
    },
    afterCmd(m, op, a, res) {
      if (m === 'drama' && op === 'found') X.toast('🏗️', t('foundDone', { n: res.name }), '');
      if (m === 'drama' && op === 'merge') X.toast('🔗', t('mergedDone', { s: res.star }), X.money(res.fee));
      if (m === 'drama' && op === 'decide') X.toast('🔥', t('decided'), '');
    },
  });
  try { render(); } catch { }
})();
