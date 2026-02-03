/* ==========================================================================
   screen_welcome.js — AdoptMatch
   Visual-first welcome / entry screen
   ========================================================================== */

import { navigate } from "../router.js";

export function renderWelcomeScreen() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <section class="screen screen-welcome safe-area-padding">
      <div class="welcome-hero">
        <img
          src="./assets/illustrations/hero-dog-collage.webp"
          alt="Collage of adoptable dogs"
          class="welcome-hero-image"
          loading="eager"
        />
        <div class="welcome-hero-overlay"></div>
      </div>

      <div class="welcome-content">
        <h1 class="welcome-title">Find your dog fit</h1>

        <p class="welcome-subtitle">
          A quick, visual quiz that helps match you with
          <strong>adoptable dog mixes</strong> that fit your home,
          routine, and real life.
        </p>

        <ul class="welcome-bullets">
          <li>
            <span class="bullet-icon">🐾</span>
            Adoption-first, not breed shopping
          </li>
          <li>
            <span class="bullet-icon">🏠</span>
            Built around apartments, workdays & guests
          </li>
          <li>
            <span class="bullet-icon">❤️</span>
            Focused on long-term fit, not trends
          </li>
        </ul>

        <button class="primary-cta btn-primary" id="startQuizBtn">
          Start the match
        </button>

        <p class="welcome-cta-note">Takes ~60 seconds</p>

        <p class="welcome-footnote">
          No sign-up · Your answers stay on your device
        </p>
      </div>
    </section>
  `;

  const startBtn = document.getElementById("startQuizBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      navigate("quiz");
    });
  }
}
