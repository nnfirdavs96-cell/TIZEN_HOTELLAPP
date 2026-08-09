import type { ScreenContext } from "../core/router";
import { t, onLangChange } from "../core/i18n";
import { formatDate, formatMoney } from "../core/format";
import type { BookingService } from "../services/booking";
import type { Booking } from "../data/mocks";

export interface BookingDetailsDeps {
  booking: BookingService;
  onOpenBill: () => void;
  onCheckout: () => void;
}

export function renderBookingDetails(ctx: ScreenContext, deps: BookingDetailsDeps): () => void {
  const { root, goBack } = ctx;
  let data: Booking | null = null;
  let error: string | null = null;

  const render = (): void => {
    if (error) {
      root.innerHTML = errorTemplate(error);
      bindError();
      return;
    }
    if (!data) {
      root.innerHTML = loadingTemplate();
      return;
    }
    root.innerHTML = detailsTemplate(data);
    bindDetails();
  };

  const loadingTemplate = (): string => `
    <div class="page">
      <div class="page__title">${t("booking.title")}</div>
      <div class="page__loading">${t("common.loading")}</div>
    </div>
  `;

  const errorTemplate = (msg: string): string => `
    <div class="page">
      <div class="page__title">${t("booking.title")}</div>
      <div class="page__error">${msg}</div>
      <button id="retry" class="btn btn--primary" data-focusable="true">${t("common.retry")}</button>
      <button id="back" class="btn--ghost" data-focusable="true">${t("common.back")}</button>
    </div>
  `;

  const detailsTemplate = (b: Booking): string => `
    <div class="page">
      <div class="page__title">${t("booking.title")}</div>
      <div class="card">
        <div class="card__row"><span>${t("booking.guest")}</span><b>${b.guest.name}</b></div>
        <div class="card__row"><span>${t("booking.room")}</span><b>${b.room.number}</b></div>
        <div class="card__row"><span>${t("booking.dates")}</span><b>${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}</b></div>
        <div class="card__row"><span>${t("booking.guests")}</span><b>${b.guests}</b></div>
        <div class="card__row"><span>${t("booking.tariff")}</span><b>${b.tariff}</b></div>
        <div class="card__row"><span>${t("booking.services")}</span><b>${b.includedServices.join(" · ")}</b></div>
        <div class="card__row card__row--total"><span>${t("booking.total")}</span><b>${formatMoney(b.totalAmount)}</b></div>
      </div>
      <div class="page__actions">
        <button id="bill" class="btn btn--primary" data-focusable="true">${t("booking.openBill")}</button>
        <button id="checkout" class="btn--danger" data-focusable="true">${t("booking.checkout")}</button>
        <button id="back" class="btn--ghost" data-focusable="true">${t("common.back")}</button>
      </div>
    </div>
  `;

  const bindDetails = (): void => {
    root.querySelector<HTMLButtonElement>("#bill")?.addEventListener("click", () => deps.onOpenBill());
    root.querySelector<HTMLButtonElement>("#checkout")?.addEventListener("click", () => deps.onCheckout());
    root.querySelector<HTMLButtonElement>("#back")?.addEventListener("click", () => goBack());
  };

  const bindError = (): void => {
    root.querySelector<HTMLButtonElement>("#retry")?.addEventListener("click", () => load());
    root.querySelector<HTMLButtonElement>("#back")?.addEventListener("click", () => goBack());
  };

  async function load(): Promise<void> {
    error = null;
    data = null;
    render();
    try {
      data = await deps.booking.getCurrent();
      render();
    } catch (err) {
      error = (err as Error).message ?? t("common.error");
      render();
    }
  }

  render();
  const off = onLangChange(() => render());
  load();
  return () => off();
}
