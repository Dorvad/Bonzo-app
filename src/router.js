/* ==========================================================================
   router.js — AdoptMatch / Bonzo-app
   Minimal hash router:
   - navigate("welcome" | "quiz" | "results" | "detail:<id>")
   - initRouter() attaches listeners and renders current route
   ========================================================================== */

import { renderWelcomeScreen } from "./screens/screen_welcome.js";
import { renderQuizScreen } from "./screens/screen_quiz.js";
import { renderResultsScreen } from "./screens/screen_results.js";

// Optional: load detail screen lazily to avoid top-level await (older browsers).
let renderArchetypeDetailScreen = null;
let detailLoadPromise = null;

function loadDetailScreen() {
  if (renderArchetypeDetailScreen) return Promise.resolve(renderArchetypeDetailScreen);
  if (detailLoadPromise) return detailLoadPromise;

  detailLoadPromise = import("./screens/screen_archetype_detail.js")
    .then((mod) => {
      renderArchetypeDetailScreen = mod.renderArchetypeDetailScreen;
      return renderArchetypeDetailScreen;
    })
    .catch(() => null);

  return detailLoadPromise;
}

const ROUTES = {
  welcome: () => renderWelcomeScreen(),
  quiz: () => renderQuizScreen(),
  results: () => renderResultsScreen(),
  detail: (id) => {
    loadDetailScreen().then((screen) => {
      if (typeof screen === "function") {
        screen(id);
        return;
      }
      // Fallback if detail screen isn't implemented yet
      const app = document.getElementById("app");
      if (!app) return;
      app.innerHTML = `
        <section class="screen safe-area-padding">
          <div style="padding:24px;">
            <h2>Details</h2>
            <p style="margin-top:12px;">
              Detail screen isn’t implemented yet.
            </p>
            <button id="backToResultsBtn" style="
              margin-top:16px;
              padding:12px 14px;
              border-radius:12px;
              border:1px solid rgba(0,0,0,.15);
              background: transparent;
            ">Back</button>
          </div>
        </section>
      `;
      document.getElementById("backToResultsBtn")?.addEventListener("click", () => {
        navigate("results");
      });
    });
  },
};

/**
 * Initialize router: listen to hash changes and render initial route
 */
export function initRouter() {
  window.addEventListener("hashchange", renderCurrentRoute);
  window.addEventListener("popstate", renderCurrentRoute);

  // Render immediately on init
  renderCurrentRoute();
}

/**
 * Navigate to route and render
 * @param {string} route - "welcome" | "quiz" | "results" | "detail:<id>"
 */
export function navigate(route) {
  const hash = normalizeRouteToHash(route);

  // Avoid redundant re-render loops
  if (location.hash === hash) {
    renderCurrentRoute();
    return;
  }

  location.hash = hash;
}

/**
 * Parse current URL hash and render
 */
function renderCurrentRoute() {
  const { name, param } = parseHash(location.hash);

  if (name === "detail") {
    ROUTES.detail(param);
    return;
  }

  const fn = ROUTES[name] || ROUTES.welcome;
  fn();
}

/* ==========================================================================
   Helpers
   ========================================================================== */

function normalizeRouteToHash(route) {
  const r = String(route || "").trim();
  if (!r) return "#/welcome";

  if (r.startsWith("detail:")) {
    const id = r.split(":")[1] || "";
    return `#/detail/${encodeURIComponent(id)}`;
  }

  return `#/${encodeURIComponent(r)}`;
}

function parseHash(hash) {
  // Expected formats:
  // #/welcome
  // #/quiz
  // #/results
  // #/detail/<id>
  const h = String(hash || "").replace(/^#/, "");
  const parts = h.split("/").filter(Boolean);

  const name = decodeURIComponent(parts[0] || "welcome");

  if (name === "detail") {
    const param = decodeURIComponent(parts[1] || "");
    return { name, param };
  }

  return { name, param: null };
}
