/* ==========================================================================
   screen_archetype_detail.js — AdoptMatch / Bonzo-app
   Visual-first archetype detail screen:
   - Big hero image
   - Minimal text, mostly chips/cards
   - "What to ask the shelter" swipe cards
   - Back to results

   Route: navigate("detail:<id>") => router calls renderArchetypeDetailScreen(id)
   ========================================================================== */

import { navigate } from "../router.js";
import { getArchetypeById } from "../match/archetypes.js";

export function renderArchetypeDetailScreen(archetypeId) {
  const app = document.getElementById("app");
  if (!app) return;

  const a = getArchetypeById(archetypeId);

  if (!a) {
    app.innerHTML = errorMarkup("We couldn’t find that profile.");
    document.getElementById("detailBackBtn")?.addEventListener("click", () => navigate("results"));
    return;
  }

  const cover = pickCover(a);
  const badges = buildBadges(a);
  const why = Array.isArray(a.why) ? a.why : [];
  const ask = Array.isArray(a.ask_shelter) ? a.ask_shelter : [];
  const risks = Array.isArray(a.risks) ? a.risks : [];
  const breedExamples = renderBreedExamplesSection(a);

  app.innerHTML = `
    <section class="screen screen-detail safe-area-padding">
      ${renderTopBar(a.name)}

      <div class="detail-hero">
        <img class="detail-hero-img" src="${escapeAttr(cover)}" alt="${escapeHtml(a.name)}" />
        <div class="detail-hero-gradient" aria-hidden="true"></div>
      </div>

      <div class="detail-content">
        <div class="detail-head">
          <div class="detail-title">${escapeHtml(a.name)}</div>
          <div class="detail-tier">Tier ${escapeHtml(String(a.tier ?? "—"))}</div>
        </div>

        <div class="detail-badges" aria-label="Highlights">
          ${badges.map((b) => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
        </div>

        ${renderWhySection(why)}
        ${renderAskSection(ask)}
        ${breedExamples}
        ${renderRisksSection(risks)}
        ${renderFooter()}
      </div>
    </section>
  `;

  // Wire back buttons
  document.getElementById("detailBackBtn")?.addEventListener("click", () => navigate("results"));
  document.getElementById("detailBackBtnBottom")?.addEventListener("click", () => navigate("results"));

  // Copy/share “questions to ask” (simple clipboard)
  document.getElementById("copyAskBtn")?.addEventListener("click", async () => {
    const text = buildAskClipboardText(a);
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied questions ✅");
      hapticTick();
    } catch (_) {
      toast("Copy failed (browser blocked)");
    }
  });

  // Basic keyboard open/scroll nicety
  window.addEventListener("keydown", onKeydownOnce, { once: true });
  function onKeydownOnce(e) {
    if (e.key === "Escape") navigate("results");
  }
}

/* ==========================================================================
   Markup sections
   ========================================================================== */

function renderTopBar(title) {
  return `
    <header class="detail-topbar">
      <button class="icon-btn" id="detailBackBtn" aria-label="Back to results">←</button>
      <div class="detail-topbar-title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>
      <div class="detail-topbar-spacer" aria-hidden="true"></div>
    </header>
  `;
}

function renderWhySection(why) {
  const items = why.slice(0, 4);
  if (!items.length) return "";

  return `
    <div class="detail-section">
      <div class="detail-section-title">Why this can fit</div>
      <div class="detail-why-grid">
        ${items
          .map(
            (t) => `
          <div class="detail-card">
            <div class="detail-card-icon" aria-hidden="true">✨</div>
            <div class="detail-card-text">${escapeHtml(t)}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderAskSection(ask) {
  const items = ask.slice(0, 8);
  if (!items.length) return "";

  return `
    <div class="detail-section">
      <div class="detail-section-title-row">
        <div class="detail-section-title">Ask the shelter</div>
        <button class="mini-btn" id="copyAskBtn" type="button">Copy</button>
      </div>

      <div class="ask-carousel" aria-label="Questions to ask carousel">
        ${items
          .map(
            (q, idx) => `
          <article class="ask-card" role="group" aria-label="Question ${idx + 1}">
            <div class="ask-card-num">${idx + 1}</div>
            <div class="ask-card-text">${escapeHtml(q)}</div>
          </article>
        `
          )
          .join("")}
      </div>

      <div class="detail-hint" aria-hidden="true">Swipe questions →</div>
    </div>
  `;
}

function renderRisksSection(risks) {
  if (!risks.length) return "";

  return `
    <div class="detail-section">
      <div class="detail-section-title">Watch-outs</div>
      <div class="risk-chips">
        ${risks.map((r) => `<span class="risk-chip">${escapeHtml(humanizeRisk(r))}</span>`).join("")}
      </div>
      <div class="detail-subtle">
        These aren’t “bad traits” — just areas to ask about and plan for.
      </div>
    </div>
  `;
}

function renderBreedExamplesSection(archetype) {
  const examples = Array.isArray(archetype.breed_examples) ? archetype.breed_examples : [];
  if (!examples.length) return "";

  const disclaimer =
    archetype.breed_examples_disclaimer ||
    "Examples only — mixes vary. Ask the shelter about the individual dog.";

  return `
    <div class="detail-section">
      <div class="detail-section-title">Breed examples</div>
      <div class="breed-disclaimer">${escapeHtml(disclaimer)}</div>
      <div class="breed-examples-chips" aria-label="Breed example list">
        ${examples
          .map((b) => {
            const title = b.note ? ` title="${escapeAttr(b.note)}"` : "";
            return `<span class="breed-chip"${title}>${escapeHtml(b.name)}</span>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <div class="detail-footer">
      <button class="secondary-cta" id="detailBackBtnBottom">Back to results</button>
    </div>
  `;
}

function errorMarkup(msg) {
  return `
    <section class="screen safe-area-padding">
      <div style="padding:24px;">
        <h2>Profile</h2>
        <p style="margin-top:12px;">${escapeHtml(msg)}</p>
        <button id="detailBackBtn" style="
          margin-top:16px;
          padding:12px 14px;
          border-radius:12px;
          border:1px solid rgba(0,0,0,.15);
          background: transparent;
        ">Back</button>
      </div>
    </section>
  `;
}

/* ==========================================================================
   Visual helpers
   ========================================================================== */

function pickCover(archetype) {
  const id = archetype?.id || "";
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
  const t = archetype?.traits || {};
  const badges = [];

  if ((t.T9 ?? 2) >= 3) badges.push("Apartment-friendly");
  if ((t.T10 ?? 2) >= 3) badges.push("Good with kids");
  if ((t.T2 ?? 2) <= 1) badges.push("Beginner-friendly");
  if ((t.T6 ?? 2) <= 1) badges.push("Quieter");
  if ((t.T7 ?? 2) <= 1) badges.push("Lower shedding");
  if ((t.T8 ?? 2) <= 1) badges.push("Low grooming");
  if ((t.T1 ?? 2) >= 3) badges.push("Very active");

  // keep tidy
  return badges.slice(0, 5);
}

function humanizeRisk(risk) {
  const map = {
    separation_sensitivity: "Sensitive to alone time",
    high_shedding: "Heavy shedding",
    needs_daily_activity: "Needs daily activity",
    dog_selective: "May be dog-selective",
    stigma: "May face stigma",
    high_grooming: "High grooming needs",
    understimulation: "Needs mental stimulation",
    barking: "Can be vocal",
    vocal: "Can be vocal",
    noise: "Noise-prone",
    prey_drive: "Prey drive",
    high_prey_drive: "High prey drive",
    recall_challenges: "Recall can be hard",
    escape_risk: "Escape / roaming risk",
    health_costs: "Potential health costs"
  };
  return map[risk] || String(risk).replaceAll("_", " ");
}

function buildAskClipboardText(archetype) {
  const lines = [];
  lines.push(`${archetype.name} — Questions to ask the shelter:`);
  lines.push("");
  const qs = Array.isArray(archetype.ask_shelter) ? archetype.ask_shelter : [];
  qs.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  lines.push("");
  lines.push("Generated by AdoptMatch (adoption-first fit guidance).");
  return lines.join("\n");
}

/* ==========================================================================
   Micro UX
   ========================================================================== */

let _toastTimer = null;
function toast(message) {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "toast";
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.remove();
  }, 1400);
}

function hapticTick() {
  try {
    if (navigator.vibrate) navigator.vibrate(10);
  } catch (_) {}
}

/* ==========================================================================
   Escaping
   ========================================================================== */

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
