import { Router } from "./core/router";
import { KEY, keyToDirection, registerTizenKeys } from "./core/keys";
import { findNearestFocusable } from "./core/focus-engine";
import { t, getLang, onLangChange } from "./core/i18n";
import { ApiClient } from "./core/api-client";
import { MutationQueue } from "./core/mutation-queue";
import { NetworkMonitor } from "./core/network";
import { renderLock } from "./screens/lock";
import { renderHome } from "./screens/home";
import { renderStub } from "./screens/stub";
import { renderOffline } from "./screens/offline";

const APP_ROOT_ID = "app";

// API base — реальный backend появится в Спринте 1.2.
// Health-URL пустой в dev: NetworkMonitor полагается на navigator.onLine,
// без ложных offline из-за отсутствующего /health.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const HEALTH_URL = (import.meta.env.VITE_HEALTH_URL as string | undefined) ?? "";

function boot(): void {
  const root = document.getElementById(APP_ROOT_ID);
  if (!root) throw new Error(`Root element #${APP_ROOT_ID} not found`);
  document.documentElement.lang = getLang();
  onLangChange((lang) => (document.documentElement.lang = lang));

  registerTizenKeys();

  const api = new ApiClient({
    baseUrl: API_BASE || "http://localhost:0",
    getAuthToken: () => localStorage.getItem("hga.auth.token"),
  });
  const queue = new MutationQueue(api);
  const net = new NetworkMonitor({ healthUrl: HEALTH_URL || undefined });

  const exitApp = (): void => {
    const tizen = (window as unknown as { tizen?: { application?: { getCurrentApplication?: () => { exit: () => void } } } }).tizen;
    try {
      tizen?.application?.getCurrentApplication?.().exit();
    } catch {
      // dev fallback
    }
  };

  const router = new Router(root, () => openExitModal(exitApp));
  router.register("lock", (ctx) => renderLock(ctx, () => router.replace("home")));
  router.register("home", (ctx) => renderHome(ctx, (screen) => router.navigate(screen)));
  router.register("checkin", (ctx) => renderStub(ctx, "menu.checkin"));
  router.register("food", (ctx) => renderStub(ctx, "menu.food"));
  router.register("taxi", (ctx) => renderStub(ctx, "menu.taxi"));
  router.register("shop", (ctx) => renderStub(ctx, "menu.shop"));
  router.register("chat", (ctx) => renderStub(ctx, "menu.chat"));
  router.register("info", (ctx) => renderStub(ctx, "menu.info"));
  router.register("offline", (ctx) =>
    renderOffline(ctx, {
      isOnline: () => net.online(),
      onOnline: (cb) => net.subscribe(cb),
      retry: () => net.probe(),
    }),
  );

  net.subscribe((online) => {
    queue.setOnline(online);
    updateOfflineBanner(online);
  });
  net.start();

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

  router.navigate("lock");

  // Экспорт для отладки (dev-only, безопасно оставить: не влияет на прод-функционал)
  Object.assign(window as unknown as Record<string, unknown>, { __hga: { api, queue, net, router } });
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

function updateOfflineBanner(online: boolean): void {
  const existing = document.getElementById("offline-banner");
  if (online) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const banner = document.createElement("div");
  banner.id = "offline-banner";
  banner.className = "offline-banner";
  banner.setAttribute("role", "status");
  banner.textContent = t("offline.banner");
  document.body.appendChild(banner);
  onLangChange(() => {
    const el = document.getElementById("offline-banner");
    if (el) el.textContent = t("offline.banner");
  });
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
