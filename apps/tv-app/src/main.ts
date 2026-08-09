import { Router } from "./core/router";
import { KEY, keyToDirection, registerTizenKeys } from "./core/keys";
import { findNearestFocusable } from "./core/focus-engine";
import { t, getLang, onLangChange } from "./core/i18n";
import { ApiClient } from "./core/api-client";
import { MutationQueue } from "./core/mutation-queue";
import { NetworkMonitor } from "./core/network";
import { Session } from "./core/session";
import { AuthService } from "./services/auth";
import { BookingService } from "./services/booking";
import { renderLock } from "./screens/lock";
import { renderLogin } from "./screens/login";
import { renderHome } from "./screens/home";
import { renderStub } from "./screens/stub";
import { renderOffline } from "./screens/offline";
import { renderBookingDetails } from "./screens/booking-details";
import { renderBill } from "./screens/bill";
import { renderCheckout } from "./screens/checkout";
import { renderCheckoutSuccess } from "./screens/checkout-success";

const APP_ROOT_ID = "app";
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const HEALTH_URL = (import.meta.env.VITE_HEALTH_URL as string | undefined) ?? "";
const USE_MOCKS = !API_BASE;

function boot(): void {
  const root = document.getElementById(APP_ROOT_ID);
  if (!root) throw new Error(`Root element #${APP_ROOT_ID} not found`);
  document.documentElement.lang = getLang();
  onLangChange((lang) => (document.documentElement.lang = lang));

  registerTizenKeys();

  const session = new Session();
  const api = new ApiClient({
    baseUrl: API_BASE || "http://localhost:0",
    getAuthToken: () => session.getAccessToken(),
  });
  const auth = new AuthService(api, session, USE_MOCKS);
  const booking = new BookingService(api, session, USE_MOCKS);
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

  router.register("lock", (ctx) => renderLock(ctx, () => enter()));
  router.register("login", (ctx) =>
    renderLogin(ctx, { auth, onSuccess: () => router.replace("home") }),
  );
  router.register("home", (ctx) =>
    renderHome(ctx, { session, navigate: (screen) => router.navigate(screen) }),
  );
  router.register("booking", (ctx) =>
    renderBookingDetails(ctx, {
      booking,
      onOpenBill: () => router.navigate("bill"),
      onCheckout: () => router.navigate("checkout"),
    }),
  );
  router.register("bill", (ctx) =>
    renderBill(ctx, { booking, onCheckout: () => router.navigate("checkout") }),
  );
  router.register("checkout", (ctx) =>
    renderCheckout(ctx, {
      booking,
      getBooking: () => booking.getCurrent(),
      onSuccess: (invoiceId, email) => {
        (window as unknown as Record<string, unknown>).__lastInvoice = { invoiceId, email };
        router.replace("checkout-success");
      },
    }),
  );
  router.register("checkout-success", (ctx) => {
    const last = (window as unknown as { __lastInvoice?: { invoiceId: string; email: string } }).__lastInvoice ?? {
      invoiceId: "-",
      email: "-",
    };
    return renderCheckoutSuccess(ctx, {
      invoiceId: last.invoiceId,
      email: last.email,
      onDone: () => router.replace("lock"),
    });
  });
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

  session.subscribe((snap) => {
    if (!snap.authed) {
      const curr = router.current();
      if (curr && curr !== "lock" && curr !== "login" && curr !== "checkout-success") {
        router.replace("lock");
      }
    }
  });

  function enter(): void {
    if (session.isAuthed()) router.replace("home");
    else router.replace("login");
  }

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

  router.navigate(session.isAuthed() ? "home" : "lock");

  Object.assign(window as unknown as Record<string, unknown>, {
    __hga: { api, queue, net, router, session, auth, booking, useMocks: USE_MOCKS },
  });
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
