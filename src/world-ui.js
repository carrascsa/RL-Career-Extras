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
      v_top: 'World top', v_prospects: 'Prospects', v_drama: 'Drama & orgs', v_mods: 'Mods', v_editor: 'Player editor', v_settings: 'Settings', v_career: 'My career', mc_info: 'Every club you have managed in this save.', mc_now: 'now', mc_sacked: 'Sacked', mc_moved: 'Moved on', mc_current: 'Current club', mc_record: '{w}W {l}L series', mc_finals: '{n} finals', mc_titles: 'Titles', mc_seasons: 'Season by season', mc_season: 'Season {n}', mc_total: '{c} clubs · {w}W {l}L · {t} titles',
      st_theme: 'Theme', st_themeInfo: 'Re-colours the whole Hub. Your PC only.', st_hubTheme: 'Hub default', st_popups: 'Pop-ups', st_hubToasts: 'Hub pop-up notifications', st_xtToasts: 'Career Extras pop-ups',
      st_show: 'Show', st_hide: 'Hide', st_inbox: 'Inbox: mark as read automatically', st_inboxInfo: 'Messages that still need an answer are never touched.',
      ib_extras: 'Career Extras messages', ib_news: 'News', ib_promises: 'Promises', ib_scouting: 'Scout reports', ib_transfers: 'Offers, transfers and contracts',
      st_train: 'Auto-training', st_trainInfo: 'Runs each training session as soon as it is available, with the players who can still grow.', st_skip: 'Skip players at their potential', st_catch: 'Catch up on sessions missed while simulating several days',
      st_trainBy: 'Your Best assistant coach is already training for you.', st_sessions: 'Sessions so far: {n}', st_perf: 'Performance mode in real matches', st_perfInfo: 'While you play: Rocket League gets a higher CPU priority and the Hub stops animating in the background.',
      st_profile: 'Profile title', st_profileInfo: 'One of the titles your player has won, shown next to your name in the add-on.', st_noTitle: 'No title', st_autoTitle: 'Automatic (best title)', st_noTitles: 'Win something first!', on2: 'On', off2: 'Off',
      ed_stats: 'Rating · potential · morale · form · age', ed_saveStats: 'Save stats', ed_budget: 'Club budget', ed_saveBudget: 'Set budget', ed_statsDone: 'Stats saved', ed_budgetDone: 'Budget updated',
      ed_info: 'Change any player\'s name, photo and PlayStyle (the bot he plays as in real Rocket League matches). Everything else stays: rating, contract, titles and stats.',
      ed_search: 'Search a player', ed_go: 'Search', ed_team: 'Team', ed_myteam: 'My team', ed_edit: 'Edit', ed_name: 'Name', ed_saveName: 'Save name',
      ed_photo: 'Photo', ed_upload: 'Upload image', ed_style: 'PlayStyle', ed_apply: 'Apply', ed_reset: 'Restore original', ed_edited: 'edited',
      ed_styleInfo: 'Main style · bot · secondary styles. With the Hub\'s V1 bot system (everyone is Nexto) PlayStyles have no effect.',
      ed_pick: 'Pick a player to edit.', ed_none: 'No players found.', ed_renamed: 'Renamed', ed_styled: 'New PlayStyle', ed_photoDone: 'Photo updated', ed_restored: 'Restored', ed_loading: 'Loading…',
      cr_title: 'Create a player', cr_info: 'New players join as free agents (or straight onto a team). Rating 40-99, age 15-40.', cr_nation: 'Nation', cr_region: 'Region', cr_age: 'Age', cr_rating: 'Rating', cr_pot: 'Potential',
      cr_team: 'Team', cr_fa: 'Free agent', cr_create: 'Create', cr_done: 'Player created', im_title: 'Import players', im_go: 'Import',
      im_info: 'One player per line: Name, Nation, Region, Age, Rating, Potential (optional), PlayStyle bot (optional). Lines starting with # are skipped. Fill in the semi-pros below and remove the #.',
      im_done: 'Imported {n}', im_skipped: 'Skipped: {l}',
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
      managedInfo: 'With RLC Hub Addon Manager each feature is its own addon: pick them when you create the career or in the Setup tab.', on: 'On', off: 'Off', allOn: 'All on', allOff: 'All off', always: 'Always on',
      foundDone: '{n} is born', mergedDone: '{s} joins you', decided: 'Done',
    },
    es: {
      tab: 'Mundo RL', title: 'Mundo RL', sub: 'Rankings, promesas, drama, organizaciones y tus mods',
      v_top: 'Top mundial', v_prospects: 'Promesas', v_drama: 'Drama y orgs', v_mods: 'Mods', v_editor: 'Editor de jugadores', v_settings: 'Ajustes', v_career: 'Mi carrera', mc_info: 'Todos los clubes que dirigiste en esta partida.', mc_now: 'hoy', mc_sacked: 'Despedido', mc_moved: 'Se fue', mc_current: 'Club actual', mc_record: '{w}G {l}P en series', mc_finals: '{n} finales', mc_titles: 'Títulos', mc_seasons: 'Temporada por temporada', mc_season: 'Temporada {n}', mc_total: '{c} clubes · {w}G {l}P · {t} títulos',
      st_theme: 'Tema', st_themeInfo: 'Cambia los colores de todo el Hub. Solo en tu PC.', st_hubTheme: 'El del Hub', st_popups: 'Avisos emergentes', st_hubToasts: 'Avisos emergentes del Hub', st_xtToasts: 'Avisos de Career Extras',
      st_show: 'Mostrar', st_hide: 'Ocultar', st_inbox: 'Bandeja: marcar como leído automáticamente', st_inboxInfo: 'Los mensajes que todavía necesitan una respuesta nunca se tocan.',
      ib_extras: 'Mensajes de Career Extras', ib_news: 'Noticias', ib_promises: 'Promesas', ib_scouting: 'Informes de scouts', ib_transfers: 'Ofertas, traspasos y contratos',
      st_train: 'Entrenamiento automático', st_trainInfo: 'Hace cada sesión apenas está disponible, con los jugadores que todavía pueden crecer.', st_skip: 'Saltear a los que llegaron a su potencial', st_catch: 'Recuperar las sesiones perdidas al simular varios días',
      st_trainBy: 'Tu asistente técnico (el mejor) ya entrena por vos.', st_sessions: 'Sesiones hechas: {n}', st_perf: 'Modo rendimiento en los partidos reales', st_perfInfo: 'Mientras jugás: Rocket League tiene más prioridad de CPU y el Hub deja de animarse de fondo.',
      st_profile: 'Título de perfil', st_profileInfo: 'Uno de los títulos que ganó tu jugador, al lado de tu nombre en el addon.', st_noTitle: 'Sin título', st_autoTitle: 'Automático (el mejor)', st_noTitles: '¡Primero ganá algo!', on2: 'Prendido', off2: 'Apagado',
      ed_stats: 'Nivel · potencial · moral · forma · edad', ed_saveStats: 'Guardar', ed_budget: 'Presupuesto del club', ed_saveBudget: 'Fijar presupuesto', ed_statsDone: 'Datos guardados', ed_budgetDone: 'Presupuesto actualizado',
      ed_info: 'Cambiá el nombre, la foto y el estilo de juego (el bot con el que juega en los partidos reales) de cualquier jugador. Todo lo demás queda igual: nivel, contrato, títulos y estadísticas.',
      ed_search: 'Buscar un jugador', ed_go: 'Buscar', ed_team: 'Equipo', ed_myteam: 'Mi equipo', ed_edit: 'Editar', ed_name: 'Nombre', ed_saveName: 'Guardar nombre',
      ed_photo: 'Foto', ed_upload: 'Subir imagen', ed_style: 'Estilo de juego', ed_apply: 'Aplicar', ed_reset: 'Restaurar original', ed_edited: 'editado',
      ed_styleInfo: 'Estilo principal · bot · estilos secundarios. Con el sistema de bots V1 del Hub (todos son Nexto) el estilo no tiene efecto.',
      ed_pick: 'Elegí un jugador para editar.', ed_none: 'No hay jugadores.', ed_renamed: 'Nombre cambiado', ed_styled: 'Nuevo estilo', ed_photoDone: 'Foto actualizada', ed_restored: 'Restaurado', ed_loading: 'Cargando…',
      cr_title: 'Crear un jugador', cr_info: 'Los jugadores nuevos entran como agentes libres (o directo a un equipo). Nivel 40-99, edad 15-40.', cr_nation: 'Nacionalidad', cr_region: 'Región', cr_age: 'Edad', cr_rating: 'Nivel', cr_pot: 'Potencial',
      cr_team: 'Equipo', cr_fa: 'Agente libre', cr_create: 'Crear', cr_done: 'Jugador creado', im_title: 'Importar jugadores', im_go: 'Importar',
      im_info: 'Un jugador por línea: Nombre, Nacionalidad, Región, Edad, Nivel, Potencial (opcional), bot del estilo (opcional). Las líneas que empiezan con # se ignoran. Completá a los semi-pros de abajo y sacales el #.',
      im_done: 'Importados: {n}', im_skipped: 'Salteados: {l}',
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
      managedInfo: 'Con RLC Hub Addon Manager, cada función es un addon: se eligen al crear la carrera o en la pestaña Setup.', modsInfo: 'Prendé o apagá cualquier parte de Career Extras en esta carrera. Un módulo apagado deja de funcionar y esconde sus pantallas; al prenderlo sigue desde hoy (no se repiten días). Tus datos se guardan.',
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
    ['staff', '👔', { en: 'Backroom staff', es: 'Cuerpo técnico' }, { en: 'Mental coach, media trainer, assistant, engineer and youth coach in three tiers; more uses for facilities.', es: 'Coach mental, de medios, asistente, ingeniero y coach de cantera en tres niveles; más usos de las instalaciones.' }],
    ['recruit', '🌍', { en: 'Regional recruitment', es: 'Fichajes por región' }, { en: 'Top EU/NA players ask for more, or say no, to play in smaller regions.', es: 'Los top de EU/NA piden más, o dicen que no, para jugar en regiones chicas.' }],
    ['matchsim', '🎮', { en: 'Match simulation', es: 'Simulación de partidos' }, { en: 'Simulate one game of a series, or the rest of a live game you left.', es: 'Simulá un game de la serie, o lo que falta de un game en vivo que dejaste.' }],
    ['editor', '✏️', { en: 'Player editor', es: 'Editor de jugadores' }, { en: 'Rename players, change their photo and PlayStyle.', es: 'Cambiá nombre, foto y estilo de juego de los jugadores.' }],
    ['extras', '⚙️', { en: 'Quality of life', es: 'Comodidades' }, { en: 'Auto-training, inbox filters, profile title and performance mode.', es: 'Entrenamiento automático, filtros de bandeja, título de perfil y modo rendimiento.' }],
    ['mycareer', '📜', { en: 'My career', es: 'Mi carrera' }, { en: 'Every club you have managed: dates, why you left, record and titles.', es: 'Todos los clubes que dirigiste: fechas, por qué te fuiste, récord y títulos.' }],
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
      const fixed = id === 'hof' && !s.managed;
      const isOn = fixed || on.get(id) !== false;
      // RLC Hub Addon Manager: features are picked there (Setup tab), so here they are only shown
      const btn = s.managed ? `<span class="xt-pill ${isOn ? 'acc' : ''}">${e(isOn ? t('on') : t('off'))}</span>` : fixed ? `<span class="xt-pill acc">${e(t('always'))}</span>` : `<button class="xt-btn ${isOn ? 'on' : ''}" data-xt-cmd="mods:toggle" data-xt-args="${args({ id, value: !isOn })}">${e(isOn ? t('on') : t('off'))}</button>`;
      return `<div class="xt-row" style="padding:9px 0"><span><span style="font-size:18px;margin-right:8px">${icon}</span><b>${e(name[lg] || name.en)}</b><br><span class="xt-muted" style="margin-left:30px">${e(desc[lg] || desc.en)}</span></span>${btn}</div>`;
    }).join('');
    if (s.managed) return `<div class="xt-card"><h3><span>🧩 ${e(t('v_mods'))}</span></h3><div class="xt-muted" style="margin-bottom:8px">${e(t('managedInfo'))}</div>${rows}</div>`;
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
    if (res && res.ok !== false && res.rows) { ED.rows = res.rows; ED.teams = res.teams || []; ED.styles = res.styles || {}; ED.bots = res.bots || []; ED.budget = res.budget; ED.club = res.club; }
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
            <div class="xt-row" style="gap:6px;flex-wrap:wrap"><span style="width:110px" class="xt-muted">${e(t('ed_stats'))}</span>${[['rt', P.rating, 40, 99], ['pt', P.potential, 40, 99], ['mo', P.morale, 0, 100], ['fo', P.form, -10, 10], ['ag', P.age, 15, 45]].map(([k, v, a, b]) => `<input id="xt-ed-${k}" type="number" min="${a}" max="${b}" value="${v}" style="width:64px;${inp}">`).join('')}<button class="xt-btn" data-xt-local="ed:stats">💾 ${e(t('ed_saveStats'))}</button></div>
            ${P.edited ? `<div><button class="xt-btn warn" data-xt-local="ed:reset">↩️ ${e(t('ed_reset'))}</button></div>` : ''}
          </div></div></div>`;
    }
    const inp = 'background:rgba(0,0,0,.35);border:1px solid var(--line);color:#e8eef7;border-radius:8px;padding:6px 8px;font:inherit';
    const field = (id, label, attrs) => `<label style="display:flex;flex-direction:column;gap:3px;font-size:12px" class="xt-muted">${e(label)}<input id="${id}" ${attrs || ''} style="${inp}"></label>`;
    const botOpts = `<option value="">—</option>` + Object.keys(ED.styles).map((k) => ED.bots.filter((b) => b.main === k).map((b) => `<option value="${e(b.id)}">${e(ED.styles[k])} · ${e(b.name)}</option>`).join('')).join('');
    const teamSel = `<option value="">${e(t('cr_fa'))}</option>` + ED.teams.map((x) => `<option value="${x.id}">${e(x.name)}</option>`).join('');
    const creator = `<div class="xt-card" style="margin-top:12px"><h3>➕ ${e(t('cr_title'))}</h3><div class="xt-muted" style="margin-bottom:8px">${e(t('cr_info'))}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
        ${field('xt-cr-name', t('ed_name'), 'maxlength="24"')}${field('xt-cr-nation', t('cr_nation'))}
        <label style="display:flex;flex-direction:column;gap:3px;font-size:12px" class="xt-muted">${e(t('cr_region'))}<select id="xt-cr-region" style="${inp}">${['EU', 'NA', 'SAM', 'MENA', 'OCE', 'APAC', 'SSA'].map((r) => `<option value="${r.toLowerCase()}">${r}</option>`).join('')}</select></label>
        ${field('xt-cr-age', t('cr_age'), 'type="number" min="15" max="40" value="20"')}${field('xt-cr-rating', t('cr_rating'), 'type="number" min="40" max="99" value="75"')}${field('xt-cr-pot', t('cr_pot'), 'type="number" min="40" max="99" value="80"')}
        <label style="display:flex;flex-direction:column;gap:3px;font-size:12px" class="xt-muted">${e(t('ed_style'))}<select id="xt-cr-bot" style="${inp}">${botOpts}</select></label>
        <label style="display:flex;flex-direction:column;gap:3px;font-size:12px" class="xt-muted">${e(t('cr_team'))}<select id="xt-cr-team" style="${inp}">${teamSel}</select></label>
      </div><div style="margin-top:8px"><button class="xt-btn on" data-xt-local="ed:create">➕ ${e(t('cr_create'))}</button></div></div>`;
    const tpl = '# Name, Nation, Region, Age, Rating, Potential, PlayStyle bot\n# Kenz, Nation, EU, 20, 76, 82\n# MetalHub, Nation, EU, 20, 76, 82\n# Cokehun, Nation, EU, 20, 76, 82\n# Richmond, Nation, EU, 20, 76, 82\n';
    const importer = `<div class="xt-card" style="margin-top:12px"><h3>📥 ${e(t('im_title'))}</h3><div class="xt-muted" style="margin-bottom:8px">${e(t('im_info'))}</div>
      <textarea id="xt-im-text" rows="7" style="width:100%;box-sizing:border-box;${inp};font-family:Consolas,monospace;font-size:12px">${e(ED.importText != null ? ED.importText : tpl)}</textarea>
      <div style="margin-top:8px"><button class="xt-btn on" data-xt-local="ed:import">📥 ${e(t('im_go'))}</button></div></div>`;
    const budgetCard = ED.budget != null ? `<div class="xt-card" style="margin-top:12px"><h3>💰 ${e(t('ed_budget'))}${ED.club ? ' · ' + e(ED.club) : ''}</h3><div class="xt-row" style="gap:8px"><span>${e(X.money(ED.budget))}</span><input id="xt-ed-budget" type="number" min="0" step="10000" value="${Math.round(ED.budget)}" style="flex:1;${inp}"><button class="xt-btn" data-xt-local="ed:budget">💾 ${e(t('ed_saveBudget'))}</button></div></div>` : '';
    return `<div class="xt-card" style="margin-bottom:12px"><h3>✏️ ${e(t('v_editor'))}</h3><div class="xt-muted" style="margin-bottom:8px">${e(t('ed_info'))}</div>${search}</div>
      <div class="xt-grid" style="grid-template-columns:minmax(260px,1fr) 1.6fr;align-items:start"><div class="xt-card">${rows}</div><div>${editor}</div></div>${budgetCard}${creator}${importer}`;
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

  // ---------- settings ----------
  function settingsView(s) {
    const E = s.extras;
    const tog = (on, cmdOn, cmdOff) => `<span class="xt-actions"><button class="xt-btn ${on ? 'on' : ''}" ${cmdOn}>${e(t('on2'))}</button><button class="xt-btn ${!on ? 'on' : ''}" ${cmdOff}>${e(t('off2'))}</button></span>`;
    const local = (k, on) => tog(on, `data-xt-local="pref:${k}:"`, `data-xt-local="pref:${k}:off"`);
    const cmd = (op, a1, a0) => tog(a1.value, `data-xt-cmd="extras:${op}" data-xt-args="${args(Object.assign({}, a1, { value: true }))}"`, `data-xt-cmd="extras:${op}" data-xt-args="${args(Object.assign({}, a1, { value: false }))}"`);
    const cur = X.pref('theme');
    const themes = `<button class="xt-btn ${!cur ? 'on' : ''}" data-xt-local="pref:theme:">${e(t('st_hubTheme'))}</button>` + Object.entries(X.THEMES).map(([k, T]) => `<button class="xt-btn ${cur === k ? 'on' : ''}" data-xt-local="pref:theme:${k}"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${T.swatch};margin-right:6px"></span>${e(T.label[L()] || T.label.en)}</button>`).join('');
    let html = `<div class="xt-card"><h3>🎨 ${e(t('st_theme'))}</h3><div class="xt-muted" style="margin-bottom:8px">${e(t('st_themeInfo'))}</div><div class="xt-actions" style="flex-wrap:wrap;justify-content:flex-start">${themes}</div></div>
      <div class="xt-card" style="margin-top:12px"><h3>🔔 ${e(t('st_popups'))}</h3>
        <div class="xt-row"><span>${e(t('st_hubToasts'))}</span>${tog(X.pref('hubToasts') !== 'off', 'data-xt-local="pref:hubToasts:"', 'data-xt-local="pref:hubToasts:off"')}</div>
        <div class="xt-row"><span>${e(t('st_xtToasts'))}</span>${tog(X.pref('toasts') !== 'off', 'data-xt-local="pref:toasts:"', 'data-xt-local="pref:toasts:off"')}</div></div>`;
    void local;
    if (!E) return html;
    const ib = Object.keys(E.inbox).map((k) => `<div class="xt-row"><span>${e(t('ib_' + k))}</span>${cmd('inbox', { kind: k, value: !!E.inbox[k] })}</div>`).join('');
    html += `<div class="xt-card" style="margin-top:12px"><h3>📬 ${e(t('st_inbox'))}</h3><div class="xt-muted" style="margin-bottom:6px">${e(t('st_inboxInfo'))}</div>${ib}</div>`;
    if (E.manager) {
      const A = E.autotrain;
      const set = (k, v) => `data-xt-cmd="extras:autotrain" data-xt-args="${args({ [k]: v })}"`;
      html += `<div class="xt-card" style="margin-top:12px"><h3>🏋️ ${e(t('st_train'))}</h3><div class="xt-muted" style="margin-bottom:6px">${e(t('st_trainInfo'))}${E.assistantAuto ? ' ' + e(t('st_trainBy')) : ''}</div>
        <div class="xt-row"><span>${e(t('st_train'))}</span>${tog(A.on, set('on', true), set('on', false))}</div>
        <div class="xt-row"><span>${e(t('st_skip'))}</span>${tog(A.skipCapped, set('skipCapped', true), set('skipCapped', false))}</div>
        <div class="xt-row"><span>${e(t('st_catch'))}</span>${tog(A.catchUp, set('catchUp', true), set('catchUp', false))}</div>
        <div class="xt-muted">${e(t('st_sessions', { n: A.sessions || 0 }))}</div></div>`;
    }
    html += `<div class="xt-card" style="margin-top:12px"><h3>⚡ ${e(t('st_perf'))}</h3><div class="xt-row"><span class="xt-muted">${e(t('st_perfInfo'))}</span>${cmd('perf', { value: !!E.perf })}</div></div>`;
    const opts = `<option value="">${e(t('st_autoTitle'))}</option><option value="none">${e(t('st_noTitle'))}</option>` + E.titles.map((x) => `<option value="${x.i}"${E.picked && x.name.startsWith(E.title || '~') ? ' selected' : ''}>${e(x.name)}</option>`).join('');
    html += `<div class="xt-card" style="margin-top:12px"><h3>🏅 ${e(t('st_profile'))}</h3><div class="xt-muted" style="margin-bottom:6px">${e(t('st_profileInfo'))}</div>
      ${E.titles.length ? `<div class="xt-row"><span><b>${e(E.me || '')}</b>${E.title ? ` <span class="xt-pill acc">${e(E.title)}</span>` : ''}</span><select id="xt-st-title" style="background:rgba(0,0,0,.35);border:1px solid var(--line);color:#e8eef7;border-radius:8px;padding:6px 8px;font:inherit">${opts}</select></div>` : `<div class="xt-muted">${e(t('st_noTitles'))}</div>`}</div>`;
    return html;
  }
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el && el.id === 'xt-st-title') X.cmd('extras', 'title', { index: el.value });
  }, true);

  function careerView(M) {
    if (!M) return off('mycareer');
    const stints = M.stints.map((s) => `<div class="xt-row" style="align-items:flex-start"><span style="flex:1"><b>${e(s.team)}</b> ${s.region ? `<span class="xt-pill">${e(String(s.region).toUpperCase())}</span>` : ''}<br>
      <span class="xt-muted">${X.fmtDate(s.from)} → ${s.to ? X.fmtDate(s.to) : e(t('mc_now'))} · ${e(t('mc_record', { w: s.w, l: s.l }))} · ${e(t('mc_finals', { n: s.finals }))}</span>${s.titles.length ? `<br>🏆 ${s.titles.map(e).join(' · ')}` : ''}</span>
      <span class="xt-pill ${s.to ? (s.reason === 'sacked' ? 'bad' : '') : 'acc'}">${e(s.to ? t(s.reason === 'sacked' ? 'mc_sacked' : 'mc_moved') : t('mc_current'))}</span></div>`).join('');
    const seasons = M.seasons.map((r) => `<div class="xt-row"><span>${e(t('mc_season', { n: r.season }))} · <b>${e(r.team)}</b></span><span class="xt-muted">${e(t('mc_record', { w: r.w, l: r.l }))} · ${e(t('mc_finals', { n: r.finals }))}${r.titles.length ? ' · 🏆 ' + r.titles.length : ''}</span></div>`).join('');
    return `<div class="xt-card"><h3><span>📜 ${e(t('v_career'))}</span><span class="xt-muted">${e(t('mc_total', { c: M.total.clubs, w: M.total.w, l: M.total.l, t: M.total.titles }))}</span></h3><div class="xt-muted" style="margin-bottom:6px">${e(t('mc_info'))}</div>${stints}</div>
      <div class="xt-card" style="margin-top:12px"><h3>📅 ${e(t('mc_seasons'))}</h3>${seasons || '<div class="xt-muted">—</div>'}</div>`;
  }

  function page() {
    const s = X.snap();
    if (!s) return '<div class="xt wld"><div class="xt-card xt-muted">…</div></div>';
    const v = X.view(TAB, 'top');
    const nav = ['top', 'prospects', 'drama', 'career', 'editor', 'settings', 'mods'].filter((k) => k !== 'editor' || X.on('editor')).map((k) => `<button class="${v === k ? 'on' : ''}" data-xt-view="${TAB}:${k}">${e(t('v_' + k))}${k === 'drama' && s.drama && s.drama.pending ? ' <span class="xt-tabbadge">1</span>' : ''}</button>`).join('');
    const body = v === 'prospects' ? prospectsView(s.prospects) : v === 'drama' ? dramaView(s.drama, s.manager !== false) : v === 'mods' ? modsView(s) : v === 'editor' ? (X.on('editor') ? editorView() : off('editor')) : v === 'settings' ? settingsView(s) : v === 'career' ? careerView(s.mycareer) : topView_(s.ranking);
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
      if (v.startsWith('pref:')) { const [, k, val] = v.split(':'); X.setPref(k, val || ''); X.applyPrefs(); render(); return; }
      if (v === 'ed:stats') {
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        edDo('stats', { rating: val('xt-ed-rt'), potential: val('xt-ed-pt'), morale: val('xt-ed-mo'), form: val('xt-ed-fo'), age: val('xt-ed-ag') }, t('ed_statsDone'));
        return;
      }
      if (v === 'ed:budget') {
        const el = document.getElementById('xt-ed-budget');
        X.cmd('editor', 'budget', { amount: el ? el.value : '' }).then((res) => { if (res && res.ok) { X.toast('💰', t('ed_budgetDone'), X.money(res.budget)); ED.budget = res.budget; render(); } });
        return;
      }
      if (v === 'ed:search') { const q = document.getElementById('xt-ed-q'); ED.q = q ? q.value : ''; edList(); return; }
      if (v.startsWith('ed:sel:')) { edGet(Number(v.slice(7))); return; }
      if (v === 'ed:name') { const n = document.getElementById('xt-ed-name'); edDo('rename', { name: n ? n.value : '' }, t('ed_renamed')); return; }
      if (v === 'ed:style') { const b = document.getElementById('xt-ed-bot'); edDo('style', { bot: b ? b.value : '' }, t('ed_styled')); return; }
      if (v === 'ed:reset') { edDo('reset', {}, t('ed_restored')); return; }
      if (v === 'ed:create') {
        const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        X.cmd('editor', 'create', { name: val('xt-cr-name'), nation: val('xt-cr-nation'), region: val('xt-cr-region'), age: val('xt-cr-age'), rating: val('xt-cr-rating'), potential: val('xt-cr-pot'), bot: val('xt-cr-bot'), teamId: val('xt-cr-team') })
          .then((res) => { if (res && res.ok) { X.toast('➕', t('cr_done'), res.name); edList(); } });
        return;
      }
      if (v === 'ed:import') {
        const el = document.getElementById('xt-im-text');
        ED.importText = el ? el.value : '';
        X.cmd('editor', 'import', { text: ED.importText }).then((res) => {
          if (!res || !res.ok) return;
          X.toast('📥', t('im_done', { n: res.made.length }), res.skipped.length ? t('im_skipped', { l: res.skipped.join(' · ') }) : res.made.join(', '), !!res.skipped.length);
          edList();
        });
        return;
      }
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
