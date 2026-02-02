/* ==========================================================================
   match/archetypes.js — AdoptMatch / Bonzo-app
   Loads archetype profiles from /data/archetypes.v1.json

   Exports:
   - loadArchetypes()
   - getArchetypes()
   - getArchetypesMeta()
   - getArchetypeById(id)
   ========================================================================== */

"use strict";

let _archetypes = [];
let _meta = { version: null, description: null };

const ARCHETYPES_URL = "./data/archetypes.v1.json";
const TRAIT_KEYS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"];

/**
 * Load archetypes from JSON.
 * Call once during boot (main.js already does this).
 */
export async function loadArchetypes() {
  const res = await fetch(ARCHETYPES_URL, { cache: "no-cache" });

  if (!res.ok) {
    throw new Error(
      `Failed to load archetypes: ${res.status} ${res.statusText}`
    );
  }

  const json = await res.json();

  if (!json || !Array.isArray(json.archetypes)) {
    throw new Error("Archetypes JSON is invalid: expected { archetypes: [] }");
  }

  _meta = {
    version: json.version ?? null,
    description: json.description ?? null,
  };

  _archetypes = json.archetypes;

  validateArchetypes(_archetypes);

  return _archetypes;
}

/**
 * Get full archetype list (must call loadArchetypes first).
 */
export function getArchetypes() {
  return _archetypes;
}

/**
 * Get metadata for archetype DB.
 */
export function getArchetypesMeta() {
  return _meta;
}

/**
 * Find a single archetype by id.
 * @param {string} id
 * @returns {object|null}
 */
export function getArchetypeById(id) {
  const key = String(id ?? "").trim();
  if (!key) return null;
  return _archetypes.find((a) => a && a.id === key) || null;
}

/* ==========================================================================
   Validation
   ========================================================================== */

/**
 * Validate archetype collection shape to fail fast on bad JSON.
 * @param {any[]} archetypes
 */
function validateArchetypes(archetypes) {
  if (!Array.isArray(archetypes)) {
    throw new Error("Archetypes must be an array");
  }

  const ids = new Set();

  for (const a of archetypes) {
    if (!a || typeof a !== "object") {
      throw new Error("Archetype entry must be an object");
    }

    // Required fields
    if (!a.id) throw new Error("Archetype missing id");
    if (typeof a.id !== "string") {
      throw new Error("Archetype id must be a string");
    }
    if (ids.has(a.id)) throw new Error(`Duplicate archetype id: ${a.id}`);
    ids.add(a.id);

    if (!a.name) throw new Error(`Archetype ${a.id} missing name`);
    if (typeof a.name !== "string") {
      throw new Error(`Archetype ${a.id} name must be a string`);
    }

    if (!a.traits || typeof a.traits !== "object" || Array.isArray(a.traits)) {
      throw new Error(`Archetype ${a.id} missing traits object`);
    }

    // Ensure trait keys exist and values are sane (0..4)
    for (const k of TRAIT_KEYS) {
      const v = a.traits[k];

      if (v === undefined || v === null) {
        throw new Error(`Archetype ${a.id} missing trait ${k}`);
      }

      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 4) {
        throw new Error(
          `Archetype ${a.id} has invalid ${k}: ${v} (expected 0..4)`
        );
      }
    }

    // Optional checks
    if (a.size !== undefined && a.size !== null && !Array.isArray(a.size)) {
      throw new Error(`Archetype ${a.id} size must be an array`);
    }
    if (a.tags !== undefined && a.tags !== null && !Array.isArray(a.tags)) {
      throw new Error(`Archetype ${a.id} tags must be an array`);
    }
    if (a.risks !== undefined && a.risks !== null && !Array.isArray(a.risks)) {
      throw new Error(`Archetype ${a.id} risks must be an array`);
    }
    if (a.why !== undefined && a.why !== null && !Array.isArray(a.why)) {
      throw new Error(`Archetype ${a.id} why must be an array`);
    }
    if (
      a.ask_shelter !== undefined &&
      a.ask_shelter !== null &&
      !Array.isArray(a.ask_shelter)
    ) {
      throw new Error(`Archetype ${a.id} ask_shelter must be an array`);
    }
  }
}
