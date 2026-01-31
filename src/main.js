/* ==========================================================================
   main.js — AdoptMatch
   App bootstrap & lifecycle
   ========================================================================== */

import { initRouter, navigate } from "./router.js";
import { loadQuestions } from "./data/questions.js";
import { loadArchetypes } from "./match/archetypes.js";
import { initState, hydrateState } from "./state.js";

/**
 * Entry point
 */
async function boot() {
  try {
    // Init global app state
    initState();

    // Hydrate from localStorage if exists
    hydrateState();

    // Load core data (questions + archetypes)
    await Promise.all([
      loadQuestions(),
      loadArchetypes(),
    ]);

    // Init router AFTER data is ready
    initRouter();

    // Default route
    navigate("welcome");
  } catch (err) {
    console.error("AdoptMatch failed to start:", err);
    renderFatalError();
  }
}

/**
 * Simple fatal error screen
 */
function renderFatalError() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div style="
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: 24px;
      text-align: center;
      font-family: system-ui, sans-serif;
    ">
      <div>
        <h2>Something went wrong</h2>
        <p style="margin-top: 12px;">
          The app couldn’t load properly.<br />
          Please refresh the page.
        </p>
      </div>
    </div>
  `;
}

/**
 * DOM ready guard
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
