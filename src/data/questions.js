/* ==========================================================================
   data/questions.js — AdoptMatch / Bonzo-app
   Loads questions JSON from /data/questions.v1.json
   Exports:
   - loadQuestions()
   - getQuestions()
   - getQuestionsMeta()
   ========================================================================== */

let _questions = [];
let _meta = { version: null, description: null };

/**
 * Load questions from the JSON file.
 * Call once during boot (main.js already does this).
 */
export async function loadQuestions() {
  const url = "./data/questions.v1.json";

  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load questions: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (!json || !Array.isArray(json.questions)) {
    throw new Error("Questions JSON is invalid: expected { questions: [] }");
  }

  _meta = {
    version: json.version ?? null,
    description: json.description ?? null,
  };

  _questions = json.questions;

  // Basic sanity checks (helpful during development)
  validateQuestions(_questions);

  return _questions;
}

/**
 * Get the loaded questions array.
 */
export function getQuestions() {
  return _questions;
}

/**
 * Get metadata from the loaded questions file.
 */
export function getQuestionsMeta() {
  return _meta;
}

/* ==========================================================================
   Validation helpers
   ========================================================================== */

function validateQuestions(questions) {
  const ids = new Set();

  for (const q of questions) {
    if (!q.id) throw new Error("Question missing id");
    if (ids.has(q.id)) throw new Error(`Duplicate question id: ${q.id}`);
    ids.add(q.id);

    if (!q.title) throw new Error(`Question ${q.id} missing title`);
    if (!q.type || !["single", "multi"].includes(q.type)) {
      throw new Error(`Question ${q.id} has invalid type: ${q.type}`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new Error(`Question ${q.id} must have at least 2 options`);
    }

    const optIds = new Set();
    for (const opt of q.options) {
      if (!opt.id) throw new Error(`Question ${q.id} has option missing id`);
      if (optIds.has(opt.id)) throw new Error(`Duplicate option id '${opt.id}' in question ${q.id}`);
      optIds.add(opt.id);
      if (!opt.label) throw new Error(`Option ${opt.id} in question ${q.id} missing label`);
    }
  }
}
