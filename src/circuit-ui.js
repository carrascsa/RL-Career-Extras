// RL Career Extras — Circuit tab: S/A/B/C/D-tier tournaments (3v3, 2v2, 1v1), Freestyle division, World tour hosts.
(function () {
  const X = window.__xt;
  if (!X || window.__xtCircuitUI) return;
  window.__xtCircuitUI = true;
  const TAB = 'xtcircuit';
  const picks = {}; // eventId -> [pid]
  const open = {}; // eventId -> bracket expanded

  const D = {
    en: {
      tab: 'Circuit', title: 'Circuit', sub: 'Third-party tournaments, freestyle and the world tour',
      v_events: 'Tournaments', v_fs: 'Freestyle', v_world: 'World tour',
      worldRank: 'World rank', regionRank: 'Region rank', earnings: 'Circuit earnings', trophies: 'Circuit titles',
      upcoming: 'This season', results: 'Results', cabinet: 'Trophy cabinet', none: 'Nothing yet.',
      tierInfo: 'S-tier: invitational for the world top 8 (LAN, travel costs). A-tier: regional top 6 invited, the rest go through an open qualifier. B/C/D: open entry, smaller prize pools.',
      pool: 'Prize pool', opensIn: 'Registration opens in {n} days', closes: 'Registration closes {n} days before', inDays: 'in {n} days', today: 'today',
      enter: 'Register', withdraw: 'Withdraw', accept: 'Accept invitation', decline: 'Decline', entered: 'Registered', notEntered: 'Not registered',
      invited: 'Invited', notEligible: 'Not eligible (world top 8 only)', qualifier: 'Open qualifier: win two Bo5 series to get in',
      travel: 'Travel {m}', pickN: 'Pick {n}', locked: 'Field locked', running: 'In progress', place: 'Finished {p}', champ: 'Champion: {c}',
      p1: '1st 🏆', p2: '2nd', p3: '3rd-4th', p5: '5th-8th', bracket: 'Bracket', hide: 'Hide', qf: 'Quarter-finals', sf: 'Semi-finals', fin: 'Final',
      qualOut: 'Lost in the qualifier', qualIn: 'Won the qualifier', field: 'Field', managerOnly: 'Your manager decides which events the team plays.',
      fsPitch: 'Open a freestyle division: sign up to 3 freestylers, grow your followers with their clips, earn sponsor money and compete in judged freestyle battles.',
      fsOpen: 'Open division ({m})', roster: 'Your freestylers', market: 'Market', marketIn: 'New faces in {n} days', sign: 'Sign ({m})', release: 'Release',
      tech: 'Technique', creat: 'Creativity', cons: 'Consistency', hype: 'Hype', wage: 'Wage/wk', focus: 'Focus', f_tech: 'Technique', f_creat: 'Creativity', f_content: 'Content',
      move: 'Signature', comps: 'Freestyle events', risk: 'Routine', r_safe: 'Safe', r_balanced: 'Balanced', r_risky: 'Risky', auto: 'auto-picked',
      entries: 'Entries', fsRank: 'Freestyle ranking', viral: 'Viral clips', week: 'Last week: +{i} sponsors, -{w} wages', pts: 'pts', invite: 'Invite-only (top {n})',
      skill: 'Skill', bail: 'bailed', fsEmpty: 'No freestylers yet. Sign one from the market.',
      wtTitle: 'Host cities', wtInfo: 'Majors and the World Championship move to a different city every season ({n} cities). Events already running keep their name.',
      wtOn: 'Rotation on', wtOff: 'Rotation off', wtEvery: 'Also rotate seasons with official posters (drops the poster art)', wtEveryOn: 'Rotating every season', history: 'Host history',
      rotated: 'rotated', official: 'official art', done: 'done', season: 'Season',
      v_awards: 'Awards', m_hoops: 'Hoops', m_dropshot: 'Dropshot', m_rumble: 'Rumble', m_snowday: 'Snow Day', m_heatseeker: 'Heatseeker', modeInfo: 'Fun mode: more upsets, more followers',
      trips: 'Trips', tripInfo: 'Plan the trip to each Major / Worlds. A bootcamp in the host city avoids jet lag (+1 form for the event, +3 morale). Standard travel is free, but crossing time zones costs form for the first 2 days. Playing in your own region boosts morale.',
      standard: 'Standard travel', bootcamp: 'Bootcamp ({m})', jet: 'Jet lag -{n} form', noJet: 'No jet lag', home: 'Home crowd! +4 morale', visa: '{n}: visa stuck', visaFix: 'Express visa ({m})', visaFixed: 'Visa sorted', visaMissed: 'Missed the event (visa)',
      st_planning: 'planning', st_there: 'on site', st_done: 'back home', 'st_not-qualified': 'not qualified', tripLog: 'Past trips',
      awardsLive: 'Season {s} race (live)', awardsPast: 'Season {s} awards', minGames: 'Players with 12+ games. Awards are given when the World Championship ends.',
      allstar: 'All-Star game', asDate: 'All-Star on {d}', voting: 'Fan voting · game in {n} days', west: 'West (NA · SAM · OCE)', east: 'East', votes: 'votes', campaign: 'Campaign for one player ({m})', campaigned: 'Campaign running for {n}',
      asResult: '{w} win {s} · MVP {m}', W: 'West', E: 'East', asNone: 'Voting opens about two weeks before the game.', asPast: "This season's All-Star has already been played. The next one comes mid next season.", noTrips: 'Each trip shows up 3 weeks before its Major / World Championship.',
    },
    es: {
      tab: 'Circuit', title: 'Circuito', sub: 'Torneos de terceros, freestyle y gira mundial',
      v_events: 'Torneos', v_fs: 'Freestyle', v_world: 'Gira mundial',
      worldRank: 'Ranking mundial', regionRank: 'Ranking regional', earnings: 'Ganado en el circuito', trophies: 'Títulos del circuito',
      upcoming: 'Esta temporada', results: 'Resultados', cabinet: 'Vitrina', none: 'Nada todavía.',
      tierInfo: 'Tier S: invitacional para el top 8 mundial (LAN, con gastos de viaje). Tier A: invita al top 6 regional, el resto pasa por un clasificatorio abierto. B/C/D: inscripción libre, premios más chicos.',
      pool: 'Bolsa de premios', opensIn: 'La inscripción abre en {n} días', closes: 'La inscripción cierra {n} días antes', inDays: 'en {n} días', today: 'hoy',
      enter: 'Inscribirse', withdraw: 'Bajarse', accept: 'Aceptar invitación', decline: 'Rechazar', entered: 'Inscriptos', notEntered: 'Sin inscribir',
      invited: 'Invitados', notEligible: 'Sin acceso (solo top 8 mundial)', qualifier: 'Clasificatorio abierto: hay que ganar dos series al mejor de 5',
      travel: 'Viaje {m}', pickN: 'Elegí {n}', locked: 'Cuadro cerrado', running: 'En juego', place: 'Terminaron {p}', champ: 'Campeón: {c}',
      p1: '1° 🏆', p2: '2°', p3: '3°-4°', p5: '5°-8°', bracket: 'Cuadro', hide: 'Ocultar', qf: 'Cuartos', sf: 'Semis', fin: 'Final',
      qualOut: 'Quedaron afuera en el clasificatorio', qualIn: 'Ganaron el clasificatorio', field: 'Participantes', managerOnly: 'El DT decide qué torneos juega el equipo.',
      fsPitch: 'Abrí una división de freestyle: fichá hasta 3 freestylers, sumá seguidores con sus clips, ganá plata de sponsors y competí en batallas de freestyle con jueces.',
      fsOpen: 'Abrir división ({m})', roster: 'Tus freestylers', market: 'Mercado', marketIn: 'Caras nuevas en {n} días', sign: 'Fichar ({m})', release: 'Liberar',
      tech: 'Técnica', creat: 'Creatividad', cons: 'Regularidad', hype: 'Hype', wage: 'Sueldo/sem', focus: 'Enfoque', f_tech: 'Técnica', f_creat: 'Creatividad', f_content: 'Contenido',
      move: 'Firma', comps: 'Torneos de freestyle', risk: 'Rutina', r_safe: 'Segura', r_balanced: 'Equilibrada', r_risky: 'Arriesgada', auto: 'elegido solo',
      entries: 'Inscriptos', fsRank: 'Ranking de freestyle', viral: 'Clips virales', week: 'Última semana: +{i} sponsors, -{w} sueldos', pts: 'pts', invite: 'Solo invitados (top {n})',
      skill: 'Nivel', bail: 'se cayó', fsEmpty: 'Todavía no tenés freestylers. Fichá uno del mercado.',
      wtTitle: 'Sedes', wtInfo: 'Los Majors y el Mundial cambian de ciudad cada temporada ({n} ciudades). Los torneos que ya empezaron conservan su nombre.',
      wtOn: 'Rotación activada', wtOff: 'Rotación desactivada', wtEvery: 'Rotar también las temporadas con póster oficial (se pierde el póster)', wtEveryOn: 'Rotando todas las temporadas', history: 'Historial de sedes',
      rotated: 'rotada', official: 'arte oficial', done: 'terminado', season: 'Temporada',
      v_awards: 'Premios', m_hoops: 'Hoops', m_dropshot: 'Dropshot', m_rumble: 'Rumble', m_snowday: 'Snow Day', m_heatseeker: 'Heatseeker', modeInfo: 'Modo divertido: más sorpresas, más seguidores',
      trips: 'Viajes', tripInfo: 'Planificá el viaje a cada Major / Mundial. Un bootcamp en la ciudad sede evita el jet lag (+1 de forma durante el torneo, +3 de moral). El viaje estándar es gratis, pero cruzar husos horarios cuesta forma los primeros 2 días. Jugar en tu región sube la moral.',
      standard: 'Viaje estándar', bootcamp: 'Bootcamp ({m})', jet: 'Jet lag -{n} de forma', noJet: 'Sin jet lag', home: '¡Juegan de local! +4 de moral', visa: '{n}: visa trabada', visaFix: 'Visa exprés ({m})', visaFixed: 'Visa resuelta', visaMissed: 'Se perdió el torneo (visa)',
      st_planning: 'planificando', st_there: 'en la sede', st_done: 'de vuelta', 'st_not-qualified': 'no clasificaron', tripLog: 'Viajes anteriores',
      awardsLive: 'Carrera de la temporada {s} (en vivo)', awardsPast: 'Premios de la temporada {s}', minGames: 'Jugadores con 12+ partidos. Los premios se entregan al terminar el Mundial.',
      allstar: 'All-Star', asDate: 'All-Star el {d}', voting: 'Votación de los hinchas · partido en {n} días', west: 'Oeste (NA · SAM · OCE)', east: 'Este', votes: 'votos', campaign: 'Hacer campaña por un jugador ({m})', campaigned: 'Campaña en marcha por {n}',
      asResult: 'Gana el {w} {s} · MVP {m}', W: 'Oeste', E: 'Este', asNone: 'La votación abre unas dos semanas antes del partido.', asPast: 'El All-Star de esta temporada ya se jugó. El próximo es a mitad de la temporada que viene.', noTrips: 'Cada viaje aparece 3 semanas antes de su Major / Mundial.',
    },
  };
  const t = (k, p) => X.tr(D, k, p);
  const e = X.e;
  const args = (o) => e(JSON.stringify(o));
  const tierCls = { S: '#fbbf24', A: '#f472b6', B: '#60a5fa', C: '#a3e635', D: '#94a3b8' };
  const tierPill = (tier) => `<span class="xt-pill" style="border-color:${tierCls[tier]};color:${tierCls[tier]};font-weight:900">${tier}</span>`;
  const when = (n) => (n <= 0 ? t('today') : t('inDays', { n }));
  const placeTxt = (p) => t(p === 1 ? 'p1' : p === 2 ? 'p2' : p <= 4 ? 'p3' : 'p5');

  function bracket(ev) {
    if (!ev.rounds || !ev.rounds.length) return '';
    const names = [t('qf'), t('sf'), t('fin')];
    return `<div class="xt-grid xt-three" style="margin-top:8px">${ev.rounds.map((rd, i) => `<div><div class="xt-muted">${e(names[i] || '')}</div>${rd.map((m) => `<div class="xt-row" style="${m.mine ? 'color:var(--a1);font-weight:800' : ''}"><span>${m.w === m.a ? '<b>' + e(m.a) + '</b>' : e(m.a)}<br>${m.w === m.b ? '<b>' + e(m.b) + '</b>' : e(m.b)}</span><span class="num">${m.aw == null ? '—' : m.aw + '<br>' + m.bw}</span></div>`).join('')}</div>`).join('')}</div>`;
  }

  function eventCard(ev, C) {
    const MI = { hoops: '🏀', dropshot: '💥', rumble: '🥊', snowday: '🏒', heatseeker: '🎯' };
    const fmt = `<span class="xt-pill">${e(ev.format)}</span>` + (ev.mode ? `<span class="xt-pill acc" title="${e(t('modeInfo'))}">${MI[ev.mode] || ''} ${e(t('m_' + ev.mode))}</span>` : '');
    let status = '';
    let actions = '';
    if (ev.status === 'upcoming') status = `<span class="xt-muted">${e(t('opensIn', { n: Math.max(0, ev.opensIn) }))}</span>`;
    else if (ev.status === 'open') {
      if (!ev.eligible) status = `<span class="xt-pill bad">${e(t('notEligible'))}</span>`;
      else {
        status = ev.entered ? `<span class="xt-pill good">${e(t('entered'))}</span>` : ev.invited ? `<span class="xt-pill acc">${e(t('invited'))}</span>` : `<span class="xt-muted">${e(t('notEntered'))}</span>`;
        if (C.enabled) {
          const n = ev.format === '1v1' ? 1 : ev.format === '2v2' ? 2 : 3;
          let chooser = '';
          if (n < 3) {
            const sel = picks[ev.id] || (picks[ev.id] = (ev.pids && ev.pids.length ? ev.pids.slice() : C.roster.filter((p) => !p.isUser).sort((a, b) => b.rating - a.rating).slice(0, n).map((p) => p.id)));
            chooser = `<div class="xt-muted" style="margin:6px 0 2px">${e(t('pickN', { n }))}</div><div style="display:flex;flex-wrap:wrap;gap:4px">${C.roster.map((p) => `<button class="xt-btn ${sel.includes(p.id) ? 'on' : ''}" data-xt-local="pick:${ev.id}:${p.id}:${n}">${e(p.name)} <span style="opacity:.7">${p.rating}</span></button>`).join('')}</div>`;
          }
          const enterArgs = n < 3 ? { id: ev.id, pids: picks[ev.id] } : { id: ev.id };
          actions = `${chooser}<div class="xt-actions" style="margin-top:8px">${ev.entered ? `<button class="xt-btn warn" data-xt-cmd="circuit:withdraw" data-xt-args="${args({ id: ev.id })}">${e(ev.invited ? t('decline') : t('withdraw'))}</button>` : ''}<button class="xt-btn on" data-xt-cmd="circuit:enter" data-xt-args="${args(enterArgs)}">${e(ev.entered ? (n < 3 ? t('enter') + ' ✓' : t('entered')) : ev.invited ? t('accept') : t('enter'))}</button></div>`;
        }
      }
    } else if (ev.status === 'locked') status = `<span class="xt-pill">${e(t('locked'))}</span>`;
    else if (ev.status === 'running') status = `<span class="xt-pill acc">${e(t('running'))}</span>`;
    else status = ev.place ? `<span class="xt-pill ${ev.place === 1 ? 'good' : ''}">${e(placeTxt(ev.place))}${ev.prize ? ' · ' + X.money(ev.prize) : ''}</span>` : `<span class="xt-muted">${e(t('champ', { c: ev.champion || '?' }))}</span>`;
    const notes = [];
    if (ev.qualifier && !ev.invited && ev.status === 'open') notes.push(t('qualifier'));
    if (ev.travel && ev.status !== 'done') notes.push(t('travel', { m: X.money(ev.travel) }));
    if (ev.qual) notes.push((ev.qual.every((q) => q.aw > q.bw) ? t('qualIn') : t('qualOut')) + ': ' + ev.qual.map((q) => `${q.aw}-${q.bw} vs ${q.opp}`).join(', '));
    if (ev.status === 'done' && ev.place) notes.push(t('champ', { c: ev.champion || '?' }));
    const showB = open[ev.id];
    const bBtn = ev.rounds.length ? `<button class="xt-btn" data-xt-local="br:${ev.id}">${e(showB ? t('hide') : t('bracket'))}</button>` : '';
    return `<div class="xt-card ${ev.status === 'open' && ev.invited && !ev.entered ? 'alert' : ''}" style="margin-bottom:10px">
      <div class="xt-row" style="border:0"><span>${tierPill(ev.tier)}${fmt}<b style="font-size:15px">${e(ev.name)}</b></span><span class="xt-muted">${X.fmtDate(ev.start)}${ev.status !== 'done' ? ' · ' + e(when(ev.inDays)) : ''}</span></div>
      <div class="xt-row"><span>${e(t('pool'))}: <b>${X.money(ev.pool)}</b></span><span>${status} ${bBtn}</span></div>
      ${notes.map((n) => `<div class="xt-muted">${e(n)}</div>`).join('')}${actions}${showB ? bracket(ev) : ''}</div>`;
  }

  function eventsView(C) {
    const live = C.events.filter((ev) => ev.status !== 'done');
    const done = C.events.filter((ev) => ev.status === 'done').reverse();
    const cab = C.trophies.length ? C.trophies.map((x) => `<div class="xt-row"><span>🏆 ${tierPill(x.tier)}${e(x.name)} <span class="xt-muted">${e(x.format)}</span></span><span class="xt-muted">${e(t('season'))} ${x.season}</span></div>`).join('') : `<div class="xt-muted">${e(t('none'))}</div>`;
    return `<div class="xt-grid xt-three" style="margin-bottom:12px">
        <div class="xt-card xt-stat"><span class="k">${e(t('worldRank'))}</span><span class="v">#${C.worldRank || '—'}</span></div>
        <div class="xt-card xt-stat"><span class="k">${e(t('regionRank'))} ${e(String(C.region || '').toUpperCase())}</span><span class="v">#${C.regionRank || '—'}</span></div>
        <div class="xt-card xt-stat"><span class="k">${e(t('earnings'))}</span><span class="v">${X.money(C.earnings)}</span></div>
        <div class="xt-card xt-stat"><span class="k">${e(t('trophies'))}</span><span class="v">${C.trophies.length}</span></div></div>
      <div class="xt-muted" style="margin-bottom:10px">${e(t('tierInfo'))}</div>
      ${C.enabled ? '' : `<div class="xt-card" style="margin-bottom:10px">${e(t('managerOnly'))}</div>`}
      <div class="xt-grid xt-two"><div><h3 class="xt-h1" style="margin:4px 0 8px">${e(t('upcoming'))}</h3>${live.map((ev) => eventCard(ev, C)).join('') || `<div class="xt-card xt-muted">${e(t('none'))}</div>`}</div>
      <div><h3 class="xt-h1" style="margin:4px 0 8px">${e(t('results'))}</h3>${done.map((ev) => eventCard(ev, C)).join('') || `<div class="xt-card xt-muted">${e(t('none'))}</div>`}
      <div class="xt-card"><h3>${e(t('cabinet'))}</h3>${cab}</div></div></div>`;
  }

  // ---------- freestyle ----------
  function statBar(label, v) { return `<div class="xt-row"><span>${e(label)}</span><span style="display:flex;gap:8px;align-items:center;width:150px"><b>${v}</b>${X.bar(v)}</span></div>`; }
  function fsCard(fs, F) {
    const foc = ['tech', 'creat', 'content'].map((f) => `<button class="xt-btn ${fs.focus === f ? 'on' : ''}" data-xt-cmd="freestyle:focus" data-xt-args="${args({ id: fs.id, value: f })}">${e(t('f_' + f))}</button>`).join('');
    return `<div class="xt-card"><h3><span>🌀 ${e(fs.name)} <span class="xt-muted">${e(fs.nation)} · ${fs.age}</span></span><span>${e(t('skill'))} ${fs.skill}</span></h3>
      ${statBar(t('tech'), fs.tech)}${statBar(t('creat'), fs.creat)}${statBar(t('cons'), fs.cons)}
      <div class="xt-row"><span>${e(t('hype'))}</span><b>${fs.hype.toLocaleString()}</b></div><div class="xt-row"><span>${e(t('move'))}</span><span>${e(fs.move)}</span></div>
      <div class="xt-row"><span>${e(t('wage'))}</span><span>${X.money(fs.wage)}</span></div>
      <div class="xt-muted" style="margin-top:6px">${e(t('focus'))}</div><div class="xt-actions" style="justify-content:flex-start">${foc}</div>
      <div class="xt-actions" style="margin-top:8px"><button class="xt-btn warn" data-xt-cmd="freestyle:release" data-xt-args="${args({ id: fs.id })}" data-xt-confirm="${e(t('release'))} ${e(fs.name)}?">${e(t('release'))}</button></div></div>`;
  }

  function fsEvent(ev, F) {
    const roster = F.roster;
    let body = '';
    if (ev.status === 'upcoming' && F.open && roster.length) {
      const ent = roster.map((fs) => `<button class="xt-btn ${ev.entries.includes(fs.id) ? 'on' : ''}" data-xt-cmd="freestyle:entry" data-xt-args="${args({ event: ev.id, toggle: fs.id })}">${e(fs.name)}</button>`).join('');
      const risk = ['safe', 'balanced', 'risky'].map((r) => `<button class="xt-btn ${ev.risk === r ? 'on' : ''}" data-xt-cmd="freestyle:entry" data-xt-args="${args({ event: ev.id, risk: r })}">${e(t('r_' + r))}</button>`).join('');
      body = `<div class="xt-row"><span>${e(t('entries'))}${ev.auto ? ` <span class="xt-muted">(${e(t('auto'))})</span>` : ''}</span><span class="xt-actions">${ent}</span></div><div class="xt-row"><span>${e(t('risk'))}</span><span class="xt-actions">${risk}</span></div>`;
    }
    if (ev.status === 'done') {
      const res = (ev.result || []).map((r) => `<span class="xt-pill ${r.place === 1 ? 'good' : ''}">${e(r.name)} ${e(placeTxt(r.place))}${r.prize ? ' · ' + X.money(r.prize) : ''}</span>`).join('');
      body = `<div class="xt-row"><span>${e(t('champ', { c: ev.champion }))}</span><span>${res}</span></div>`;
      if (open[ev.id]) {
        const names = [t('qf'), t('sf'), t('fin')];
        body += `<div class="xt-grid xt-three" style="margin-top:6px">${ev.rounds.map((rd, i) => `<div><div class="xt-muted">${e(names[i] || '')}</div>${rd.map((m) => `<div class="xt-row" style="${m.mine ? 'color:var(--a1);font-weight:800' : ''}"><span>${m.w === m.a ? '<b>' + e(m.a) + '</b>' : e(m.a)}${m.ba ? ` <i class="xt-muted">${e(t('bail'))}</i>` : ''}<br>${m.w === m.b ? '<b>' + e(m.b) + '</b>' : e(m.b)}${m.bb ? ` <i class="xt-muted">${e(t('bail'))}</i>` : ''}</span><span class="num">${m.sa}<br>${m.sb}</span></div>`).join('')}</div>`).join('')}</div>`;
      }
      body += `<div class="xt-actions"><button class="xt-btn" data-xt-local="br:${ev.id}">${e(open[ev.id] ? t('hide') : t('bracket'))}</button></div>`;
    }
    return `<div class="xt-card" style="margin-bottom:10px"><div class="xt-row" style="border:0"><span>${tierPill(ev.tier)}<b>${e(ev.name)}</b>${ev.invite ? ` <span class="xt-muted">${e(t('invite', { n: ev.invite }))}</span>` : ''}</span><span class="xt-muted">${X.fmtDate(ev.date)}${ev.status !== 'done' ? ' · ' + e(when(ev.inDays)) : ''}</span></div>
      <div class="xt-row"><span>${e(t('pool'))}: <b>${X.money(ev.pool)}</b></span></div>${body}</div>`;
  }

  function fsView(F) {
    if (!F) return '';
    const rank = F.ranking.map((r, i) => `<tr class="${r.mine ? 'me' : ''}"><td>${i + 1}</td><td>${e(r.name)}</td><td class="num">${r.skill}</td><td class="num">${r.points}</td></tr>`).join('');
    const right = `<div class="xt-card"><h3>${e(t('fsRank'))}</h3><table class="xt-table"><thead><tr><th>#</th><th></th><th class="num">${e(t('skill'))}</th><th class="num">${e(t('pts'))}</th></tr></thead><tbody>${rank}</tbody></table></div>
      ${F.viral.length ? `<div class="xt-card" style="margin-top:12px"><h3>🔥 ${e(t('viral'))}</h3>${F.viral.map((v) => `<div class="xt-row"><span>${e(v.name)} · ${e(v.move)}</span><span>+${v.gain.toLocaleString()} ${e(t('hype'))}</span></div>`).join('')}</div>` : ''}
      ${F.trophies.length ? `<div class="xt-card" style="margin-top:12px"><h3>${e(t('cabinet'))}</h3>${F.trophies.map((x) => `<div class="xt-row"><span>🏆 ${tierPill(x.tier)}${e(x.name)}</span><span>${e(x.who)}</span></div>`).join('')}</div>` : ''}`;
    if (!F.open) {
      return `<div class="xt-grid xt-two"><div class="xt-card"><h3>🌀 Freestyle</h3><div style="margin-bottom:10px">${e(t('fsPitch'))}</div>${F.enabled ? `<button class="xt-btn on" data-xt-cmd="freestyle:open" data-xt-args="{}">${e(t('fsOpen', { m: X.money(F.openCost) }))}</button>` : `<div class="xt-muted">${e(t('managerOnly'))}</div>`}</div><div>${right}</div></div>`;
    }
    const market = F.market.map((fs) => `<tr><td><b>${e(fs.name)}</b><div class="xt-muted">${e(fs.nation)} · ${fs.age} · ${e(fs.move)}</div></td><td class="num">${fs.tech}</td><td class="num">${fs.creat}</td><td class="num">${fs.cons}</td><td class="num">${fs.hype.toLocaleString()}</td><td class="num">${X.money(fs.wage)}</td><td class="num"><button class="xt-btn" data-xt-cmd="freestyle:sign" data-xt-args="${args({ id: fs.id })}"${F.roster.length >= F.rosterMax ? ' disabled' : ''}>${e(t('sign', { m: X.money(fs.fee) }))}</button></td></tr>`).join('');
    const live = F.events.filter((x) => x.status !== 'done');
    const done = F.events.filter((x) => x.status === 'done').reverse();
    return `${F.lastWeek ? `<div class="xt-muted" style="margin-bottom:8px">${e(t('week', { i: X.money(F.lastWeek.income), w: X.money(F.lastWeek.wages) }))}</div>` : ''}
      <h3 class="xt-h1" style="margin:4px 0 8px">${e(t('roster'))} (${F.roster.length}/${F.rosterMax})</h3>
      <div class="xt-grid xt-three">${F.roster.map((fs) => fsCard(fs, F)).join('') || `<div class="xt-card xt-muted">${e(t('fsEmpty'))}</div>`}</div>
      <div class="xt-card" style="margin-top:12px"><h3><span>${e(t('market'))}</span><span class="xt-muted">${e(t('marketIn', { n: F.marketIn }))}</span></h3>
      <table class="xt-table"><thead><tr><th></th><th class="num">${e(t('tech'))}</th><th class="num">${e(t('creat'))}</th><th class="num">${e(t('cons'))}</th><th class="num">${e(t('hype'))}</th><th class="num">${e(t('wage'))}</th><th></th></tr></thead><tbody>${market}</tbody></table></div>
      <div class="xt-grid xt-two" style="margin-top:12px"><div><h3 class="xt-h1" style="margin:4px 0 8px">${e(t('comps'))}</h3>${live.map((ev) => fsEvent(ev, F)).join('') || `<div class="xt-card xt-muted">${e(t('none'))}</div>`}${done.map((ev) => fsEvent(ev, F)).join('')}</div><div>${right}</div></div>`;
  }

  // ---------- world tour ----------
  function tripsCard(T) {
    if (!T) return '';
    const list = T.trips.map((tr) => {
      const can = T.enabled && tr.status === 'planning';
      const plans = can ? `<div class="xt-actions" style="justify-content:flex-start;margin-top:6px"><button class="xt-btn ${tr.plan === 'standard' ? 'on' : ''}" data-xt-cmd="travel:plan" data-xt-args="${args({ id: tr.id, plan: 'standard' })}">${e(t('standard'))}</button><button class="xt-btn ${tr.plan === 'bootcamp' ? 'on' : ''}" data-xt-cmd="travel:plan" data-xt-args="${args({ id: tr.id, plan: 'bootcamp' })}">${e(t('bootcamp', { m: X.money(T.cost.bootcamp) }))}</button></div>` : '';
      let visa = '';
      if (tr.visa) {
        if (tr.visa.status === 'pending') visa = `<div class="xt-row"><span class="xt-pill bad">${e(t('visa', { n: tr.visa.name }))}</span>${can ? `<button class="xt-btn on" data-xt-cmd="travel:visa" data-xt-args="${args({ id: tr.id })}">${e(t('visaFix', { m: X.money(T.cost.visa) }))}</button>` : ''}</div>`;
        else visa = `<div class="xt-muted">${e(tr.visa.name)}: ${e(t(tr.visa.status === 'fixed' ? 'visaFixed' : 'visaMissed'))}</div>`;
      }
      const lag = tr.home ? `<span class="xt-pill good">${e(t('home'))}</span>` : tr.jet ? `<span class="xt-pill bad">${e(t('jet', { n: tr.jet }))}</span>` : `<span class="xt-pill">${e(t('noJet'))}</span>`;
      return `<div class="xt-card ${tr.visa && tr.visa.status === 'pending' ? 'alert' : ''}" style="margin-top:8px"><div class="xt-row" style="border:0"><span><b>✈️ ${e(tr.name)}</b> <span class="xt-muted">${e(tr.city || '?')}${tr.region ? ' · ' + e(String(tr.region).toUpperCase()) : ''}</span></span><span class="xt-muted">${X.fmtDate(tr.start)} · ${e(t('st_' + tr.status))}</span></div><div class="xt-row">${lag}<span class="xt-muted">${e(tr.status === 'planning' ? when(tr.inDays) : '')}</span></div>${visa}${plans}</div>`;
    }).join('');
    const log = T.log.length ? `<div class="xt-muted" style="margin-top:10px">${e(t('tripLog'))}</div>` + T.log.map((l) => `<div class="xt-row"><span>${e(l.name)}</span><span class="xt-muted">${e(l.plan === 'bootcamp' ? 'bootcamp' : l.home ? t('home') : l.jet ? t('jet', { n: l.jet }) : t('noJet'))}${l.visa ? ' · visa ' + e(l.visa) : ''}</span></div>`).join('') : '';
    return `<div class="xt-card" style="margin-top:12px"><h3>✈️ ${e(t('trips'))}</h3><div class="xt-muted">${e(t('tripInfo'))}</div>${list || `<div class="xt-muted" style="margin-top:8px">${e(t('noTrips'))}</div>`}${log}</div>`;
  }

  function awardsView(A) {
    if (!A) return '';
    const lang = X.lang();
    const L = (k) => (A.labels[k] && (A.labels[k][lang] || A.labels[k].en)) || k;
    const row = (k, w) => (w ? `<div class="xt-row" style="${w.mine ? 'color:var(--a1);font-weight:800' : ''}"><span>${e(L(k))}</span><span>${e(w.name || w.team)} <span class="xt-muted">${e(w.name ? w.team : '')}${w.value != null ? ' · ' + e(w.value) : ''}${w.w != null ? ' · ' + w.w + '-' + w.l : ''}</span></span></div>` : '');
    const block = (aw) => ['mvp', 'scorer', 'playmaker', 'wall', 'rookie'].map((k) => row(k, aw[k])).join('') + row('coach', aw.coach)
      + `<div class="xt-row"><span>${e(L('team'))}</span><span>${aw.team.map((p) => (p.mine ? `<b style="color:var(--a1)">${e(p.name)}</b>` : e(p.name))).join(', ')}</span></div>`;
    const live = `<div class="xt-card"><h3>🏅 ${e(t('awardsLive', { s: A.season }))}</h3><div class="xt-muted" style="margin-bottom:6px">${e(t('minGames'))}</div>${A.live ? block(A.live) : ''}</div>`;
    const past = A.history.map((h) => `<div class="xt-card" style="margin-top:12px"><h3>🏆 ${e(t('awardsPast', { s: h.season }))}</h3>${block(h.awards)}</div>`).join('');
    const S = A.allstar;
    const names = (list) => list.map((p) => (p.mine ? `<b style="color:var(--a1)">${e(p.name)}</b>` : e(p.name))).join(', ');
    let as = A.allstarPast ? `<div class="xt-muted">${e(t('asPast'))}</div>` : `<div class="xt-muted">${A.allstarDate ? e(t('asDate', { d: X.fmtDate(A.allstarDate) })) + ' · ' : ''}${e(t('asNone'))}</div>`;
    if (S && S.status === 'voting') {
      const side = (list, label) => `<div><div class="xt-muted">${e(label)}</div>${list.map((p, i) => `<div class="xt-row" style="${p.mine ? 'color:var(--a1);font-weight:800' : ''}"><span>${i < 3 ? '⭐ ' : ''}${e(p.name)} <span class="xt-muted">${e(p.team)}</span></span><span class="xt-muted">${p.votes.toLocaleString()} ${e(t('votes'))}</span></div>`).join('')}</div>`;
      const camp = S.campaign ? `<div class="xt-pill acc">${e(t('campaigned', { n: S.campaign }))}</div>`
        : A.enabled ? `<div class="xt-muted">${e(t('campaign', { m: X.money(A.campaignCost) }))}</div><div class="xt-actions" style="justify-content:flex-start">${S.myPlayers.map((p) => `<button class="xt-btn" data-xt-cmd="awards:campaign" data-xt-args="${args({ pid: p.id })}">${e(p.name)}</button>`).join('')}</div>` : '';
      as = `<div class="xt-muted" style="margin-bottom:8px">${e(t('voting', { n: Math.max(0, S.inDays) }))}</div><div class="xt-grid xt-two">${side(S.west, t('west'))}${side(S.east, t('east'))}</div><div style="margin-top:8px">${camp}</div>`;
    } else if (S && S.status === 'done' && S.result) {
      const R = S.result;
      as = `<div style="font-weight:800">${e(t('asResult', { w: R.winner === 'west' ? t('W') : t('E'), s: Math.max(R.w, R.e) + '-' + Math.min(R.w, R.e), m: R.mvp }))}</div><div class="xt-row"><span>${e(t('west'))}</span><span>${names(R.west)}</span></div><div class="xt-row"><span>${e(t('east'))}</span><span>${names(R.east)}</span></div>`;
    }
    const asLog = (A.allstarLog || []).slice(1).map((l) => `<div class="xt-row"><span>${e(t('season'))} ${l.season}</span><span class="xt-muted">${e(l.score)} · MVP ${e(l.mvp)}</span></div>`).join('');
    return `<div class="xt-grid xt-two"><div>${live}${past}</div><div class="xt-card"><h3>⭐ ${e(t('allstar'))}</h3>${as}${asLog}</div></div>`;
  }

  function worldView(W) {
    if (!W) return '';
    const cur = W.current.map((ev) => `<div class="xt-row"><span><b>${e(ev.name)}</b> <span class="xt-muted">${X.fmtDate(ev.start)}</span></span><span>${ev.rotated ? `<span class="xt-pill acc">${e(t('rotated'))}</span>` : ''}${ev.official ? `<span class="xt-pill">${e(t('official'))}</span>` : ''}${ev.done ? `<span class="xt-pill">${e(t('done'))}</span>` : ''}</span></div>`).join('');
    const hist = W.history.map((h) => `<div class="xt-row"><span>${e(t('season'))} ${h.season}</span><span>${e(h.city)}${h.country ? ` <span class="xt-muted">${e(h.country)}</span>` : ''}</span></div>`).join('');
    return `<div class="xt-grid xt-two"><div class="xt-card"><h3>🌍 ${e(t('wtTitle'))}</h3><div class="xt-muted" style="margin-bottom:10px">${e(t('wtInfo', { n: W.poolSize }))}</div>${cur}
      <div class="xt-actions" style="margin-top:12px;justify-content:flex-start"><button class="xt-btn ${W.enabled ? 'on' : ''}" data-xt-cmd="world:toggle" data-xt-args="${args({ value: !W.enabled })}">${e(W.enabled ? t('wtOn') : t('wtOff'))}</button>
      <button class="xt-btn ${W.everywhere ? 'on' : ''}" data-xt-cmd="world:everywhere" data-xt-args="${args({ value: !W.everywhere })}">${e(W.everywhere ? t('wtEveryOn') : t('wtEvery'))}</button></div></div>
      <div class="xt-card"><h3>${e(t('history'))}</h3>${hist || `<div class="xt-muted">${e(t('none'))}</div>`}</div></div>${tripsCard(X.snap() && X.snap().travel)}`;
  }

  function page() {
    const s = X.snap();
    if (!s) return '<div class="xt"><div class="xt-card xt-muted">…</div></div>';
    const views = [['events', 'circuit'], ['fs', 'freestyle'], ['world', 'world'], ['awards', 'awards']].filter(([, m]) => X.on(m) || (m === 'world' && X.on('travel'))).map(([k]) => k);
    if (!views.length) return '<div class="xt"><div class="xt-card xt-muted">—</div></div>';
    let v = X.view(TAB, views[0]);
    if (!views.includes(v)) v = views[0];
    const nav = views.map((k) => `<button class="${v === k ? 'on' : ''}" data-xt-view="${TAB}:${k}">${e(t('v_' + k))}</button>`).join('');
    const body = v === 'fs' ? fsView(s.freestyle) : v === 'world' ? (worldView(s.world) || tripsCard(s.travel)) : v === 'awards' ? awardsView(s.awards) : s.circuit ? eventsView(s.circuit) : '';
    return `<div class="xt circ"><div class="xt-head"><div style="font-size:40px">🏟️</div><div class="grow"><div class="xt-h1">${e(t('title'))}</div><div class="xt-h2">${e(t('sub'))}</div></div></div><div class="xt-nav">${nav}</div>${body}</div>`;
  }

  function pending() {
    const s = X.snap();
    if (!s || !s.circuit || !s.circuit.enabled) return 0;
    const tr = s.travel ? s.travel.trips.filter((x) => x.visa && x.visa.status === 'pending' && x.status === 'planning').length : 0;
    return s.circuit.events.filter((ev) => ev.status === 'open' && ev.invited && !ev.entered).length + tr;
  }

  if (!document.getElementById('xt-style-circ')) {
    const st = document.createElement('style');
    st.id = 'xt-style-circ';
    st.textContent = '.xt.circ{--a1:#fbbf24;--a2:#d97706;--line:rgba(251,191,36,.2)}';
    document.head.appendChild(st);
  }

  X.addTab({
    id: TAB,
    icon: '🏟️',
    color: '#fbbf24',
    label: () => t('tab'),
    badge: pending,
    visible: () => X.anyOn(['circuit', 'freestyle', 'world', 'travel', 'awards']),
    render: page,
    local(v) {
      const [kind, id, pid, n] = v.split(':');
      if (kind === 'br') open[id] = !open[id];
      if (kind === 'pick') {
        const sel = picks[id] || (picks[id] = []);
        const p = Number(pid);
        const i = sel.indexOf(p);
        if (i !== -1) sel.splice(i, 1);
        else { sel.push(p); while (sel.length > Number(n)) sel.shift(); }
      }
      render();
    },
    beforeCmd(m, op, a) {
      if (m === 'circuit' && op === 'enter' && picks[a.id]) return Object.assign({}, a, { pids: picks[a.id] });
      return a;
    },
  });
  try { render(); } catch { }
})();
