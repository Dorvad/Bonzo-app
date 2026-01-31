/* ==========================================================================
   ChoiceCards.js — AdoptMatch
   Visual answer cards (tap-first, mobile ergonomics)
   Supports:
   - type: "single" (radio-like)
   - type: "multi"  (checkbox-like)
   ========================================================================== */

/**
 * Render choice cards inside mountEl.
 *
 * @param {HTMLElement} mountEl
 * @param {{
 *   questionId: string,
 *   type: "single"|"multi",
 *   options: Array<{id:string,label:string,subtitle?:string,image?:string}>,
 *   selection: string | string[] | null,
 *   onSelect: (payload: string | string[]) => void
 * }} props
 */
export function renderChoiceCards(mountEl, props) {
  const { questionId, type, options, selection, onSelect } = props;

  // Normalize selection
  const selectedIds = normalizeSelection(type, selection);

  // Build grid
  mountEl.innerHTML = `
    <div class="choice-grid" role="${type === "multi" ? "group" : "radiogroup"}" aria-label="Answer choices">
      ${options
        .map((opt) => renderCard(opt, type, selectedIds.has(opt.id)))
        .join("")}
    </div>
  `;

  // Attach handlers
  const cards = mountEl.querySelectorAll("[data-choice-id]");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-choice-id");
      if (!id) return;

      // Special handling: "none" in multi should behave as exclusive
      if (type === "multi") {
        const next = new Set(selectedIds);

        if (id === "none") {
          // If user taps "none", clear everything else and keep only none
          next.clear();
          next.add("none");
        } else {
          // If selecting something else, remove "none"
          next.delete("none");

          if (next.has(id)) next.delete(id);
          else next.add(id);
        }

        // Update UI and notify
        applySelectionUI(mountEl, type, next);
        onSelect(Array.from(next));
      } else {
        // Single selection
        const next = new Set([id]);
        applySelectionUI(mountEl, type, next);
        onSelect(id);
      }

      // Light haptic on supported mobile
      hapticTick();
    });

    // Keyboard accessibility
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Initial aria state
  applySelectionUI(mountEl, type, selectedIds);

  // Keep focus sane
  const first = mountEl.querySelector("[data-choice-id]");
  if (first) first.setAttribute("tabindex", "0");

  // Add roving tabindex so only one card is tab-focusable at a time
  enableRovingTabindex(mountEl);
}

/* ==========================================================================
   Render helpers
   ========================================================================== */

function renderCard(opt, type, isSelected) {
  const img = opt.image ? normalizeImagePath(opt.image) : null;
  const hasImg = !!img;

  const ariaRole = type === "multi" ? "checkbox" : "radio";
  const ariaChecked = isSelected ? "true" : "false";

  return `
    <button
      class="choice-card ${isSelected ? "is-selected" : ""} ${hasImg ? "has-image" : "no-image"}"
      type="button"
      data-choice-id="${escapeAttr(opt.id)}"
      role="${ariaRole}"
      aria-checked="${ariaChecked}"
    >
      ${hasImg ? renderImage(img, opt.label) : renderFallbackIcon(opt.id)}
      <div class="choice-card-text">
        <div class="choice-card-label">${escapeHtml(opt.label)}</div>
        ${opt.subtitle ? `<div class="choice-card-subtitle">${escapeHtml(opt.subtitle)}</div>` : ""}
      </div>
      <div class="choice-card-check" aria-hidden="true"></div>
    </button>
  `;
}

function renderImage(src, alt) {
  // Use eager for above-the-fold, lazy for long lists? We'll keep lazy for safety.
  return `
    <div class="choice-card-media">
      <img src="${escapeAttr(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
      <div class="choice-card-media-overlay" aria-hidden="true"></div>
    </div>
  `;
}

function renderFallbackIcon(optionId) {
  // Simple emoji fallback that still looks intentional.
  // Later we can map optionId -> SVG icon.
  const emoji = emojiForOption(optionId);
  return `
    <div class="choice-card-media choice-card-media-fallback" aria-hidden="true">
      <div class="choice-emoji">${emoji}</div>
      <div class="choice-card-media-overlay" aria-hidden="true"></div>
    </div>
  `;
}

function emojiForOption(id) {
  const map = {
    apt_no_outdoor: "🏢",
    apt_balcony: "🌿",
    house_small_yard: "🏡",
    house_large_yard: "🌳",
    elevator: "🛗",
    stairs_low: "🪜",
    stairs_high: "🪜",
    activity_low: "🕒",
    activity_medium: "⏱️",
    activity_high: "🚶",
    activity_very_high: "🏃",
    alone_short: "🏠",
    alone_medium: "🧑‍💻",
    alone_long: "🕰️",
    alone_very_long: "🕰️",
    walker: "🚶‍♂️",
    daycare: "🏫",
    friends_family: "🫶",
    kids_home: "👶",
    kids_visit: "🧒",
    kids_rare: "🌙",
    guests_rare: "🛋️",
    guests_weekly: "🍵",
    guests_often: "🎉",
    cat: "🐈",
    dog: "🐕",
    barking: "🔊",
    shedding: "🧹",
    grooming: "🪥",
    none: "⭕",
  };
  return map[id] || "🐾";
}

/* ==========================================================================
   Selection UI + accessibility
   ========================================================================== */

function applySelectionUI(mountEl, type, selectedSet) {
  const cards = mountEl.querySelectorAll("[data-choice-id]");
  cards.forEach((card) => {
    const id = card.getAttribute("data-choice-id");
    const selected = id ? selectedSet.has(id) : false;

    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-checked", selected ? "true" : "false");

    // A11y hint for screen readers
    if (type === "multi") {
      card.setAttribute("aria-label", selected ? "Selected" : "Not selected");
    }
  });
}

function enableRovingTabindex(mountEl) {
  const focusables = Array.from(mountEl.querySelectorAll("[data-choice-id]"));
  if (focusables.length === 0) return;

  focusables.forEach((el, idx) => {
    if (idx !== 0) el.setAttribute("tabindex", "-1");
  });

  mountEl.addEventListener("keydown", (e) => {
    const keys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"];
    if (!keys.includes(e.key)) return;

    e.preventDefault();

    const active = document.activeElement;
    const currentIndex = focusables.indexOf(active);
    const idx = currentIndex === -1 ? 0 : currentIndex;

    const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
    const nextIndex = clamp(idx + delta, 0, focusables.length - 1);

    focusables.forEach((el) => el.setAttribute("tabindex", "-1"));
    focusables[nextIndex].setAttribute("tabindex", "0");
    focusables[nextIndex].focus();
  });
}

/* ==========================================================================
   Helpers
   ========================================================================== */

function normalizeSelection(type, selection) {
  const set = new Set();
  if (type === "multi") {
    if (Array.isArray(selection)) selection.forEach((x) => set.add(String(x)));
  } else {
    if (typeof selection === "string" && selection) set.add(selection);
  }
  return set;
}

function normalizeImagePath(path) {
  // Allow passing already-rooted ("./assets/...") or bare ("assets/...")
  const p = String(path || "").trim();
  if (!p) return "";
  if (p.startsWith("./")) return p;
  if (p.startsWith("/")) return p;
  return `./${p}`;
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hapticTick() {
  // Vibration API is limited; keep it subtle
  try {
    if (navigator.vibrate) navigator.vibrate(10);
  } catch (_) {}
}
```0
