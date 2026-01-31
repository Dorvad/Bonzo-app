/* ==========================================================================
   match/archetypes.js — AdoptMatch / Bonzo-app
   Loads archetype profiles from /data/archetypes.v1.json

   Exports:
   - loadArchetypes()
   - getArchetypes()
   - getArchetypesMeta()
   - getArchetypeById(id)
   ========================================================================== */

let _archetypes = [];
let _meta = { version: null, description: null };

/**
 * Load archetypes from JSON.
 * Call once during boot (main.js already does this).
 */
export async function loadArchetypes() {
  const url = "./data/archetypes.v1.json";

  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load archetypes: ${res.status} ${res.statusText}`);
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
 */
export function getArchetypeById(id) {
  const key = String(id || "").trim();
  if (!key) return null;
  return _archetypes.find((a) => a.id === key) || null;
}

/* ==========================================================================
   Validation
   ========================================================================== */

const TRAIT_KEYS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10"];

function validateArchetypes(archetypes) {
  const ids = new Set();

  for (const a of archetypes) {
    if (!a.id) throw new Error("Archetype missing id");
    if (ids.has(a.id)) throw new Error(`Duplicate archetype id: ${a.id}`);
    ids.add(a.id);

    if (!a.name) throw new Error(`Archetype ${a.id} missing name`);
    if (!a.traits || typeof a.traits !== "object") {
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
        throw new Error(`Archetype ${a.id} has invalid ${k}: ${v} (expected 0..4)`);
      }
    }

    // Optional checks
    if (a.size && !Array.isArray(a.size)) {
      throw new Error(`Archetype ${a.id} size must be an array`);
    }
    if (a.tags && !Array.isArray(a.tags)) {
      throw new Error(`Archetype ${a.id} tags must be an array`);
    }
    if (a.risks && !Array.isArray(a.risks)) {
      throw new Error(`Archetype ${a.id} risks must be an array`);
    }
    if (a.why && !Array.isArray(a.why)) {
      throw new Error(`Archetype ${a.id} why must be an array`);
    }
    if (a.ask_shelter && !Array.isArray(a.ask_shelter)) {
      throw new Error(`Archetype ${a.id} ask_shelter must be an array`);
    }
  }
}
```0 
