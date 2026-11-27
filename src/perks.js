'use strict';
// Shared perks: what each hired staff member (and the Hub's facility tier) does. Read by the staff module and by
// the academy, wellbeing and sponsor modules.

// role -> per tier (bad, mid, best) values. Wages are per week.
const ROLES = {
  mental: {
    icon: '🧠', wage: [250, 550, 1100],
    perks: { moraleRefund: [0.10, 0.20, 0.35], weeklyMorale: [1, 2, 4] },
  },
  media: {
    icon: '📣', wage: [250, 550, 1100],
    perks: { sponsorBonus: [0.05, 0.10, 0.20], followerBoost: [0.05, 0.10, 0.20] },
  },
  assistant: {
    icon: '📋', wage: [300, 650, 1300],
    perks: { trainingCooldown: [1, 2, 2], trainingBoost: [0.05, 0.10, 0.15], autoTrain: [0, 0, 1] },
  },
  engineer: {
    icon: '🛠️', wage: [200, 450, 900],
    perks: { facilityDiscount: [0.05, 0.10, 0.20] },
  },
  youth: {
    icon: '🌱', wage: [250, 550, 1100],
    perks: { academyGrowth: [0.10, 0.20, 0.35], potentialBonus: [1, 2, 3], declineRefund: [0.10, 0.20, 0.30] },
  },
};
const TIERS = ['bad', 'mid', 'best'];

function hired(state, role) {
  const s = state && state.xtra && state.xtra.staff;
  if (!s || !Array.isArray(s.members)) return null;
  const off = state.xtra.mods && state.xtra.mods.off;
  if (off && off.staff) return null;
  return s.members.find((m) => m && m.role === role) || null;
}

// value of a perk for the hired member of that role (0 when nobody is hired)
function perk(state, role, key) {
  const m = hired(state, role);
  if (!m) return 0;
  const R = ROLES[role];
  const arr = R && R.perks[key];
  const i = TIERS.indexOf(m.tier);
  return arr && i >= 0 ? arr[i] : 0;
}

// RL Career Hub's own facility ladder (0 = none ... 4+ = performance centre)
function facilityTier(state, ctx) {
  try {
    const eng = ctx && ctx.engine;
    if (eng && typeof eng.facilityTier === 'function') return Math.max(0, Number(eng.facilityTier(state)) || 0);
  } catch { /* old saves */ }
  return 0;
}

module.exports = { ROLES, TIERS, hired, perk, facilityTier };
