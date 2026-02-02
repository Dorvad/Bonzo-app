/* ==========================================================================
   state.js — AdoptMatch / Bonzo-app
   Stores quiz answers + progress, persists to localStorage,
   and builds the "user profile" (traits + flags) used by matching rules.

   Exports:
   - initState()
   - hydrateState()
   - getState()
   - setAnswer(questionId, optionId)
   - setManyAnswers(questionId, optionIds[])
   - resetQuiz()
   - buildUserProfileFromState(state)
   ========================================================================== */

import { getQuestions } from "./data/questions.js";

const STORAGE_KEY = "adoptmatch_state_v1";

let _state = null;

/**
 * Initialize state (in-memory). Call once at startup.
 */
export function initState() {
  if (_state) return _state;

  _state = {
    quizIndex: 0,
    answers: {}, // { [questionId]: optionId | optionId[] }
  };

  persist();
  return _state;
}

/**
 * Load from localStorage if present.
 */
export function hydrateState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return _state || initState();
    const parsed = JSON.parse(raw);

    // Basic shape validation
    _state = {
      quizIndex: clampInt(parsed.quizIndex ?? 0, 0, 9999),
      answers: typeof parsed.answers === "object" && parsed.answers ? parsed.answers : {},
    };

    return _state;
  } catch (_) {
    // If corrupted, reset
    return initState();
  }
}

/**
 * Access current state (read-only reference).
 */
export function getState() {
  return _state || initState();
}

/**
 * Set a single-choice answer.
 */
export function setAnswer(questionId, optionId) {
  const s = getState();
  const qid = String(questionId || "").trim();
  const oid = String(optionId || "").trim();
  if (!qid || !oid) return;

  s.answers[qid] = oid;

  // Move quizIndex forward only if we're currently on this question
  bumpIndexIfCurrent(qid);

  persist();
}

/**
 * Set a multi-choice answer array.
 */
export function setManyAnswers(questionId, optionIds) {
  const s = getState();
  const qid = String(questionId || "").trim();
  if (!qid) return;

  const arr = Array.isArray(optionIds)
    ? optionIds.map((x) => String(x)).filter(Boolean)
    : [];

  // Ensure uniqueness
  const uniq = Array.from(new Set(arr));
  s.answers[qid] = uniq;

  bumpIndexIfCurrent(qid);

  persist();
}

/**
 * Reset quiz progress and clear answers.
 */
export function resetQuiz() {
  _state = {
    quizIndex: 0,
    answers: {},
  };
  persist();
  return _state;
}

/* ==========================================================================
   User profile builder (traits + flags for rules)
   ========================================================================== */

/**
 * Build user profile used by matching:
 * - traits: T1..T10 (0..4 targets)
 * - flags: string[] (derived risks/conditions)
 * - answers: state.answers (raw)
 *
 * This function:
 * 1) Starts with neutral traits (2)
 * 2) Applies trait values encoded in question options
 * 3) Derives flags from certain selections (risk items, environment constraints)
 */
export function buildUserProfileFromState(state) {
  const s = state || getState();
  const questions = getQuestions() || [];

  const traits = neutralTraits();
  const flags = new Set();

  // Apply answer-driven trait adjustments
  for (const q of questions) {
    const ans = s.answers?.[q.id];
    if (!ans) continue;

    if (q.type === "multi") {
      const selected = Array.isArray(ans) ? ans : [];
      for (const optId of selected) {
        applyOption(q, optId, traits, flags);
      }
    } else {
      applyOption(q, ans, traits, flags);
    }
  }

  // Derive additional flags based on common logic
  // Noise sensitive if user chose "barking" under tolerances
  const tol = s.answers?.tolerances;
  if (Array.isArray(tol) && tol.includes("barking")) flags.add("noise_sensitive");
  if (Array.isArray(tol) && tol.includes("shedding")) flags.add("shedding_sensitive");
  if (Array.isArray(tol) && tol.includes("grooming")) flags.add("grooming_sensitive");

  // Stairs high mobility penalty (if selected)
  if (s.answers?.stairs_elevator === "stairs_high") flags.add("stairs_high");

  // Kids home
  if (s.answers?.children === "kids_home") flags.add("kids_home");

  // Frequent guests
  if (s.answers?.hosting === "guests_often") flags.add("frequent_guests");

  // Cat at home
  const pets = s.answers?.other_pets;
  if (Array.isArray(pets) && pets.includes("cat")) flags.add("cat_home");

  // Alone-time high risk
  if (s.answers?.alone_time === "alone_very_long") flags.add("high_alone_time");

  // Training commitment flag (we don’t have a training question yet in v1 JSON,
  // but this keeps logic forward-compatible if you add it later)
  if (s.answers?.training_commitment === "low") flags.add("low_training_commitment");

  // Clamp traits to 0..4
  for (const k of Object.keys(traits)) {
    traits[k] = clamp(traits[k], 0, 4);
  }

  return {
    traits,
    flags: Array.from(flags),
    answers: s.answers || {},
  };
}

/* ==========================================================================
   Internals
   ========================================================================== */

function applyOption(question, optionId, traits, flags) {
  const opt = (question.options || []).find((o) => o.id === optionId);
  if (!opt) return;

  const t = opt.traits || {};

  // Apply trait values (direct targets) for T1..T10 if present
  for (const [k, v] of Object.entries(t)) {
    if (k.startsWith("T")) {
      traits[k] = clamp(Number(v), 0, 4);
    }
  }

  // Pull risk codes into flags if present
  if (t.risk) flags.add(String(t.risk));
  if (t.mobility_penalty) flags.add("stairs_high");
}

function neutralTraits() {
  return {
    T1: 2,
    T2: 2,
    T3: 2,
    T4: 2,
    T5: 2,
    T6: 2,
    T7: 2,
    T8: 2,
    T9: 2,
    T10: 2,
  };
}

function bumpIndexIfCurrent(questionId) {
  const s = getState();
  const questions = getQuestions() || [];
  const idx = questions.findIndex((q) => q.id === questionId);
  if (idx === -1) return;

  // If user answered the currently shown question, keep quizIndex at least here
  if ((s.quizIndex ?? 0) < idx) s.quizIndex = idx;

  // For completed questions, we don't auto-advance index here; the quiz screen controls flow.
}

function persist() {
  try {
    if (!_state) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (_) {
    // Ignore storage failures (private mode etc.)
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clampInt(v, min, max) {
  const n = Number.isFinite(v) ? v : parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
