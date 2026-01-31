/* ==========================================================================
   scoring.js — AdoptMatch
   Weighted distance scoring between user trait targets and archetype traits.
   Output is 0..100-ish where higher = better fit.
   ========================================================================== */

/**
 * Trait keys used throughout the app.
 * T1..T10 are defined in our spec.
 */
export const TRAITS = [
  "T1",  // exercise fit
  "T2",  // handling difficulty tolerance
  "T3",  // guest/stranger sociability preference
  "T4",  // other-pet compatibility needs (cats/dogs)
  "T5",  // alone-time tolerance / separation risk
  "T6",  // noise tolerance
  "T7",  // shedding tolerance
  "T8",  // grooming tolerance
  "T9",  // space/environment fit
  "T10", // kids/household fit
];

/**
 * Weights — tune these as you learn from users.
 * Higher weight = stronger influence on match.
 */
export const DEFAULT_WEIGHTS = {
  T1: 4,
  T2: 4,
  T3: 2,
  T4: 2,
  T5: 4,
  T6: 2,
  T7: 1,
  T8: 1,
  T9: 3,
  T10: 3,
};

/**
 * Score an archetype for a given user profile.
 *
 * @param {{[k:string]: number}} userTraits - target values 0..4
 * @param {{[k:string]: number}} archetypeTraits - values 0..4
 * @param {{[k:string]: number}} [weights]
 * @returns {{
 *   score: number,
 *   maxPenalty: number,
 *   penalty: number,
 *   diffs: Record<string, number>
 * }}
 */
export function scoreArchetype(userTraits, archetypeTraits, weights = DEFAULT_WEIGHTS) {
  const diffs = {};
  let penalty = 0;
  let maxPenalty = 0;

  for (const key of TRAITS) {
    const w = safeNum(weights[key], 0);
    if (w <= 0) continue;

    const u = clamp01To04(safeNum(userTraits[key], 2)); // default neutral
    const a = clamp01To04(safeNum(archetypeTraits[key], 2));

    const d = Math.abs(a - u);
    diffs[key] = d;

    penalty += w * d;
    maxPenalty += w * 4;
  }

  // Convert distance into a normalized "fit score"
  // 100 = perfect match, 0 = worst match
  const raw = maxPenalty === 0 ? 0 : 100 * (1 - penalty / maxPenalty);
  const score = clamp(raw, 0, 100);

  return {
    score: round1(score),
    maxPenalty: round1(maxPenalty),
    penalty: round1(penalty),
    diffs,
  };
}

/**
 * Rank archetypes by fit score (desc). Filters should happen BEFORE calling this
 * (or you can pass a list already filtered).
 *
 * @param {Array<{id:string, traits:object}>} archetypes
 * @param {{[k:string]:number}} userTraits
 * @param {{[k:string]:number}} [weights]
 * @returns {Array<{id:string, score:number, diffs:object}>}
 */
export function rankArchetypes(archetypes, userTraits, weights = DEFAULT_WEIGHTS) {
  const scored = archetypes.map((a) => {
    const res = scoreArchetype(userTraits, a.traits, weights);
    return {
      id: a.id,
      score: res.score,
      diffs: res.diffs,
    };
  });

  scored.sort((x, y) => y.score - x.score);
  return scored;
}

/* ==========================================================================
   Helpers
   ========================================================================== */

function safeNum(v, fallback) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01To04(n) {
  return clamp(n, 0, 4);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
```0
