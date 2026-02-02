/* ==========================================================================
   rules.js — AdoptMatch
   Hard filters + soft penalties based on user answers/risks.
   Goal: remove obvious mismatches before scoring.
   ========================================================================== */

/**
 * Rule outputs:
 * - allowed: boolean
 * - reasons: array of strings (for transparency / "avoid" list)
 * - penalties: optional numeric adjustments (soft rules)
 */
export function evaluateArchetypeRules({ archetype, user }) {
  const reasons = [];
  const penalties = [];

  // Convenience
  const tags = new Set(archetype.tags || []);
  const risks = new Set(archetype.risks || []);
  const userFlags = new Set(user.flags || []);
  const userTraits = user.traits || {};
  const userAnswers = user.answers || {};

  // --------------------------------------------------------------------------
  // R1: High alone-time + no support → avoid separation-sensitive profiles
  // --------------------------------------------------------------------------
  const highAlone = userFlags.has("high_alone_time") || userTraits.T5 === 0;
  const hasSupport = hasAnySupport(userAnswers);
  if (highAlone && !hasSupport) {
    // Avoid archetypes with separation sensitivity (and also very high-energy/engagement needs)
    if (risks.has("separation_sensitivity") || tags.has("high_energy")) {
      reasons.push("Long alone time without support increases risk of distress.");
      return { allowed: false, reasons, penalties };
    }

    // Soft penalty for most profiles (still possible, but less ideal)
    penalties.push({ key: "alone_time_no_support", delta: -6 });
  }

  // --------------------------------------------------------------------------
  // R2: Cat at home + low experience + low training commitment → avoid prey-drive
  // --------------------------------------------------------------------------
  const catHome = userFlags.has("cat_home");
  const lowExperience = (userTraits.T2 ?? 2) <= 1; // 0-1 = beginner-ish
  const lowTraining = userFlags.has("low_training_commitment");

  if (catHome && (lowExperience || lowTraining)) {
    if (risks.has("high_prey_drive")) {
      reasons.push("Cat at home + beginner/low training increases prey-drive risk.");
      return { allowed: false, reasons, penalties };
    }
  }

  // --------------------------------------------------------------------------
  // R3: Minimal barking tolerance + thin walls → avoid vocal archetypes
  // --------------------------------------------------------------------------
  const noiseSensitive = userFlags.has("noise_sensitive") || (userTraits.T6 ?? 2) === 0;
  if (noiseSensitive) {
    // "vocal" archetypes: spitz, many hounds, many terriers
    if (risks.has("noise") || risks.has("vocal") || risks.has("barking")) {
      reasons.push("Noise-sensitive household is a poor fit for vocal profiles.");
      return { allowed: false, reasons, penalties };
    }

    // soft penalty if archetype has high noise trait (T6=4 means very noisy profile)
    if ((archetype.traits?.T6 ?? 2) >= 3) penalties.push({ key: "noise_sensitive", delta: -8 });
  }

  // --------------------------------------------------------------------------
  // R4: Minimal shedding only → avoid high-shedding archetypes
  // --------------------------------------------------------------------------
  const sheddingSensitive = userFlags.has("shedding_sensitive") || (userTraits.T7 ?? 2) === 0;
  if (sheddingSensitive) {
    // High shedding is a mismatch if user wants minimal shedding
    if (risks.has("high_shedding") || (archetype.traits?.T7 ?? 2) >= 3) {
      reasons.push("Low shedding preference conflicts with heavy-shedding profiles.");
      return { allowed: false, reasons, penalties };
    }
  }

  // --------------------------------------------------------------------------
  // R5: Kids in home + frequent hosting + first-time → remove highest-difficulty profiles
  // --------------------------------------------------------------------------
  const kidsHome = (userAnswers.children === "kids_home") || userFlags.has("kids_home");
  const frequentHosting = userAnswers.hosting === "guests_often" || userFlags.has("frequent_guests");
  const firstTime = userAnswers.experience === "first_time" || (userTraits.T2 ?? 2) === 0;

  if (kidsHome && frequentHosting && firstTime) {
    // Exclude very high difficulty + high energy combos
    const veryHighDifficulty = (archetype.traits?.T2 ?? 2) >= 3;
    const veryHighEnergy = (archetype.traits?.T1 ?? 2) >= 3;

    if (veryHighDifficulty && veryHighEnergy) {
      reasons.push("High-difficulty, high-energy profiles are risky for first-time families with lots of guests.");
      return { allowed: false, reasons, penalties };
    }
  }

  // --------------------------------------------------------------------------
  // R6: 3+ floors stairs + large dog preference → soft penalty for very large/senior
  // --------------------------------------------------------------------------
  const stairsHigh = userFlags.has("stairs_high") || userAnswers.stairs_elevator === "stairs_high";
  if (stairsHigh) {
    const isLargeOnly = Array.isArray(archetype.size) && archetype.size.length === 1 && archetype.size[0] === "large";
    if (isLargeOnly || archetype.id === "senior_dog") {
      penalties.push({ key: "stairs_high_mobility", delta: -5 });
    }
  }

  // If no exclusion, allowed
  return { allowed: true, reasons, penalties };
}

/**
 * Apply rule penalties to a numeric score.
 * @param {number} baseScore
 * @param {Array<{key:string, delta:number}>} penalties
 * @returns {{score:number, applied:Array<{key:string, delta:number}>}}
 */
export function applyPenalties(baseScore, penalties = []) {
  let s = baseScore;
  for (const p of penalties) {
    s += Number(p.delta) || 0;
  }
  s = clamp(s, 0, 100);
  return { score: round1(s), applied: penalties };
}

/**
 * Filter archetypes based on rules.
 * @param {Array} archetypes
 * @param {{traits:object, flags:string[], answers:object}} user
 * @returns {{
 *   allowed: Array<{archetype:any, reasons:string[], penalties:any[]}>,
 *   blocked: Array<{archetype:any, reasons:string[]}>
 * }}
 */
export function filterArchetypes(archetypes, user) {
  const allowed = [];
  const blocked = [];

  for (const archetype of archetypes) {
    const res = evaluateArchetypeRules({ archetype, user });
    if (res.allowed) {
      allowed.push({ archetype, reasons: res.reasons || [], penalties: res.penalties || [] });
    } else {
      blocked.push({ archetype, reasons: res.reasons || ["Not a fit"] });
    }
  }

  return { allowed, blocked };
}

/* ==========================================================================
   Support detection
   ========================================================================== */

function hasAnySupport(answers) {
  const s = answers.support_system;
  if (!s) return false;
  if (Array.isArray(s)) {
    return s.some((x) => x && x !== "none");
  }
  return s !== "none";
}

/* ==========================================================================
   Helpers
   ========================================================================== */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
