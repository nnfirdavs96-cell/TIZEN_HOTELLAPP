import type { ScreenContext } from "../core/router";
import { t, onLangChange } from "../core/i18n";
import { formatMoney } from "../core/format";
import type { BookingService } from "../services/booking";
import type { Booking } from "../data/mocks";

export interface CheckoutDeps {
  booking: BookingService;
  getBooking: () => Promise<Booking>;
  onSuccess: (invoiceId: string, email: string) => void;
}

export function renderCheckout(ctx: ScreenContext, deps: CheckoutDeps): () => void {
  const { root, goBack } = ctx;
  let booking: Booking | null = null;
  let email = "";
  let submitting = false;
  let error: string | null = null;

  const render = (): void => {
    if (!booking) {
      root.innerHTML = `<div class="page"><div class="page__title">${t("checkout.title")}</div><div class="page__loading">${t("common.loading")}</div></div>`;
      return;
    }
    root.innerHTML = `
      <div class="page checkout">
        <div class="page__title">${t("checkout.title")}</div>
        <div class="card">
          <div class="card__row"><span>${t("booking.room")}</span><b>${booking.room.number}</b></div>
          <div class="card__row card__row--total"><span>${t("bill.total")}</span><b>${formatMoney(booking.totalAmount)}</b></div>
        </div>
        <div class="checkout__email">
          <label class="checkout__label" for="email-input">${t("checkout.email")}</label>
          <div id="email-input" class="checkout__email-value">${email || booking.guest.email}</div>
          <div class="checkout__hint">${t("checkout.emailHint")}</div>
        </div>
        ${error ? `<div class="page__error">${error}</div>` : ""}
        <div class="page__actions">
          <button id="confirm" class="btn btn--primary" data-focusable="true" ${submitting ? "disabled" : ""}>
            ${submitting ? t("checkout.sending") : t("checkout.confirm")}
          </button>
          <button id="cancel" class="btn--ghost" data-focusable="true" ${submitting ? "disabled" : ""}>
            ${t("common.cancel")}
          </button>
        </div>
      </div>
    `;
    root.querySelector<HTMLButtonElement>("#confirm")?.addEventListener("click", confirm);
    root.querySelector<HTMLButtonElement>("#cancel")?.addEventListener("click", () => goBack());
  };

  async function confirm(): Promise<void> {
    if (submitting || !booking) return;
    submitting = true;
    error = null;
    render();
    const target = email || booking.guest.email;
    try {
      const res = await deps.booking.checkout(target);
      if (res.status !== "sent") {
        error = t("checkout.error");
        submitting = false;
        render();
        return;
      }
      deps.onSuccess(res.invoiceId, target);
    } catch (err) {
      error = (err as Error).message || t("checkout.error");
      submitting = false;
      render();
    }
  }

  async function load(): Promise<void> {
    render();
    try {
      booking = await deps.getBooking();
      email = booking.guest.email;
      render();
    } catch (err) {
      error = (err as Error).message ?? t("common.error");
      render();
    }
  }

  const off = onLangChange(() => render());
  load();
  return () => off();
}
