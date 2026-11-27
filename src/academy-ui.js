// RL Career Extras — Academy (cantera) + B team tab.
(function () {
  const X = window.__xt;
  if (!X || window.__xtAcademyUI) return;
  window.__xtAcademyUI = true;
  const TAB = 'xtacademy';

  const D = {
    en: {
      tab: 'Academy', title: 'Academy & B Team', level: 'Academy level {n}', upkeep: '{m}/week upkeep', budget: 'Budget',
      unpaid: 'Upkeep unpaid: training at half speed until the budget recovers.', intensity: 'Training intensity',
      light: 'Light', normal: 'Normal', intense: 'Intense', upgrade: 'Upgrade ({m})', maxed: 'Max level', trial: 'Open trials ({m})', trialWait: 'Trials in {n}d',
      overview: 'Overview', prospects: 'Prospects', bteam: 'B Team', league: 'Development League',
      academySq: 'Academy ({n}/{max})', bSq: 'B Team ({n}/{max})', empty: 'Nobody here yet.',
      name: 'Player', age: 'Age', rating: 'Rating', pot: 'Potential', style: 'Style', morale: 'Morale', stats: 'G / A / S', actions: '',
      toB: '→ B Team', toAcad: '→ Academy', promote: 'Promote', sell: 'Sell {m}', release: 'Release',
      confirmRelease: 'Release {name}? This cannot be undone.', confirmSell: 'Sell {name} for {m}?', confirmPromote: 'Promote {name} to the first team? This creates a real player on a 3-season deal.',
      striker: 'Striker', playmaker: 'Playmaker', anchor: 'Anchor',
      table: 'Standings', team: 'Team', w: 'W', l: 'L', gd: 'GD', round: 'Round {r}/{n}', done: 'Season finished', lastRes: 'Last round', nextMatch: 'Next match',
      bStrength: 'B team strength {n}', trialists: 'Fewer than 3 B team players: trialists (rated 42) fill the gaps.',
      roster: 'First team {n}/{max}', trophies: 'Academy trophies', graduates: 'Graduates', history: 'Past seasons', pos: '{p}º place',
      managerOnly: 'The academy is only available in manager careers.',
      howto: 'Prospects grow every Monday. Intense training is faster but tires them; B team players also gain from Development League matches. Ratings below 40 are raised to 40 when promoted.',
      promoted: 'Promoted to the first team', sold: 'Sold for {m}', trialDone: 'New prospect: {name}',
    },
    es: {
      tab: 'Cantera', title: 'Cantera y Equipo B', level: 'Academia nivel {n}', upkeep: '{m}/semana de mantenimiento', budget: 'Presupuesto',
      unpaid: 'Mantenimiento impago: el entrenamiento va a mitad de velocidad hasta que se recupere el presupuesto.', intensity: 'Intensidad de entrenamiento',
      light: 'Suave', normal: 'Normal', intense: 'Intensa', upgrade: 'Mejorar ({m})', maxed: 'Nivel máximo', trial: 'Pruebas abiertas ({m})', trialWait: 'Pruebas en {n}d',
      overview: 'Resumen', prospects: 'Juveniles', bteam: 'Equipo B', league: 'Liga de Desarrollo',
      academySq: 'Cantera ({n}/{max})', bSq: 'Equipo B ({n}/{max})', empty: 'Todavía no hay nadie.',
      name: 'Jugador', age: 'Edad', rating: 'Nivel', pot: 'Potencial', style: 'Estilo', morale: 'Moral', stats: 'G / A / At', actions: '',
      toB: '→ Equipo B', toAcad: '→ Cantera', promote: 'Subir', sell: 'Vender {m}', release: 'Liberar',
      confirmRelease: '¿Liberar a {name}? No se puede deshacer.', confirmSell: '¿Vender a {name} por {m}?', confirmPromote: '¿Subir a {name} al primer equipo? Se crea un jugador real con contrato de 3 temporadas.',
      striker: 'Delantero', playmaker: 'Armador', anchor: 'Ancla',
      table: 'Tabla', team: 'Equipo', w: 'G', l: 'P', gd: 'DG', round: 'Fecha {r}/{n}', done: 'Temporada terminada', lastRes: 'Última fecha', nextMatch: 'Próximo partido',
      bStrength: 'Fuerza del Equipo B {n}', trialists: 'Menos de 3 jugadores en el Equipo B: completan jugadores a prueba (nivel 42).',
      roster: 'Primer equipo {n}/{max}', trophies: 'Trofeos de la cantera', graduates: 'Egresados', history: 'Temporadas anteriores', pos: '{p}º puesto',
      managerOnly: 'La cantera solo está disponible en carreras de manager.',
      howto: 'Los juveniles mejoran cada lunes. El entrenamiento intenso es más rápido pero los cansa; los del Equipo B además suman por jugar la Liga de Desarrollo. Los niveles por debajo de 40 suben a 40 al ascender.',
      promoted: 'Subió al primer equipo', sold: 'Vendido por {m}', trialDone: 'Nuevo juvenil: {name}',
    },
  };
  const t = (k, p) => X.tr(D, k, p);
  const e = X.e;
  const snap = () => { const s = X.snap(); return s && s.academy; };
  const btn = (label, m, op, args, extra) => `<button class="xt-btn ${extra && extra.cls || ''}" data-xt-cmd="${m}:${op}" data-xt-args="${e(JSON.stringify(args || {}))}"${extra && extra.confirm ? ` data-xt-confirm="${e(extra.confirm)}"` : ''}${extra && extra.disabled ? ' disabled' : ''}>${e(label)}</button>`;

  function header(A) {
    const ints = ['light', 'normal', 'intense'].map((k) => `<button class="xt-btn ${A.intensity === k ? 'on' : ''}" data-xt-cmd="academy:intensity" data-xt-args="${e(JSON.stringify({ value: k }))}">${e(t(k))}</button>`).join(' ');
    const stars = '★'.repeat(A.level) + '☆'.repeat(A.maxLevel - A.level);
    return `<div class="xt-head">
      <div style="font-size:40px">🎓</div>
      <div class="grow"><div class="xt-h1">${e(t('title'))}</div><div class="xt-h2">${stars} ${e(t('level', { n: A.level }))}</div>
        <div class="xt-sub">${e(t('upkeep', { m: X.money(A.upkeep) }))} · ${e(t('budget'))} ${X.money(A.budget)} · ${e(t('roster', { n: A.roster, max: A.rosterMax }))}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        <div class="xt-muted">${e(t('intensity'))}</div><div>${ints}</div>
        <div>${A.nextUpgrade != null ? btn(t('upgrade', { m: X.money(A.nextUpgrade) }), 'academy', 'upgrade', {}, { disabled: A.budget < A.nextUpgrade }) : `<span class="xt-pill acc">${e(t('maxed'))}</span>`}
        ${A.trialIn > 0 ? `<span class="xt-pill">${e(t('trialWait', { n: A.trialIn }))}</span>` : btn(t('trial', { m: X.money(A.trialCost) }), 'academy', 'trial', {}, { disabled: A.budget < A.trialCost })}</div>
      </div>
    </div>${A.unpaid ? `<div class="xt-card alert" style="margin-bottom:12px">⚠️ ${e(t('unpaid'))}</div>` : ''}`;
  }

  function prospectRows(A, list) {
    if (!list.length) return `<tr><td colspan="8" class="xt-muted">${e(t('empty'))}</td></tr>`;
    const bCount = A.prospects.filter((p) => p.squad === 'b').length;
    const acCount = A.prospects.filter((p) => p.squad === 'academy').length;
    return list.map((p) => {
      const move = p.squad === 'academy'
        ? btn(t('toB'), 'academy', 'to_b', { id: p.id }, { disabled: bCount >= A.bMax })
        : (p.age <= 18 ? btn(t('toAcad'), 'academy', 'to_academy', { id: p.id }, { disabled: acCount >= A.slots }) : '');
      const promote = btn(t('promote'), 'academy', 'promote', { id: p.id }, { disabled: A.roster >= A.rosterMax, confirm: t('confirmPromote', { name: p.name }) });
      const sell = btn(t('sell', { m: X.money(p.fee) }), 'academy', 'sell', { id: p.id }, { confirm: t('confirmSell', { name: p.name, m: X.money(p.fee) }) });
      const rel = btn(t('release'), 'academy', 'release', { id: p.id }, { cls: 'warn', confirm: t('confirmRelease', { name: p.name }) });
      const ratingCell = `<b>${p.rating}</b>${X.bar(p.progress)}`;
      return `<tr><td><b>${e(p.name)}</b><div class="xt-muted">${e(p.nation)}</div></td><td class="num">${p.age}</td><td style="min-width:70px">${ratingCell}</td><td class="num">${p.potLo}–${p.potHi}</td><td>${e(t(p.style))}</td><td style="min-width:70px">${p.morale}${X.bar(p.morale, p.morale < 50 ? 'red' : '')}</td><td class="num">${p.stats.goals} / ${p.stats.assists} / ${p.stats.saves}</td><td><div class="xt-actions">${move}${promote}${sell}${rel}</div></td></tr>`;
    }).join('');
  }

  function prospectTable(A, squad) {
    const list = A.prospects.filter((p) => p.squad === squad);
    return `<table class="xt-table"><thead><tr><th>${e(t('name'))}</th><th class="num">${e(t('age'))}</th><th>${e(t('rating'))}</th><th class="num">${e(t('pot'))}</th><th>${e(t('style'))}</th><th>${e(t('morale'))}</th><th class="num">${e(t('stats'))}</th><th></th></tr></thead><tbody>${prospectRows(A, list)}</tbody></table>`;
  }

  function leagueCard(A, compact) {
    const Lg = A.league;
    if (!Lg) return '';
    const rows = Lg.table.map((r, i) => `<tr class="${r.mine ? 'me' : ''}"><td>${i + 1}</td><td>${e(r.name)}</td><td class="num">${r.w}</td><td class="num">${r.l}</td><td class="num">${r.gw - r.gl > 0 ? '+' : ''}${r.gw - r.gl}</td></tr>`).join('');
    const status = Lg.done ? t('done') : t('round', { r: Lg.round, n: Lg.rounds });
    const res = (m) => `<div class="xt-row"><span>${m.mine ? '<b>' : ''}${e(m.home)}${m.mine ? '</b>' : ''}</span><span><b>${m.hw != null ? m.hw + ' - ' + m.aw : 'vs'}</b></span><span>${e(m.away)}</span></div>`;
    const last = Lg.last.length ? Lg.last.map(res).join('') : '';
    const next = Lg.next.length ? Lg.next.map(res).join('') : '';
    return `<div class="xt-card"><h3><span>🏟️ ${e(t('league'))}</span><span class="xt-muted">${e(status)}</span></h3>
      <table class="xt-table"><thead><tr><th>#</th><th>${e(t('team'))}</th><th class="num">${e(t('w'))}</th><th class="num">${e(t('l'))}</th><th class="num">${e(t('gd'))}</th></tr></thead><tbody>${rows}</tbody></table>
      ${compact ? '' : `${next ? `<div style="margin-top:12px" class="xt-muted">${e(t('nextMatch'))}</div>${next}` : ''}${last ? `<div style="margin-top:12px" class="xt-muted">${e(t('lastRes'))}</div>${last}` : ''}`}
    </div>`;
  }

  function overview(A) {
    const top = A.prospects.slice(0, 5);
    const topRows = top.length ? top.map((p) => `<div class="xt-row"><span><b>${e(p.name)}</b> <span class="xt-muted">${p.age} · ${p.squad === 'b' ? 'B' : (X.lang() === 'es' ? 'Cantera' : 'Academy')}</span></span><span>${p.rating} <span class="xt-muted">(${p.potLo}–${p.potHi})</span></span></div>`).join('') : `<div class="xt-muted">${e(t('empty'))}</div>`;
    const trophies = A.trophies.length ? A.trophies.map((x) => `<div class="xt-row"><span>🏆 ${e(x.name)}</span><span class="xt-muted">S${x.season}</span></div>`).join('') : '<div class="xt-muted">—</div>';
    const grads = A.graduates.length ? A.graduates.slice(-6).reverse().map((g) => `<div class="xt-row"><span>🎓 ${e(g.name)}</span><span class="xt-muted">${g.rating} · ${X.fmtDate(g.date)}</span></div>`).join('') : '<div class="xt-muted">—</div>';
    const hist = A.history.length ? A.history.slice().reverse().map((h) => `<div class="xt-row"><span>S${h.season}</span><span>${e(t('pos', { p: h.pos }))} · ${h.w}-${h.l}</span></div>`).join('') : '<div class="xt-muted">—</div>';
    return `<div class="xt-grid xt-two">
      <div class="xt-card"><h3>⭐ ${e(t('prospects'))}</h3>${topRows}<div class="xt-muted" style="margin-top:10px">${e(t('howto'))}</div></div>
      ${leagueCard(A, true)}
    </div>
    <div class="xt-grid xt-three" style="margin-top:12px">
      <div class="xt-card"><h3>🏆 ${e(t('trophies'))}</h3>${trophies}</div>
      <div class="xt-card"><h3>🎓 ${e(t('graduates'))}</h3>${grads}</div>
      <div class="xt-card"><h3>📜 ${e(t('history'))}</h3>${hist}</div>
    </div>`;
  }

  function page() {
    const A = snap();
    if (!A) return '<div class="xt acad"><div class="xt-card xt-muted">…</div></div>';
    if (!A.enabled) return `<div class="xt acad"><div class="xt-card">${e(t('managerOnly'))}</div></div>`;
    const v = X.view(TAB, 'overview');
    const nav = ['overview', 'prospects', 'bteam'].map((k) => `<button class="${v === k ? 'on' : ''}" data-xt-view="${TAB}:${k}">${e(t(k))}</button>`).join('');
    const nA = A.prospects.filter((p) => p.squad === 'academy').length;
    const nB = A.prospects.filter((p) => p.squad === 'b').length;
    let body;
    if (v === 'prospects') body = `<div class="xt-card"><h3>🌱 ${e(t('academySq', { n: nA, max: A.slots }))}</h3>${prospectTable(A, 'academy')}</div>`;
    else if (v === 'bteam') {
      body = `<div class="xt-card"><h3><span>🅱️ ${e(t('bSq', { n: nB, max: A.bMax }))}</span><span class="xt-muted">${A.league ? e(t('bStrength', { n: A.league.strength })) : ''}</span></h3>${prospectTable(A, 'b')}${nB < 3 ? `<div class="xt-muted" style="margin-top:8px">${e(t('trialists'))}</div>` : ''}</div><div style="margin-top:12px">${leagueCard(A, false)}</div>`;
    } else body = overview(A);
    return `<div class="xt acad">${header(A)}<div class="xt-nav">${nav}</div>${body}</div>`;
  }

  X.addTab({
    id: TAB,
    icon: '🎓',
    color: '#86efac',
    label: () => t('tab'),
    visible: () => X.on('academy'),
    render: page,
    afterCmd(m, op, args, res) {
      if (m !== 'academy') return;
      if (op === 'promote') X.toast('🎓', t('promoted'), '');
      if (op === 'sell' && res.fee) X.toast('💰', t('sold', { m: X.money(res.fee) }), '');
      if (op === 'trial' && res.name) X.toast('🌱', t('trialDone', { name: res.name }), '');
    },
  });
  try { render(); } catch { }
})();
