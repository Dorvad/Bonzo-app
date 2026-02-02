/* ==========================================================================
   screen_quiz.js — AdoptMatch
   Visual-first, story-card quiz experience
   ========================================================================== */

import { navigate } from "../router.js";
import { getQuestions } from "../data/questions.js";
import { getState, setAnswer, setManyAnswers, resetQuiz } from "../state.js";
import { renderChoiceCards } from "../components/ChoiceCards.js";

/**
 * Quiz screen renderer
 * - Full-screen story card per question
 * - Big tappable image answers
 * - Minimal text; visual cues
 */
export function renderQuizScreen() {
  const app = document.getElementById("app");
  if (!app) return;

  const questions = getQuestions();
  if (!questions || questions.length === 0) {
    app.innerHTML = errorMarkup("Questions failed to load.");
    return;
  }

  const state = getState();
  const qIndex = clampInt(state.quizIndex ?? 0, 0, questions.length - 1);
  const q = questions[qIndex];

  app.innerHTML = `
    <section class="screen screen-quiz safe-area-padding">
      ${renderTopBar(qIndex, questions.length)}
      ${renderQuestionCard(q, qIndex, questions.length)}
      ${renderBottomBar(q, qIndex, questions.length)}
    </section>
  `;

  // Mount choices (visual cards)
  const choicesMount = document.getElementById("choicesMount");
  if (choicesMount) {
    const currentSelection = state.answers?.[q.id] ?? null;

    renderChoiceCards(choicesMount, {
      questionId: q.id,
      type: q.type, // "single" | "multi"
      options: q.options,
      selection: currentSelection,
      onSelect: (payload) => {
        // payload for "single": optionId string
        // payload for "multi": array of optionIds
        if (q.type === "multi") {
          setManyAnswers(q.id, payload);
        } else {
          setAnswer(q.id, payload);
        }

        // Auto-advance behavior:
        // - single: advance immediately
        // - multi: user taps "Next"
        if (q.type === "single") {
          goNext(qIndex, questions.length);
        } else {
          // enable next button when at least 1 selected
          syncNextEnabled(q.id);
        }
      },
    });

    // For multi questions, enable next if already has selection
    if (q.type === "multi") syncNextEnabled(q.id);
  }

  // Wire nav
  const backBtn = document.getElementById("quizBackBtn");
  const nextBtn = document.getElementById("quizNextBtn");
  const closeBtn = document.getElementById("quizCloseBtn");

  if (backBtn) backBtn.addEventListener("click", () => goBack(qIndex));
  if (nextBtn) nextBtn.addEventListener("click", () => goNext(qIndex, questions.length));
  if (closeBtn)
    closeBtn.addEventListener("click", () => {
      // Gentle reset confirm (no blocking modal yet)
      const ok = window.confirm("Exit the quiz and reset your answers?");
      if (!ok) return;
      resetQuiz();
      navigate("welcome");
    });

  // Keyboard accessibility (optional)
  window.addEventListener("keydown", onKeydownOnce, { once: true });
  function onKeydownOnce(e) {
    if (e.key === "Escape") {
      // mimic close
      if (closeBtn) closeBtn.click();
    }
    if (e.key === "ArrowLeft") {
      if (backBtn) backBtn.click();
    }
    if (e.key === "ArrowRight") {
      // for single questions, allow next
      if (q.type === "single") goNext(qIndex, questions.length);
    }
  }
}

/* ==========================================================================
   Markup helpers
   ========================================================================== */

function renderTopBar(index, total) {
  return `
    <header class="quiz-topbar">
      <button class="icon-btn" id="quizCloseBtn" aria-label="Exit quiz">
        ✕
      </button>

      <div class="quiz-progress" aria-label="Quiz progress">
        ${renderDots(index, total)}
      </div>

      <div class="quiz-progress-text" aria-hidden="true">
        ${index + 1}/${total}
      </div>
    </header>
  `;
}

function renderDots(index, total) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    const cls = i === index ? "dot dot-active" : i < index ? "dot dot-done" : "dot";
    dots.push(`<span class="${cls}"></span>`);
  }
  return dots.join("");
}

function renderQuestionCard(q) {
  const visualSrc = resolveQuizVisual(q.visual);
  const bg = visualSrc ? `style="--q-visual:url('${escapeAttr(visualSrc)}')"` : "";

  return `
    <main class="quiz-card" ${bg}>
      <div class="quiz-card-visual" aria-hidden="true"></div>

      <div class="quiz-card-content">
        <div class="quiz-section-chip">
          ${escapeHtml(labelForSection(q.section))}
        </div>

        <h2 class="quiz-question">
          ${escapeHtml(q.title)}
        </h2>

        <div id="choicesMount" class="quiz-choices"></div>

        <p class="quiz-hint">
          ${hintForType(q.type)}
        </p>
      </div>
    </main>
  `;
}

function renderBottomBar(q, index, total) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const nextLabel = isLast ? "See results" : "Next";
  const backLabel = "Back";

  // Next button behavior:
  // - single: hidden (auto-advance)
  // - multi: visible, disabled until selection
  const nextBtnMarkup =
    q.type === "multi"
      ? `<button class="primary-cta" id="quizNextBtn" disabled>${nextLabel}</button>`
      : `<button class="primary-cta hidden" id="quizNextBtn" disabled>${nextLabel}</button>`;

  return `
    <footer class="quiz-bottombar">
      <button class="secondary-cta" id="quizBackBtn" ${isFirst ? "disabled" : ""}>
        ${backLabel}
      </button>

      ${nextBtnMarkup}
    </footer>
  `;
}

/* ==========================================================================
   Nav helpers
   ========================================================================== */

function goBack(index) {
  const state = getState();
  const nextIndex = Math.max(0, index - 1);
  state.quizIndex = nextIndex;
  navigate("quiz");
}

function goNext(index, total) {
  const state = getState();
  const nextIndex = index + 1;

  if (nextIndex >= total) {
    // Completed quiz
    state.quizIndex = total - 1;
    navigate("results");
    return;
  }

  state.quizIndex = nextIndex;
  navigate("quiz");
}

function syncNextEnabled(questionId) {
  const state = getState();
  const nextBtn = document.getElementById("quizNextBtn");
  if (!nextBtn) return;

  const sel = state.answers?.[questionId];
  const hasSelection = Array.isArray(sel) ? sel.length > 0 : !!sel;
  nextBtn.disabled = !hasSelection;
}

/* ==========================================================================
   Small utilities
   ========================================================================== */

function labelForSection(section) {
  const map = {
    home: "Home",
    lifestyle: "Lifestyle",
    work: "Workday",
    household: "Household",
    social: "Social",
    experience: "Experience",
    tolerance: "Tolerances",
  };
  return map[section] || "Quiz";
}

function resolveQuizVisual(visualKey) {
  const key = String(visualKey || "").trim();
  const map = {
    home: "./assets/photos/lifestyle-apartment.webp",
    stairs: "./assets/photos/lifestyle-apartment.webp",
    activity: "./assets/photos/lifestyle-yard-large.webp",
    alone: "./assets/photos/lifestyle-apartment.webp",
    support: "./assets/photos/lifestyle-guests.webp",
    kids: "./assets/photos/lifestyle-kids.webp",
    guests: "./assets/photos/lifestyle-guests.webp",
    pets: "./assets/photos/lifestyle-yard-small.webp",
    experience: "./assets/photos/lifestyle-yard-small.webp",
    tolerance: "./assets/photos/lifestyle-balcony.webp",
  };

  return map[key] || "./assets/illustrations/hero-dog-collage.webp";
}

function hintForType(type) {
  if (type === "multi") return "Pick all that apply";
  return "Tap one to continue";
}

function clampInt(v, min, max) {
  const n = Number.isFinite(v) ? v : parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
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
  return String(str).replaceAll("'", "").replaceAll('"', "").trim();
}

function errorMarkup(msg) {
  return `
    <section class="screen safe-area-padding">
      <div style="padding:24px;">
        <h2>Quiz</h2>
        <p style="margin-top:12px;">${escapeHtml(msg)}</p>
      </div>
    </section>
  `;
}
```0
