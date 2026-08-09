import { Router } from "./core/router";
import { KEY, keyToDirection, registerTizenKeys } from "./core/keys";
import { findNearestFocusable } from "./core/focus-engine";
import { t, getLang, onLangChange } from "./core/i18n";
import { renderHome } from "./screens/home";
import { renderStub } from "./screens/stub";

const APP_ROOT_ID = "app";

function boot(): void {
  const root = document.getElementById(APP_ROOT_ID);
  if (!root) throw new Error(`Root element #${APP_ROOT_ID} not found`);
  document.documentElement.lang = getLang();
  onLangChange((lang) => (document.documentElement.lang = lang));

  registerTizenKeys();

  const exitApp = (): void => {
    const tizen = (window as unknown as { tizen?: { application?: { getCurrentApplication?: () => { exit: () => void } } } }).tizen;
    try {
      tizen?.application?.getCurrentApplication?.().exit();
    } catch {
      // dev fallback
    }
  };

  const router = new Router(root, () => openExitModal(exitApp));
  router.register("home", (ctx) => renderHome(ctx, (screen) => router.navigate(screen)));
  router.register("checkin", (ctx) => renderStub(ctx, "menu.checkin"));
  router.register("food", (ctx) => renderStub(ctx, "menu.food"));
  router.register("taxi", (ctx) => renderStub(ctx, "menu.taxi"));
  router.register("shop", (ctx) => renderStub(ctx, "menu.shop"));
  router.register("chat", (ctx) => renderStub(ctx, "menu.chat"));
  router.register("info", (ctx) => renderStub(ctx, "menu.info"));

  document.addEventListener("keydown", (e) => {
    const code = e.keyCode;

    if (code === KEY.BACK || code === KEY.EXIT) {
      e.preventDefault();
      if (isModalOpen()) {
        closeModal();
        return;
      }
      router.back();
      return;
    }

    if (code === KEY.OK) {
      const el = document.activeElement as HTMLElement | null;
      if (el && typeof el.click === "function") {
        e.preventDefault();
        el.click();
      }
      return;
    }

    const dir = keyToDirection(code);
    if (dir) {
      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      const scope = getFocusScope();
      const next = findNearestFocusable(active, dir, scope);
      next?.focus();
    }
  });

  router.navigate("home");
}

function isModalOpen(): boolean {
  return !!document.querySelector(".modal-backdrop");
}

function getFocusScope(): ParentNode {
  return document.querySelector(".modal-backdrop") ?? document;
}

function closeModal(): void {
  document.querySelector(".modal-backdrop")?.remove();
}

function openExitModal(onExit: () => void): void {
  if (isModalOpen()) return;
  const previousFocus = document.activeElement as HTMLElement | null;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__title">${t("exit.title")}</div>
      <div class="modal__actions">
        <button id="exit-cancel" class="btn--ghost" data-focusable="true">${t("exit.no")}</button>
        <button id="exit-confirm" class="btn--danger" data-focusable="true">${t("exit.yes")}</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector<HTMLButtonElement>("#exit-cancel")?.addEventListener("click", () => {
    closeModal();
    previousFocus?.focus();
  });
  backdrop.querySelector<HTMLButtonElement>("#exit-confirm")?.addEventListener("click", () => {
    closeModal();
    onExit();
  });
  backdrop.querySelector<HTMLButtonElement>("#exit-cancel")?.focus();
}

boot();
