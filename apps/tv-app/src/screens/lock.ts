import type { ScreenContext } from "../core/router";
import { t, toggleLang, onLangChange, getLang } from "../core/i18n";

export function renderLock(ctx: ScreenContext, onEnter: () => void): () => void {
  const { root } = ctx;

  const render = (): void => {
    root.innerHTML = `
      <div class="lock">
        <div class="lock__brand">
          <div class="lock__logo">🏨</div>
          <div class="lock__hotel">Grand Hotel</div>
        </div>
        <div class="lock__welcome">
          <div class="lock__title">${t("app.title")}</div>
          <div class="lock__subtitle">${t("lock.hint")}</div>
        </div>
        <div class="lock__actions">
          <button id="lock-enter" class="btn btn--primary lock__enter" data-focusable="true">
            ${t("lock.enter")}
          </button>
          <button id="lock-lang" class="btn--ghost" data-focusable="true">
            ${t("lang.switch")} · ${getLang().toUpperCase()}
          </button>
        </div>
        <div class="lock__foot">${t("app.hint.dpad")}</div>
      </div>
    `;
    root.querySelector<HTMLButtonElement>("#lock-enter")?.addEventListener("click", onEnter);
    root.querySelector<HTMLButtonElement>("#lock-lang")?.addEventListener("click", () => toggleLang());
  };

  render();
  const off = onLangChange(() => render());
  return () => off();
}
