/* ==========================================================================
   screen_results.js — AdoptMatch
   Visual-first results: swipeable matches + minimal text + "why" badges
   ========================================================================== */

import { navigate } from "../router.js";
import { getState, resetQuiz } from "../state.js";
import { getArchetypes } from "../match/archetypes.js";
import { buildUserProfileFromState } from "../state.js";
import { filterArchetypes, applyPenalties } from "../match/rules.js";
import { rankArchetypes } from "../match/scoring.js";

/**
 * Render Results Screen
 * - Top carousel of best archetypes (cards with images)
 * - Fit badges + trait radar placeholder (later)
 * - Optional "Avoid for you" chips (blocked archetypes)
 */
export function renderResultsScreen() {
  const app = document.getElementById("app");
  if (!app) return;

  const state = getState();
  const archetypes = getArchetypes();

  if (!archetypes || archetypes.length === 0) {
    app.innerHTML = errorMarkup("Archetypes failed to load.");
    return;
  }

  // If quiz not completed (no answers), send back
  const answersCount = Object.keys(state.answers || {}).length;
  if (answersCount === 0) {
    navigate("welcome");
    return;
  }

  // Build user profile (traits + flags) from stored answers
  const user = buildUserProfileFromState(state);

  // Hard filters
  const { allowed, blocked } = filterArchetypes(archetypes, user);

  // Score only allowed archetypes
  const allowedArchetypes = allowed.map((x) => x.archetype);
  const ranked = rankArchetypes(allowedArchetypes, user.traits);

  // Merge penalties & archetype metadata
  const merged = ranked.map((r) => {
    const entry = allowed.find((a) => a.archetype.id === r.id);
    const penaltyRes = applyPenalties(r.score, entry?.penalties || []);
    const archetype = entry?.archetype;

    return {
      id: r.id,
      archetype,
      baseScore: r.score,
      score: penaltyRes.score,
      penalties: penaltyRes.applied,
      diffs: r.diffs,
    };
  });

  merged.sort((a, b) => b.score - a.score);

  const top = merged.slice(0, 5);
  const avoid = blocked.slice(0, 5);

  app.innerHTML = `
    <section class="screen screen-results safe-area-padding">
      ${renderTopBar()}
      ${renderHeader(top)}
      ${renderCarousel(top)}
      ${renderQuickNotes(user)}
      ${renderAvoidSection(avoid)}
      ${renderBottomActions()}
    </section>
  `;

  // Wire events
  const restartBtn = document.getElementById("restartBtn");
  const backBtn = document.getElementById("backToQuizBtn");

  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      const ok = window.confirm("Restart the quiz and clear your answers?");
      if (!ok) return;
      resetQuiz();
      navigate("welcome");
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // go back to quiz at last answered index (or 0)
      navigate("quiz");
    });
  }

  // Card detail click
  const cards = document.querySelectorAll("[data-archetype-card]");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-archetype-id");
      if (!id) return;
      navigate(`detail:${id}`);
    });
  });

  // Swipe affordance: horizontal scroll with snap already works via CSS.
}

/* ==========================================================================
   Markup
   ========================================================================== */

function renderTopBar() {
  return `
    <header class="results-topbar">
      <button class="icon-btn" id="backToQuizBtn" aria-label="Back to quiz">
        ←
      </button>

      <div class="results-titlewrap">
        <div class="results-eyebrow">Your matches</div>
        <div class="results-title">Adoption fit — not “perfect breed”</div>
      </div>

      <button class="icon-btn" id="restartBtn" aria-label="Restart quiz">
        ↻
      </button>
    </header>
  `;
}

function renderHeader(top) {
  const best = top[0]?.archetype;
  const name = best?.name || "Your top match";

  return `
    <div class="results-hero">
      <div class="results-hero-card">
        <div class="results-hero-label">Top match</div>
        <div class="results-hero-name">${escapeHtml(name)}</div>
        <div class="results-hero-sub">
          Tap any card to see “what to look for” at the shelter.
        </div>
      </div>
    </div>
  `;
}

function renderCarousel(items) {
  if (!items || items.length === 0) return "";

  return `
    <div class="results-carousel" aria-label="Match results carousel">
      ${items.map((x) => renderArchetypeCard(x)).join("")}
    </div>
  `;
}

function renderArchetypeCard(x) {
  const a = x.archetype;
  const cover = pickCover(a);
  const score = Math.round(x.score);

  const badges = buildBadges(a);

  return `
    <article
      class="result-card"
      data-archetype-card="true"
      data-archetype-id="${escapeAttr(a.id)}"
      role="button"
      tabindex="0"
      aria-label="Open ${escapeAttr(a.name)} details"
    >
      <div class="result-card-media">
        <img src="${escapeAttr(cover)}" alt="${escapeHtml(a.name)}" loading="lazy" />
        <div class="result-card-gradient" aria-hidden="true"></div>
        <div class="result-card-score" aria-label="Fit score">${score}</div>
      </div>

      <div class="result-card-body">
        <div class="result-card-name">${escapeHtml(a.name)}</div>

        <div class="result-card-badges" aria-label="Fit highlights">
          ${badges.map((b) => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
        </div>

        <div class="result-card-why" aria-label="Why this fits">
          ${renderWhyChips(a)}
        </div>
      </div>
    </article>
  `;
}

function renderWhyChips(archetype) {
  const why = Array.isArray(archetype.why) ? archetype.why.slice(0, 2) : [];
  return why
    .map((t) => `<span class="why-chip">${escapeHtml(t)}</span>`)
    .join("");
}

function renderQuickNotes(user) {
  // Small, non-judgy disclaimers. Keep minimal.
  const notes = [];

  if ((user.traits?.T5 ?? 2) <= 1) {
    notes.push({
      icon: "⏳",
      text: "If your dog will be alone for long hours, prioritize foster notes about alone-time.",
    });
  }

  if (user.flags?.includes("cat_home")) {
    notes.push({
      icon: "🐈",
      text: "With a cat at home, ask specifically about prey drive and cat-testing.",
    });
  }

  if (notes.length === 0) {
    notes.push({
      icon: "✅",
      text: "These are mix archetypes — use them to guide questions, not labels.",
    });
  }

  return `
    <div class="results-notes">
      ${notes
        .slice(0, 2)
        .map(
          (n) => `
        <div class="note-card">
          <div class="note-icon" aria-hidden="true">${n.icon}</div>
          <div class="note-text">${escapeHtml(n.text)}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderAvoidSection(avoid) {
  if (!avoid || avoid.length === 0) return "";

  return `
    <div class="avoid-wrap">
      <div class="avoid-title">Avoid (for your situation)</div>
      <div class="avoid-sub">Not “bad dogs” — just higher mismatch risk.</div>

      <div class="avoid-chips" aria-label="Avoid list">
        ${avoid
          .map((x) => {
            const name = x.archetype?.name || x.archetype?.id || "Profile";
            return `<span class="avoid-chip" title="${escapeAttr(
              (x.reasons || []).join(" ")
            )}">${escapeHtml(name)}</span>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderBottomActions() {
  return `
    <footer class="results-actions">
      <button class="secondary-cta" id="restartBtnBottom">Restart</button>
      <button class="primary-cta" id="shareBtn" disabled title="Coming soon">
        Share results
      </button>
    </footer>
  `;
}

/* ==========================================================================
   Helpers
   ========================================================================== */

function pickCover(archetype) {
  // Use illustrations first; fall back to a shared hero image.
  const id = archetype.id || "";
  const map = {
    companion_mix: "./assets/illustrations/archetype-companion.webp",
    retriever_mix: "./assets/illustrations/archetype-retriever.webp",
    balanced_mutt: "./assets/illustrations/archetype-companion.webp",
    bully_mix: "./assets/illustrations/archetype-bully.webp",
    poodle_mix: "./assets/illustrations/archetype-companion.webp",
    small_terrier_mix: "./assets/illustrations/archetype-companion.webp",
    shepherd_mix: "./assets/illustrations/archetype-shepherd.webp",
    hound_mix: "./assets/illustrations/archetype-hound.webp",
    sighthound_mix: "./assets/illustrations/archetype-sighthound.webp",
    spitz_mix: "./assets/illustrations/archetype-spitz.webp",
    senior_dog: "./assets/illustrations/archetype-senior.webp"
  };

  return map[id] || "./assets/illustrations/hero-dog-collage.webp";
}

function buildBadges(archetype) {
  // Visual-first highlights. Keep them short.
  const t = archetype.traits || {};
  const badges = [];

  if ((t.T9 ?? 2) >= 3) badges.push("Apartment-friendly");
  if ((t.T10 ?? 2) >= 3) badges.push("Family-friendly");
  if ((t.T7 ?? 2) <= 1) badges.push("Lower shedding");
  if ((t.T6 ?? 2) <= 1) badges.push("Quieter");
  if ((t.T2 ?? 2) <= 1) badges.push("Beginner-friendly");
  if ((t.T1 ?? 2) >= 3) badges.push("Very active");

  // Keep 3 to avoid clutter
  return badges.slice(0, 3);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str).replaceAll('"', "&quot;").replaceAll("'", "");
}

function errorMarkup(msg) {
  return `
    <section class="screen safe-area-padding">
      <div style="padding:24px;">
        <h2>Results</h2>
        <p style="margin-top:12px;">${escapeHtml(msg)}</p>
      </div>
    </section>
  `;
}
