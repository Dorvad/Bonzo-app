/* ==========================================================================
   ResultCarousel.js — AdoptMatch
   Swipeable, snap-scrolling carousel for top matches
   (Visual-first; minimal text; touch-friendly)
   ========================================================================== */

/**
 * Render a horizontal swipe carousel.
 *
 * @param {HTMLElement} mountEl
 * @param {{
 *   items: Array<{
 *     archetype: any,
 *     score: number,
 *     baseScore?: number,
 *     diffs?: object,
 *     penalties?: any[]
 *   }>,
 *   onOpen?: (archetypeId: string) => void
 * }} props
 */
export function renderResultCarousel(mountEl, props) {
  const { items = [], onOpen } = props;

  if (!mountEl) return;
  if (!items.length) {
    mountEl.innerHTML = emptyMarkup();
    return;
  }

  mountEl.innerHTML = `
    <div class="result-carousel" aria-label="Top matches carousel">
      ${items.map(renderCard).join("")}
    </div>
    <div class="result-carousel-hint" aria-hidden="true">
      <span class="hint-dot"></span>
      <span class="hint-text">Swipe</span>
      <span class="hint-dot"></span>
    </div>
  `;

  // click-to-open
  const cards = mountEl.querySelectorAll("[data-rcard]");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      if (!id) return;
      if (typeof onOpen === "function") onOpen(id);
      hapticTick();
    });

    // keyboard open
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Improve snapping feel on iOS by nudging scroll after first paint
  requestAnimationFrame(() => {
    const scroller = mountEl.querySelector(".result-carousel");
    if (!scroller) return;
    // tiny scroll nudge to ensure snap engages
    scroller.scrollLeft = scroller.scrollLeft + 1;
    scroller.scrollLeft = scroller.scrollLeft - 1;
  });
}

/* ==========================================================================
   Card rendering
   ========================================================================== */

function renderCard(item) {
  const a = item.archetype;
  const cover = pickCover(a);
  const score = clamp(Math.round(item.score ?? 0), 0, 100);

  const badges = buildBadges(a);

  return `
    <article
      class="rcard"
      data-rcard="true"
      data-id="${escapeAttr(a.id)}"
      role="button"
      tabindex="0"
      aria-label="Open ${escapeAttr(a.name)} details"
    >
      <div class="rcard-media">
        <img src="${escapeAttr(cover)}" alt="${escapeHtml(a.name)}" loading="lazy" />
        <div class="rcard-gradient" aria-hidden="true"></div>

        <div class="rcard-score" aria-label="Fit score">
          <span class="rcard-score-num">${score}</span>
          <span class="rcard-score-label">fit</span>
        </div>
      </div>

      <div class="rcard-body">
        <div class="rcard-name">${escapeHtml(a.name)}</div>

        <div class="rcard-badges" aria-label="Highlights">
          ${badges.map((b) => `<span class="badge">${escapeHtml(b)}</span>`).join("")}
        </div>

        <div class="rcard-why" aria-label="Why this fits">
          ${renderWhyChips(a)}
        </div>
      </div>
    </article>
  `;
}

function renderWhyChips(archetype) {
  const why = Array.isArray(archetype.why) ? archetype.why.slice(0, 2) : [];
  return why.map((t) => `<span class="why-chip">${escapeHtml(t)}</span>`).join("");
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

  if ((t.T9 ?? 2) >= 3) badges.push("Apartment");
  if ((t.T10 ?? 2) >= 3) badges.push("Kids");
  if ((t.T2 ?? 2) <= 1) badges.push("Beginner");
  if ((t.T6 ?? 2) <= 1) badges.push("Quiet");
  if ((t.T7 ?? 2) <= 1) badges.push("Low shed");
  if ((t.T1 ?? 2) >= 3) badges.push("Very active");

  return badges.slice(0, 3);
}

function emptyMarkup() {
  return `
    <div class="rcard-empty">
      <div class="rcard-empty-icon">🐾</div>
      <div class="rcard-empty-title">No matches yet</div>
      <div class="rcard-empty-sub">Answer a few questions to see your results.</div>
    </div>
  `;
}

/* ==========================================================================
   Utils
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hapticTick() {
  try {
    if (navigator.vibrate) navigator.vibrate(10);
  } catch (_) {}
}
```0
