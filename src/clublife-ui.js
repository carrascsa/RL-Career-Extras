// RL Career Extras — Club Life tab: opponent analysis, press room, dressing room, boardroom (investor).
(function () {
  const X = window.__xt;
  if (!X || window.__xtClubLifeUI) return;
  window.__xtClubLifeUI = true;
  const TAB = 'xtclublife';
  const answers = {}; // press key -> [idx,...]

  const D = {
    en: {
      tab: 'Club Life', title: 'Club Life', sub: 'Match prep, press, dressing room and boardroom',
      matchday: 'Next match', press: 'Press room', dressing: 'Dressing room', board: 'Boardroom',
      noMatch: 'No scheduled match for your club right now.', inDays: 'in {n} days', today: 'today', tomorrow: 'tomorrow', bo: 'Best of {n}',
      oppLineup: 'Their lineup', form: 'Recent form', h2h: 'Head to head', rating: 'Rating', fm: 'Form', mor: 'Morale',
      report: 'Buy scouting report ({m})', reportOn: 'Scouting report', style: 'Style', key: 'Key player',
      aggressive: 'Aggressive: they push up and commit players forward.', defensive: 'Defensive: they sit back and wait for mistakes.', possession: 'Possession: they control boost and slow the game down.',
      plan: 'Game plan', press_: 'High press', counter: 'Counter-attack', patient: 'Patient build-up',
      press_d: 'Beats possession teams', counter_d: 'Beats aggressive teams', patient_d: 'Beats defensive teams',
      planSet: 'Plan chosen: {p}', planBlind: 'Without a report you are guessing their style.',
      planGood: 'This plan counters their style: +2 form for your starters in simulations and their bot drops one difficulty tier in real matches.',
      planBad: "This plan doesn't fit their style: -1 form for your starters.", planWhen: 'Effects kick in the day before the match.',
      history: 'Recent game plans', hit: 'right call', miss: 'wrong call',
      noPress: 'No press conference pending.', rep: 'Media reputation', pressHint: 'After big matches the press wants a word. Your answers move morale, followers and your reputation.',
      expires: 'Expires in {n} days', submit: 'Answer the press', skip: 'Skip it (-5 reputation)', humble: 'Humble', confident: 'Confident', fiery: 'Fiery', answerAll: 'Answer all the questions first.',
      pressDone: 'Press conference done', morale: 'Morale {n}', fans: 'Followers {n}%', repD: 'Reputation {n}',
      won: 'Won', lost: 'Lost', skipped: 'skipped',
      noConflict: 'All quiet in the dressing room.', captain: 'Captain', noCaptain: 'No captain yet',
      c_playtime: '{a} is frustrated on the bench and thinks {b} is keeping his spot without earning it.',
      c_clash: '{a} and {b} had a heated argument after training. The rest of the squad is taking sides.',
      c_wage: '{a} feels undervalued compared to what he brings to the team.',
      c_captain: '{a} believes he has earned the armband and wants to be named captain.',
      o_start_a: 'Start {a} (swaps him into the lineup)', o_back_b: 'Back {b}', o_talk: 'Team dinner to talk it out',
      o_side_a: 'Side with {a}', o_side_b: 'Side with {b}', o_fine_both: 'Fine both', o_bootcamp: 'Team-building bootcamp',
      o_bonus: 'Pay a loyalty bonus', o_praise: 'Praise him publicly', o_ignore: 'Ignore it',
      o_name: 'Name {a} captain', o_vote: 'Let the squad vote', o_refuse: 'Refuse',
      squad: 'Squad morale', starter: 'starter', ignored: 'ignored',
      noInvestor: 'No investor offers right now. Offers can arrive once per season.', invOffer: '{name} want to invest', invActive: '{name} are invested',
      objective: 'Objective', o_major: 'Win a Major or the Worlds this season', o_regional: 'Win {n} regional events this season', o_series: 'Win {n} series this season',
      amount: 'Investment', accept: 'Accept {m}', decline: 'Decline', invRule: 'Meet the target for a 25% bonus. Miss it and they take half back at the end of the season.',
      progress: 'Progress', invLog: 'Previous investors', success: 'target met', failed: 'target missed', declined: 'declined', expired: 'expired',
      managerOnly: 'Only available in manager careers.',
      talks: 'Talks', talkHint: 'Pick a player and start a conversation. Some love to chat, some barely answer and some leave you on read.',
      t_checkin: 'How are you?', t_praise: 'Praise', t_demand: 'Demand more', t_role: 'Their role', t_rival: 'Next opponent', t_team: 'Squad mood', t_future: 'Their future', t_joke: 'Banter',
      t_minutes: 'Ask for minutes', t_feedback: 'Ask for feedback', coach: 'Coach', seen: 'Seen ✓✓', rel: 'Relationship', talked: 'talked today',
      p_chatty: 'Chatty', p_reserved: 'Reserved', p_moody: 'Moody', p_pro: 'Professional', p_joker: 'Joker', p_leader: 'Leader', unknown: 'personality: ?',
      hint: '{by} thinks they play {style}', s_aggressive: 'aggressive', s_defensive: 'defensive', s_possession: 'possession', pickPlayer: 'Pick someone to talk to.',
      r_full: 'answered', r_short: 'short answer', r_seen: 'left you on read', r_rude: 'not in the mood',
      sponsors: 'Sponsors', noSponsor: 'No sponsor offers right now. Brands get in touch every few weeks.', spOffer: '{b} want to sponsor you', upfront: 'Upfront', bonus: 'Bonus',
      k_series: 'Win {n} series', k_streak: 'Win {n} series in a row', k_title: 'Win an official title', k_circuit: 'Win a circuit title', k_followers: 'Grow club followers by {n}%',
      inDaysD: 'within {n} days', daysLeft: '{n} days left', spAccept: 'Sign ({m} now)', spDecline: 'Decline', spMax: 'Max {n} deals at once', sp_success: 'bonus paid', sp_failed: 'missed', sp_declined: 'declined', sp_expired: 'expired',
      wellbeing: 'Wellbeing', wbInfo: 'Fatigue rises with every series, circuit event and stream, and drops with rest. Above {w} morale suffers; near {b} players can burn out and take days off.',
      fatigue: 'Fatigue', stream: 'Streaming', s_off: 'Off', s_casual: 'Casual', s_heavy: 'Heavy', vacation: 'Give a break', vacIn: 'Break again in {n}d', earnedS: 'Streams earned {m}', absent: 'away',
      wbLog_burnout: 'burned out', wbLog_vacation: 'took a break', lastIncome: 'Last week from streams: {m}',
    },
    es: {
      tab: 'Club Life', title: 'Vida del club', sub: 'Previa del partido, prensa, vestuario y directiva',
      matchday: 'Próximo partido', press: 'Sala de prensa', dressing: 'Vestuario', board: 'Directiva',
      noMatch: 'Tu club no tiene partidos programados por ahora.', inDays: 'en {n} días', today: 'hoy', tomorrow: 'mañana', bo: 'Al mejor de {n}',
      oppLineup: 'Su alineación', form: 'Forma reciente', h2h: 'Historial', rating: 'Nivel', fm: 'Forma', mor: 'Moral',
      report: 'Comprar informe ({m})', reportOn: 'Informe del rival', style: 'Estilo', key: 'Jugador clave',
      aggressive: 'Agresivo: presionan arriba y mandan jugadores al ataque.', defensive: 'Defensivo: se repliegan y esperan tus errores.', possession: 'Posesión: controlan el boost y bajan el ritmo.',
      plan: 'Plan de juego', press_: 'Presión alta', counter: 'Contraataque', patient: 'Construcción paciente',
      press_d: 'Le gana a equipos de posesión', counter_d: 'Le gana a equipos agresivos', patient_d: 'Le gana a equipos defensivos',
      planSet: 'Plan elegido: {p}', planBlind: 'Sin informe estás adivinando su estilo.',
      planGood: 'Este plan contrarresta su estilo: +2 de forma a tus titulares en simulaciones y su bot baja un nivel de dificultad en partidos reales.',
      planBad: 'Este plan no encaja con su estilo: -1 de forma a tus titulares.', planWhen: 'Los efectos se activan el día antes del partido.',
      history: 'Planes recientes', hit: 'acierto', miss: 'error',
      noPress: 'No hay conferencias pendientes.', rep: 'Reputación con la prensa', pressHint: 'Después de los partidos importantes la prensa quiere hablar. Tus respuestas mueven la moral, los seguidores y tu reputación.',
      expires: 'Vence en {n} días', submit: 'Responder a la prensa', skip: 'Faltar (-5 de reputación)', humble: 'Humilde', confident: 'Confiado', fiery: 'Picante', answerAll: 'Primero respondé todas las preguntas.',
      pressDone: 'Conferencia terminada', morale: 'Moral {n}', fans: 'Seguidores {n}%', repD: 'Reputación {n}',
      won: 'Ganó', lost: 'Perdió', skipped: 'faltaste',
      noConflict: 'Todo tranquilo en el vestuario.', captain: 'Capitán', noCaptain: 'Todavía sin capitán',
      c_playtime: '{a} está frustrado en el banco y cree que {b} conserva el puesto sin merecerlo.',
      c_clash: '{a} y {b} tuvieron una discusión fuerte después del entrenamiento. El resto del plantel está tomando partido.',
      c_wage: '{a} siente que no se lo valora por todo lo que aporta al equipo.',
      c_captain: '{a} cree que se ganó la cinta y quiere ser capitán.',
      o_start_a: 'Poner de titular a {a} (entra a la alineación)', o_back_b: 'Respaldar a {b}', o_talk: 'Cena del equipo para hablarlo',
      o_side_a: 'Darle la razón a {a}', o_side_b: 'Darle la razón a {b}', o_fine_both: 'Multar a los dos', o_bootcamp: 'Bootcamp de convivencia',
      o_bonus: 'Pagar un bonus de fidelidad', o_praise: 'Elogiarlo en público', o_ignore: 'Ignorarlo',
      o_name: 'Nombrar capitán a {a}', o_vote: 'Que vote el plantel', o_refuse: 'Negarse',
      squad: 'Moral del plantel', starter: 'titular', ignored: 'ignorado',
      noInvestor: 'No hay ofertas de inversión por ahora. Puede llegar una por temporada.', invOffer: '{name} quiere invertir', invActive: '{name} invirtió en el club',
      objective: 'Objetivo', o_major: 'Ganar un Major o el Mundial esta temporada', o_regional: 'Ganar {n} torneos regionales esta temporada', o_series: 'Ganar {n} series esta temporada',
      amount: 'Inversión', accept: 'Aceptar {m}', decline: 'Rechazar', invRule: 'Si cumplís el objetivo, bonus del 25%. Si no, al final de la temporada se llevan la mitad.',
      progress: 'Progreso', invLog: 'Inversores anteriores', success: 'objetivo cumplido', failed: 'objetivo fallido', declined: 'rechazado', expired: 'vencido',
      managerOnly: 'Solo disponible en carreras de manager.',
      talks: 'Charlas', talkHint: 'Elegí un jugador y empezá una conversación. A algunos les encanta hablar, otros apenas contestan y otros te clavan el visto.',
      t_checkin: '¿Cómo estás?', t_praise: 'Felicitarlo', t_demand: 'Exigirle más', t_role: 'Su rol', t_rival: 'Próximo rival', t_team: 'Ambiente del plantel', t_future: 'Su futuro', t_joke: 'Joda',
      t_minutes: 'Pedir minutos', t_feedback: 'Pedir devolución', coach: 'Coach', seen: 'Visto ✓✓', rel: 'Relación', talked: 'ya hablaron hoy',
      p_chatty: 'Charlatán', p_reserved: 'Reservado', p_moody: 'Temperamental', p_pro: 'Profesional', p_joker: 'Bromista', p_leader: 'Líder', unknown: 'personalidad: ?',
      hint: '{by} cree que juegan {style}', s_aggressive: 'agresivo', s_defensive: 'defensivo', s_possession: 'de posesión', pickPlayer: 'Elegí con quién hablar.',
      r_full: 'respondió', r_short: 'respuesta corta', r_seen: 'te clavó el visto', r_rude: 'no está de humor',
      sponsors: 'Sponsors', noSponsor: 'No hay ofertas de sponsors por ahora. Las marcas se contactan cada algunas semanas.', spOffer: '{b} quiere patrocinarlos', upfront: 'Pago inicial', bonus: 'Bonus',
      k_series: 'Ganar {n} series', k_streak: 'Ganar {n} series seguidas', k_title: 'Ganar un título oficial', k_circuit: 'Ganar un título del circuito', k_followers: 'Subir {n}% los seguidores del club',
      inDaysD: 'en {n} días', daysLeft: 'quedan {n} días', spAccept: 'Firmar ({m} ya)', spDecline: 'Rechazar', spMax: 'Máximo {n} contratos a la vez', sp_success: 'bonus cobrado', sp_failed: 'no cumplido', sp_declined: 'rechazado', sp_expired: 'vencido',
      wellbeing: 'Bienestar', wbInfo: 'El cansancio sube con cada serie, torneo del circuito y stream, y baja descansando. Arriba de {w} cae la moral; cerca de {b} el jugador se puede quemar y tomarse días.',
      fatigue: 'Cansancio', stream: 'Streaming', s_off: 'No', s_casual: 'Tranqui', s_heavy: 'Mucho', vacation: 'Darle vacaciones', vacIn: 'Vacaciones en {n}d', earnedS: 'Streams: {m} ganados', absent: 'ausente',
      wbLog_burnout: 'se quemó', wbLog_vacation: 'se tomó vacaciones', lastIncome: 'Streams la última semana: {m}',
    },
  };
  let talkWith = null; // player id or 'coach'
  const t = (k, p) => X.tr(D, k, p);
  const e = X.e;
  const snap = () => X.snap();
  const btn = (label, m, op, args, extra) => `<button class="xt-btn ${extra && extra.cls || ''}" data-xt-cmd="${m}:${op}" data-xt-args="${e(JSON.stringify(args || {}))}"${extra && extra.disabled ? ' disabled' : ''}>${e(label)}</button>`;
  const planName = (p) => t(p === 'press' ? 'press_' : p);
  const chips = (form) => form.map((f) => `<span class="xt-chip ${f.won ? 'w' : 'l'}" title="${e(f.score + ' vs ' + f.opp)}">${f.won ? 'W' : 'L'}</span>`).join('');

  function matchCard(M) {
    const n = M && M.next;
    if (!n) return `<div class="xt-card"><h3>📋 ${e(t('matchday'))}</h3><div class="xt-muted">${e(t('noMatch'))}</div>${historyBlock(M)}</div>`;
    const when = n.inDays <= 0 ? t('today') : n.inDays === 1 ? t('tomorrow') : t('inDays', { n: n.inDays });
    const lineup = n.lineup.map((p) => `<tr><td>${e(p.name)}${n.keyPlayer === p.name ? ' <span class="xt-pill acc">★</span>' : ''}</td><td class="num">${p.rating}</td><td class="num">${p.form > 0 ? '+' : ''}${p.form}</td><td class="num">${p.morale}</td></tr>`).join('');
    const report = n.report
      ? `<div class="xt-row"><span>${e(t('style'))}</span><b>${e(t(n.style).split(':')[0])}</b></div><div class="xt-muted">${e(t(n.style))}</div>${n.keyPlayer ? `<div class="xt-row"><span>${e(t('key'))}</span><b>${e(n.keyPlayer)}</b></div>` : ''}`
      : btn(t('report', { m: X.money(n.cost) }), 'matchday', 'report', { key: n.key });
    const plans = ['press', 'counter', 'patient'].map((p) => `<button class="xt-opt ${n.plan === p ? 'on' : ''}" data-xt-cmd="matchday:plan" data-xt-args="${e(JSON.stringify({ key: n.key, plan: p }))}"><span class="tone">${e(t(p + '_d'))}</span>${e(planName(p))}</button>`).join('');
    let verdict = '';
    if (n.plan) {
      const counters = M.counters || {};
      if (n.report) verdict = counters[n.style] === n.plan ? `<div class="xt-pill good">✔</div> ${e(t('planGood'))}` : `<div class="xt-pill bad">✖</div> ${e(t('planBad'))}`;
      else verdict = e(t('planBlind'));
      verdict = `<div class="xt-muted" style="margin-top:6px">${e(t('planSet', { p: planName(n.plan) }))}. ${verdict} ${n.applied ? '' : e(t('planWhen'))}</div>`;
    }
    return `<div class="xt-card ${n.inDays <= 1 && !n.plan ? 'alert' : ''}"><h3><span>📋 ${e(t('matchday'))}</span><span class="xt-muted">${e(when)}${n.bestOf ? ' · ' + e(t('bo', { n: n.bestOf })) : ''}</span></h3>
      <div class="xt-h2" style="font-size:20px">vs ${e(n.opp)}</div><div class="xt-muted">${e(n.event)} · ${X.fmtDate(n.date)}</div>
      <div class="xt-grid xt-two" style="margin-top:12px">
        <div><div class="xt-muted">${e(t('oppLineup'))}</div><table class="xt-table"><thead><tr><th></th><th class="num">${e(t('rating'))}</th><th class="num">${e(t('fm'))}</th><th class="num">${e(t('mor'))}</th></tr></thead><tbody>${lineup}</tbody></table>
          <div class="xt-row"><span>${e(t('form'))}</span><span>${chips(n.form) || '—'}</span></div>
          ${n.h2h ? `<div class="xt-row"><span>${e(t('h2h'))}</span><b>${n.h2h.w}-${n.h2h.l}</b></div>` : ''}</div>
        <div><div class="xt-muted">🔎 ${e(t('reportOn'))}</div>${report}<div class="xt-muted" style="margin-top:12px">🧠 ${e(t('plan'))}</div>${plans}${verdict}</div>
      </div>${historyBlock(M)}</div>`;
  }

  function historyBlock(M) {
    if (!M || !M.history || !M.history.length) return '';
    return `<div style="margin-top:12px" class="xt-muted">${e(t('history'))}</div>` + M.history.slice(0, 5).map((h) => `<div class="xt-row"><span>${h.won ? '<span class="xt-chip w">W</span>' : '<span class="xt-chip l">L</span>'} vs ${e(h.opp)}</span><span>${e(planName(h.plan))} <span class="xt-pill ${h.correct ? 'good' : 'bad'}">${e(t(h.correct ? 'hit' : 'miss'))}</span></span></div>`).join('');
  }

  function pressCard(M) {
    const rep = M ? M.rep : 0;
    const repBar = `<div class="xt-row"><span>${e(t('rep'))}</span><span style="display:flex;gap:8px;align-items:center"><b>${rep > 0 ? '+' : ''}${rep}</b><span style="width:120px">${X.bar((rep + 100) / 2, rep < 0 ? 'red' : '')}</span></span></div>`;
    const P = M && M.press;
    const log = M && M.pressLog && M.pressLog.length ? M.pressLog.slice(0, 4).map((l) => `<div class="xt-row"><span>${e(l.score)} vs ${e(l.opp)}</span><span class="xt-muted">${l.skipped ? e(t('skipped')) : `${e(t('morale', { n: (l.effects.t > 0 ? '+' : '') + l.effects.t }))} · ${e(t('repD', { n: (l.effects.rep > 0 ? '+' : '') + l.effects.rep }))}`}</span></div>`).join('') : '';
    if (!P) return `<div class="xt-card"><h3>🎙️ ${e(t('press'))}</h3><div class="xt-muted">${e(t('noPress'))}</div>${repBar}<div class="xt-muted" style="margin-top:8px">${e(t('pressHint'))}</div>${log}</div>`;
    const sel = answers[P.key] || (answers[P.key] = P.questions.map(() => -1));
    const tones = ['humble', 'confident', 'fiery'];
    const qs = P.questions.map((q, qi) => `<div class="xt-q"><div class="qt">${qi + 1}. ${e(q.text)}</div>${q.answers.map((a, ai) => `<button class="xt-opt ${sel[qi] === ai ? 'on' : ''}" data-xt-local="${qi}:${ai}"><span class="tone">${e(t(tones[ai]))}</span>"${e(a)}"</button>`).join('')}</div>`).join('');
    return `<div class="xt-card alert"><h3><span>🎙️ ${e(t('press'))} · ${P.won ? e(t('won')) : e(t('lost'))} ${e(P.score)} vs ${e(P.opp)}</span><span class="xt-muted">${e(t('expires', { n: P.expiresIn }))}</span></h3>
      ${qs}<div style="display:flex;gap:8px;justify-content:flex-end">${btn(t('skip'), 'matchday', 'skip_press', {}, { cls: 'warn' })}<button class="xt-btn on" data-xt-cmd="matchday:answer" data-xt-args="${e(JSON.stringify({ key: P.key }))}">${e(t('submit'))}</button></div>${repBar}</div>`;
  }

  function fxText(fx) {
    const parts = [];
    const f = (n) => (n > 0 ? '+' : '') + n;
    if (fx.a) parts.push('A ' + f(fx.a));
    if (fx.b) parts.push('B ' + f(fx.b));
    if (fx.others) parts.push((X.lang() === 'es' ? 'resto ' : 'others ') + f(fx.others));
    if (fx.all) parts.push((X.lang() === 'es' ? 'todos ' : 'all ') + f(fx.all));
    return parts.join(' · ');
  }

  function dressingCard(C) {
    const sq = C.squad.map((p) => `<div class="xt-row"><span>${e(p.name)}${p.starter ? ` <span class="xt-pill">${e(t('starter'))}</span>` : ''}${C.captain === p.name ? ' <span class="xt-pill acc">C</span>' : ''}</span><span style="display:flex;gap:8px;align-items:center;width:150px"><b>${p.morale}</b>${X.bar(p.morale, p.morale < 50 ? 'red' : '')}</span></div>`).join('');
    const k = C.conflict;
    let body = `<div class="xt-muted">${e(t('noConflict'))}</div>`;
    if (k) {
      const names = { a: k.a ? k.a.name : '?', b: k.b ? k.b.name : '?' };
      const opts = k.options.map((o) => `<button class="xt-opt" data-xt-cmd="club:resolve" data-xt-args="${e(JSON.stringify({ option: o.id }))}"><span class="tone">${e(fxText(o.fx))}${o.cost ? ' · ' + X.money(o.cost) : ''}</span>${e(t('o_' + o.id, names))}</button>`).join('');
      body = `<div style="font-weight:800;margin-bottom:6px">${e(t('c_' + k.kind, names))}</div><div class="xt-muted">A = ${e(names.a)}${k.b ? ' · B = ' + e(names.b) : ''} · ${e(t('expires', { n: k.expiresIn }))}</div>${opts}`;
    }
    const log = C.conflictLog.length ? C.conflictLog.slice(0, 4).map((l) => `<div class="xt-row"><span>${e(l.a)}${l.b ? ' / ' + e(l.b) : ''}</span><span class="xt-muted">${e(l.choice === 'ignored' ? t('ignored') : t('o_' + l.choice, { a: l.a, b: l.b || '' }))}</span></div>`).join('') : '';
    return `<div class="xt-card ${k ? 'alert' : ''}"><h3><span>🧑‍🤝‍🧑 ${e(t('dressing'))}</span><span class="xt-muted">${e(t('captain'))}: ${C.captain ? e(C.captain) : e(t('noCaptain'))}</span></h3>${body}
      <div class="xt-muted" style="margin-top:12px">${e(t('squad'))}</div>${sq}${log ? `<div style="margin-top:10px">${log}</div>` : ''}</div>`;
  }

  function objText(o) { return t('o_' + o.kind, { n: o.n }); }

  function boardCard(C) {
    const inv = C.investor;
    const log = C.investorLog.length ? C.investorLog.map((l) => `<div class="xt-row"><span>${e(l.name)} <span class="xt-muted">S${l.season}</span></span><span class="xt-pill ${l.result === 'success' ? 'good' : l.result === 'failed' ? 'bad' : ''}">${e(t(l.result))}</span></div>`).join('') : '';
    if (!inv) return `<div class="xt-card"><h3>💼 ${e(t('board'))}</h3><div class="xt-muted">${e(t('noInvestor'))}</div>${log ? `<div class="xt-muted" style="margin-top:10px">${e(t('invLog'))}</div>${log}` : ''}</div>`;
    const prog = `<div class="xt-row"><span>${e(t('progress'))}</span><span style="display:flex;gap:8px;align-items:center;width:170px"><b>${inv.progress}/${inv.objective.n}</b>${X.bar((inv.progress / inv.objective.n) * 100)}</span></div>`;
    if (inv.status === 'offer') {
      return `<div class="xt-card alert"><h3><span>💼 ${e(t('invOffer', { name: inv.name }))}</span><span class="xt-muted">${e(t('expires', { n: inv.expiresIn }))}</span></h3>
        <div class="xt-row"><span>${e(t('amount'))}</span><b>${X.money(inv.amount)}</b></div><div class="xt-row"><span>${e(t('objective'))}</span><b>${e(objText(inv.objective))}</b></div>
        <div class="xt-muted" style="margin:8px 0">${e(t('invRule'))}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">${btn(t('decline'), 'club', 'investor', { accept: false }, { cls: 'warn' })}<button class="xt-btn on" data-xt-cmd="club:investor" data-xt-args="${e(JSON.stringify({ accept: true }))}">${e(t('accept', { m: X.money(inv.amount) }))}</button></div></div>`;
    }
    return `<div class="xt-card"><h3>💼 ${e(t('invActive', { name: inv.name }))}</h3><div class="xt-row"><span>${e(t('amount'))}</span><b>${X.money(inv.amount)}</b></div><div class="xt-row"><span>${e(t('objective'))}</span><b>${e(objText(inv.objective))}</b></div>${prog}<div class="xt-muted">${e(t('invRule'))}</div>${log}</div>`;
  }

  function bubble(text, mine, sub) {
    return `<div style="display:flex;justify-content:${mine ? 'flex-end' : 'flex-start'};margin:4px 0"><div style="max-width:78%;padding:7px 11px;border-radius:12px;font-size:13px;${mine ? 'background:color-mix(in srgb,var(--a1) 22%,transparent);border-bottom-right-radius:3px' : 'background:rgba(255,255,255,.07);border-bottom-left-radius:3px'}">${e(text)}${sub ? `<div class="xt-muted" style="font-size:10px;margin-top:2px">${e(sub)}</div>` : ''}</div></div>`;
  }

  function talkCard(T) {
    if (!T) return '';
    const people = T.players.filter((p) => !p.absent);
    if (talkWith != null && talkWith !== 'coach' && !people.some((p) => p.id === talkWith)) talkWith = null;
    const list = people.map((p) => `<button class="xt-btn ${talkWith === p.id ? 'on' : ''}" data-xt-local="talk:${p.id}" title="${e(t('rel'))} ${p.rel}">${e(p.name)}${p.talkedToday ? ' ✓' : ''}</button>`).join('')
      + (T.coachTopics.length ? `<button class="xt-btn ${talkWith === 'coach' ? 'on' : ''}" data-xt-local="talk:coach">📋 ${e(t('coach'))}</button>` : '');
    let body = `<div class="xt-muted" style="margin-top:8px">${e(t('pickPlayer'))}</div>`;
    if (talkWith === 'coach') {
      const log = T.coach.map((m) => bubble(m.me, true) + bubble(m.them, false)).join('');
      const topics = T.coachTopics.map((k) => `<button class="xt-btn" data-xt-cmd="talk:coach" data-xt-args="${e(JSON.stringify({ topic: k }))}">${e(t('t_' + k))}</button>`).join('');
      body = `<div style="max-height:260px;overflow:auto;margin:8px 0">${log}</div><div class="xt-actions" style="justify-content:flex-start">${topics}</div>`;
    } else if (talkWith != null) {
      const p = people.find((x) => x.id === talkWith);
      const log = p.log.map((m) => bubble(m.me, true) + (m.them ? bubble(m.them, false, `${t('r_' + m.resp)}${m.mor ? ' · ' + t('morale', { n: (m.mor > 0 ? '+' : '') + m.mor }) : ''}`) : `<div class="xt-muted" style="font-size:11px;margin:0 0 6px">${e(m.resp === 'seen' ? t('seen') : t('r_' + m.resp))}</div>`)).join('');
      const topics = T.topics.map((k) => `<button class="xt-btn" data-xt-cmd="talk:talk" data-xt-args="${e(JSON.stringify({ pid: p.id, topic: k }))}"${p.talkedToday ? ' disabled' : ''}>${e(t('t_' + k))}</button>`).join('');
      body = `<div class="xt-row"><span><b>${e(p.name)}</b> ${p.starter ? `<span class="xt-pill">${e(t('starter'))}</span>` : ''}<span class="xt-pill">${e(p.known ? t('p_' + p.known) : t('unknown'))}</span></span><span class="xt-muted">${e(t('mor'))} ${p.morale} · ${e(t('rel'))} ${p.rel > 0 ? '+' : ''}${p.rel}${p.talkedToday ? ' · ' + e(t('talked')) : ''}</span></div>
        <div style="max-height:260px;overflow:auto;margin:8px 0">${log}</div><div class="xt-actions" style="justify-content:flex-start">${topics}</div>`;
    }
    const hint = T.hint ? `<div class="xt-pill acc" style="margin-top:8px">🗣️ ${e(t('hint', { by: T.hint.by, style: t('s_' + T.hint.style) }))}</div>` : '';
    return `<div class="xt-card" style="margin-top:12px"><h3><span>💬 ${e(t('talks'))}</span></h3><div class="xt-muted" style="margin-bottom:8px">${e(t('talkHint'))}</div><div style="display:flex;flex-wrap:wrap;gap:5px">${list}</div>${hint}${body}</div>`;
  }

  function objText2(o) { return t('k_' + o.kind, { n: o.target }); }

  function sponsorCard(SP) {
    if (!SP) return '';
    const active = SP.active.map((d) => `<div class="xt-row"><span><b>${e(d.brand)}</b> · ${e(objText2(d))}</span><span style="display:flex;gap:8px;align-items:center;width:200px"><b>${d.progress}/${d.target}</b>${X.bar((Math.max(0, d.progress) / d.target) * 100)}<span class="xt-muted">${e(t('daysLeft', { n: d.daysLeft }))}</span></span></div><div class="xt-muted" style="margin-bottom:4px">${e(t('bonus'))} ${X.money(d.bonus)}</div>`).join('');
    const o = SP.offer;
    const offer = o ? `<div class="xt-card alert" style="margin:8px 0"><div style="font-weight:800">${e(t('spOffer', { b: o.brand }))}</div>
      <div class="xt-row"><span>${e(objText2(o))}</span><span class="xt-muted">${e(t('inDaysD', { n: o.days }))}</span></div>
      <div class="xt-row"><span>${e(t('upfront'))}</span><b>${X.money(o.upfront)}</b></div><div class="xt-row"><span>${e(t('bonus'))}</span><b>${X.money(o.bonus)}</b></div>
      <div class="xt-muted">${e(t('expires', { n: o.expiresIn }))} · ${e(t('spMax', { n: SP.max }))}</div>
      ${SP.enabled ? `<div class="xt-actions" style="margin-top:6px"><button class="xt-btn warn" data-xt-cmd="sponsor:answer" data-xt-args="${e(JSON.stringify({ id: o.id, accept: false }))}">${e(t('spDecline'))}</button><button class="xt-btn on" data-xt-cmd="sponsor:answer" data-xt-args="${e(JSON.stringify({ id: o.id, accept: true }))}"${SP.active.length >= SP.max ? ' disabled' : ''}>${e(t('spAccept', { m: X.money(o.upfront) }))}</button></div>` : ''}</div>` : '';
    const log = SP.log.map((l) => `<div class="xt-row"><span>${e(l.brand)} <span class="xt-muted">${e(objText2(l))}</span></span><span class="xt-pill ${l.result === 'success' ? 'good' : l.result === 'failed' ? 'bad' : ''}">${e(t('sp_' + l.result))}${l.bonus ? ' · ' + X.money(l.bonus) : ''}</span></div>`).join('');
    return `<div class="xt-card ${o ? 'alert' : ''}"><h3>🤝 ${e(t('sponsors'))}</h3>${offer}${active}${!o && !active ? `<div class="xt-muted">${e(t('noSponsor'))}</div>` : ''}${log ? `<div style="margin-top:8px">${log}</div>` : ''}</div>`;
  }

  function wellbeingCard(W) {
    if (!W) return '';
    const rows = W.players.map((p) => {
      const streams = ['off', 'casual', 'heavy'].map((v) => `<button class="xt-btn ${p.stream === v ? 'on' : ''}" data-xt-cmd="wellbeing:stream" data-xt-args="${e(JSON.stringify({ pid: p.id, value: v }))}">${e(t('s_' + v))}</button>`).join('');
      const vac = p.vacationIn ? `<span class="xt-muted">${e(t('vacIn', { n: p.vacationIn }))}</span>` : `<button class="xt-btn" data-xt-cmd="wellbeing:vacation" data-xt-args="${e(JSON.stringify({ pid: p.id }))}">${e(t('vacation'))}</button>`;
      return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><div class="xt-row" style="border:0"><span><b>${e(p.name)}</b>${p.absent ? ` <span class="xt-pill bad">${e(t('absent'))}</span>` : ''}</span><span style="display:flex;gap:8px;align-items:center;width:170px"><span class="xt-muted">${e(t('fatigue'))}</span><b>${p.fatigue}</b>${X.bar(p.fatigue, p.fatigue >= W.warn ? 'red' : '')}</span></div>
        <div class="xt-row" style="border:0"><span class="xt-actions" style="justify-content:flex-start"><span class="xt-muted">${e(t('stream'))}</span>${streams}</span>${vac}</div>${p.earned ? `<div class="xt-muted">${e(t('earnedS', { m: X.money(p.earned) }))}</div>` : ''}</div>`;
    }).join('');
    const log = W.log.map((l) => `<div class="xt-row"><span>${e(l.name)}</span><span class="xt-muted">${e(t('wbLog_' + l.kind))} · ${X.fmtDate(l.date)}</span></div>`).join('');
    return `<div class="xt-card"><h3>🧘 ${e(t('wellbeing'))}</h3><div class="xt-muted" style="margin-bottom:6px">${e(t('wbInfo', { w: W.warn, b: W.burn }))}</div>${W.lastIncome ? `<div class="xt-muted">${e(t('lastIncome', { m: X.money(W.lastIncome) }))}</div>` : ''}${rows}${log ? `<div style="margin-top:8px">${log}</div>` : ''}</div>`;
  }

  // ---------- today's series: simulate a game, or the rest of one you left ----------
  const D2 = {
    en: {
      today: "Today's series", simNext: 'Simulate next game', simNextInfo: 'The game is simulated and the series goes on: play the next game live from the Hub as usual.',
      unfinished: 'You left game {g} at {s} with {t} to play.', simRest: 'Simulate the rest', simRestInfo: 'The remaining time is simulated from that score.',
      simDone: 'Simulated', series: 'Series', staff: 'Backroom staff', staffInfo: 'Hire one person per role. Better tiers do more and cost more (weekly wages; hiring costs two weeks).',
      hire: 'Hire', fire: 'Release', weekly: '{m}/week', bill: 'Weekly staff bill: {m}', tier_bad: 'Bad', tier_mid: 'Mid', tier_best: 'Best',
      r_mental: 'Mental coach', r_media: 'Media trainer', r_assistant: 'Assistant coach', r_engineer: 'Engineer', r_youth: 'Youth development coach',
      d_mental: 'Gives back {a}% of every morale drop, +{b} morale a week.', d_media: '+{a}% sponsor money (Hub media deals and sponsors), +{b}% follower growth.',
      d_assistant: 'Training cooldown −{a} days, sessions +{b}%.', d_assistantBest: 'Runs training for you. Sessions +{b}%, cooldown −{a} days.',
      d_engineer: 'Facility upgrades −{a}%.', d_youth: 'Academy growth +{a}%, intake potential +{b}, veterans lose {c}% less rating at the season change.',
      scouts: "Scouts (the Hub's)", scoutHire: 'Hire scout', facilities: 'Facilities (tier {n}): academy growth +{a}%, faster recovery from fatigue +{b}%.', autoSessions: 'Sessions run by your assistant: {n}',
    },
    es: {
      today: 'Serie de hoy', simNext: 'Simular el próximo game', simNextInfo: 'Se simula el game y la serie sigue: jugá el siguiente en vivo desde el Hub como siempre.',
      unfinished: 'Dejaste el game {g} con {s} y faltaban {t}.', simRest: 'Simular lo que falta', simRestInfo: 'Se simula el tiempo restante desde ese resultado.',
      simDone: 'Simulado', series: 'Serie', staff: 'Cuerpo técnico', staffInfo: 'Contratá una persona por puesto. Los mejores niveles hacen más y cuestan más (sueldo semanal; contratar cuesta dos semanas).',
      hire: 'Contratar', fire: 'Despedir', weekly: '{m}/semana', bill: 'Sueldos del cuerpo técnico: {m} por semana', tier_bad: 'Malo', tier_mid: 'Medio', tier_best: 'El mejor',
      r_mental: 'Coach mental', r_media: 'Entrenador de medios', r_assistant: 'Asistente técnico', r_engineer: 'Ingeniero', r_youth: 'Coach de cantera',
      d_mental: 'Devuelve el {a}% de cada caída de moral, +{b} de moral por semana.', d_media: '+{a}% de plata de sponsors (acuerdos de medios del Hub y sponsors), +{b}% de crecimiento de seguidores.',
      d_assistant: 'Espera de entrenamiento −{a} días, sesiones +{b}%.', d_assistantBest: 'Entrena por vos. Sesiones +{b}%, espera −{a} días.',
      d_engineer: 'Mejoras de instalaciones −{a}%.', d_youth: 'Crecimiento de la cantera +{a}%, potencial de los juveniles +{b}, los veteranos pierden {c}% menos nivel al cambiar la temporada.',
      scouts: 'Scouts (del Hub)', scoutHire: 'Contratar scout', facilities: 'Instalaciones (nivel {n}): cantera +{a}% de crecimiento, +{b}% de recuperación del cansancio.', autoSessions: 'Sesiones que hizo tu asistente: {n}',
    },
  };
  const t2 = (k, p) => X.tr(D2, k, p);
  const args = (o) => e(JSON.stringify(o || {}));
  const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec % 60)).padStart(2, '0')}`;
  function simCard(M) {
    if (!M || !M.today) return '';
    const T = M.today;
    const unf = M.unfinished ? `<div class="xt-row"><span>⏱️ ${e(t2('unfinished', { g: T.games + 1, s: M.unfinished.score.join('-'), t: clock(M.unfinished.remaining) }))}<br><span class="xt-muted">${e(t2('simRestInfo'))}</span></span><button class="xt-btn" data-xt-cmd="matchsim:rest" data-xt-args="${args({})}">${e(t2('simRest'))}</button></div>` : '';
    return `<div class="xt-card" style="margin-top:12px"><h3><span>🎮 ${e(t2('today'))}</span><span class="xt-muted">${e(T.home)} ${T.wins[0]}-${T.wins[1]} ${e(T.away)} · Bo${T.bestOf}</span></h3>${unf}
      <div class="xt-row"><span class="xt-muted">${e(t2('simNextInfo'))}</span><button class="xt-btn" data-xt-cmd="matchsim:nextGame" data-xt-args="${args({})}">⏭️ ${e(t2('simNext'))}</button></div></div>`;
  }
  function staffCard(S) {
    if (!S) return '';
    const fmt = (v) => Math.round(v * 100);
    const desc = (r, i) => {
      const P = r.perks;
      if (r.role === 'mental') return t2('d_mental', { a: fmt(P.moraleRefund[i]), b: P.weeklyMorale[i] });
      if (r.role === 'media') return t2('d_media', { a: fmt(P.sponsorBonus[i]), b: fmt(P.followerBoost[i]) });
      if (r.role === 'assistant') return t2(P.autoTrain[i] ? 'd_assistantBest' : 'd_assistant', { a: P.trainingCooldown[i], b: fmt(P.trainingBoost[i]) });
      if (r.role === 'engineer') return t2('d_engineer', { a: fmt(P.facilityDiscount[i]) });
      return t2('d_youth', { a: fmt(P.academyGrowth[i]), b: P.potentialBonus[i], c: fmt(P.declineRefund[i]) });
    };
    const TI = ['bad', 'mid', 'best'];
    const rows = S.roles.map((r) => {
      const m = r.member;
      const now = m ? `<b>${e(m.name)}</b> · ${e(t2('tier_' + m.tier))} · ${e(t2('weekly', { m: X.money(m.wage) }))}<br><span class="xt-muted">${e(desc(r, TI.indexOf(m.tier)))}</span>` : `<span class="xt-muted">—</span>`;
      const hires = r.candidates.map((c, i) => `<button class="xt-btn ${m && m.tier === c.tier ? 'on' : ''}" title="${e(c.name + ' · ' + desc(r, i))}" data-xt-cmd="staff:hire" data-xt-args="${args({ role: r.role, tier: c.tier })}">${e(t2('tier_' + c.tier))} · ${e(X.money(c.wage))}</button>`).join('');
      return `<div class="xt-row" style="align-items:flex-start;gap:8px"><span style="flex:1">${r.icon} <b>${e(t2('r_' + r.role))}</b><br>${now}</span><span class="xt-actions" style="flex-wrap:wrap;justify-content:flex-end">${hires}${m ? `<button class="xt-btn warn" data-xt-cmd="staff:fire" data-xt-args="${args({ role: r.role })}">${e(t2('fire'))}</button>` : ''}</span></div>`;
    }).join('');
    const scouts = S.scouts.map((x) => `<div class="xt-row"><span>🔭 ${e(x.name)} · ${e(t2('tier_' + x.tier))} · ${e(t2('weekly', { m: X.money(x.wage) }))}</span><button class="xt-btn warn" data-xt-cmd="staff:scoutRelease" data-xt-args="${args({ id: x.id })}">${e(t2('fire'))}</button></div>`).join('');
    const scoutHire = TI.map((tier) => `<button class="xt-btn" data-xt-cmd="staff:scoutHire" data-xt-args="${args({ tier })}">${e(t2('tier_' + tier))} · ${e(X.money(S.scoutWage[tier]))}</button>`).join('');
    return `<div class="xt-card" style="margin-top:12px"><h3><span>👔 ${e(t2('staff'))}</span><span class="xt-muted">${e(t2('bill', { m: X.money(S.bill) }))}</span></h3>
      <div class="xt-muted" style="margin-bottom:6px">${e(t2('staffInfo'))}</div>${rows}
      <div class="xt-muted" style="margin-top:8px">🏠 ${e(t2('facilities', { n: S.facilityTier, a: S.facilityTier * 4, b: S.facilityTier * 8 }))}${S.autoSessions ? ' · ' + e(t2('autoSessions', { n: S.autoSessions })) : ''}</div>
      <h3 style="margin-top:12px">🔭 ${e(t2('scouts'))}</h3>${scouts}<div class="xt-actions" style="justify-content:flex-start;margin-top:6px"><span class="xt-muted">${e(t2('scoutHire'))}:</span>${scoutHire}</div></div>`;
  }

  function page() {
    const s = snap();
    if (!s) return '<div class="xt"><div class="xt-card xt-muted">…</div></div>';
    const C = s.club || { squad: [], conflictLog: [], investorLog: [] };
    return `<div class="xt">
      <div class="xt-head"><div style="font-size:40px">🎙️</div><div class="grow"><div class="xt-h1">${e(t('title'))}</div><div class="xt-h2">${e(t('sub'))}</div></div></div>
      ${s.matchday ? `<div class="xt-grid xt-two">${matchCard(s.matchday)}${pressCard(s.matchday)}</div>` : ''}
      ${simCard(s.matchsim)}
      ${talkCard(s.talk)}
      ${s.manager === false ? `<div class="xt-card" style="margin-top:12px">${e(t('managerOnly'))}</div>` : `${s.club ? `<div class="xt-grid xt-two" style="margin-top:12px">${dressingCard(C)}${boardCard(C)}</div>` : ''}<div class="xt-grid xt-two" style="margin-top:12px">${wellbeingCard(s.wellbeing)}${sponsorCard(s.sponsor)}</div>${staffCard(s.staff)}`}
    </div>`;
  }

  function pending() {
    const s = snap();
    if (!s) return 0;
    let n = 0;
    if (s.matchday && s.matchday.press) n++;
    if (s.club && s.club.conflict) n++;
    if (s.club && s.club.investor && s.club.investor.status === 'offer') n++;
    if (s.sponsor && s.sponsor.offer) n++;
    return n;
  }

  X.addTab({
    id: TAB,
    icon: '🎙️',
    color: '#5eead4',
    label: () => t('tab'),
    badge: pending,
    visible: () => X.anyOn(['matchday', 'club', 'talk', 'sponsor', 'wellbeing', 'staff', 'matchsim']),
    render: page,
    local(v) {
      if (v.startsWith('talk:')) {
        const id = v.slice(5);
        talkWith = id === 'coach' ? 'coach' : Number(id);
        render();
        return;
      }
      const s = snap();
      const P = s && s.matchday && s.matchday.press;
      if (!P) return;
      const [qi, ai] = v.split(':').map(Number);
      const sel = answers[P.key] || (answers[P.key] = P.questions.map(() => -1));
      sel[qi] = ai;
      render();
    },
    beforeCmd(m, op, args) {
      if (m === 'matchday' && op === 'answer') {
        const sel = answers[args.key] || [];
        if (!sel.length || sel.some((x) => x < 0)) { X.toast('🎙️', t('answerAll'), '', true); return Object.assign({}, args, { answers: [] }); }
        return Object.assign({}, args, { answers: sel });
      }
      return args;
    },
    afterCmd(m, op, args, res) {
      if (m === 'matchsim' && res && res.ok) X.toast('🎮', t2('simDone'), `${res.score.join('-')}${res.ot ? ' OT' : ''} · ${t2('series')} ${res.wins.join('-')}`);
      if (m === 'staff' && op === 'hire' && res && res.ok) X.toast('👔', res.name, X.money(res.fee));
      if (m === 'matchday' && op === 'answer' && res.effects) {
        const f = res.effects;
        const s = (n) => (n > 0 ? '+' : '') + Math.round(n * 10) / 10;
        X.toast('🎙️', t('pressDone'), `${t('morale', { n: s(f.t) })} · ${t('fans', { n: s(f.f) })} · ${t('repD', { n: s(f.rep) })}`);
      }
    },
  });

  // Reminder toast when something new needs attention.
  let lastPending = -1;
  setInterval(() => {
    const n = pending();
    if (n > lastPending && lastPending !== -1) X.toast('🎙️', t('tab'), X.lang() === 'es' ? 'Hay algo esperándote en Club Life' : 'Something needs you in Club Life');
    lastPending = n;
  }, 2500);
  try { render(); } catch { }
})();
