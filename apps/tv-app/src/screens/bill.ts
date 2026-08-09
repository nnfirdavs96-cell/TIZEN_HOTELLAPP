import type { ScreenContext } from "../core/router";
import { t, onLangChange } from "../core/i18n";
import { formatDateTime, formatMoney } from "../core/format";
import type { BookingService } from "../services/booking";
import type { Folio, FolioEntry } from "../data/mocks";

const SOURCE_ICONS: Record<FolioEntry["source"], string> = {
  stay: "🛏",
  food: "🍽",
  shop: "🛍",
  taxi: "🚕",
  other: "•",
};

export interface BillDeps {
  booking: BookingService;
  onCheckout: () => void;
}

export function renderBill(ctx: ScreenContext, deps: BillDeps): () => void {
  const { root, goBack } = ctx;
  let data: Folio | null = null;
  let error: string | null = null;

  const render = (): void => {
    if (error) {
      root.innerHTML = `
        <div class="page">
          <div class="page__title">${t("bill.title")}</div>
          <div class="page__error">${error}</div>
          <button id="retry" class="btn btn--primary" data-focusable="true">${t("common.retry")}</button>
        </div>
      `;
      root.querySelector<HTMLButtonElement>("#retry")?.addEventListener("click", () => load());
      return;
    }
    if (!data) {
      root.innerHTML = `<div class="page"><div class="page__title">${t("bill.title")}</div><div class="page__loading">${t("common.loading")}</div></div>`;
      return;
    }
    root.innerHTML = `
      <div class="page">
        <div class="page__title">${t("bill.title")}</div>
        <ul class="folio">
          ${data.entries
            .map(
              (e) => `
              <li class="folio__row">
                <span class="folio__icon" aria-hidden="true">${SOURCE_ICONS[e.source]}</span>
                <span class="folio__desc">
                  <b>${e.description}</b>
                  <em>${formatDateTime(e.createdAt)}</em>
                </span>
                <span class="folio__amount">${formatMoney(e.amount)}</span>
              </li>`,
            )
            .join("")}
        </ul>
        <div class="folio__total">
          <span>${t("bill.total")}</span>
          <b>${formatMoney(data.total)}</b>
        </div>
        <div class="page__actions">
          <button id="checkout" class="btn btn--danger" data-focusable="true">${t("booking.checkout")}</button>
          <button id="back" class="btn--ghost" data-focusable="true">${t("common.back")}</button>
        </div>
      </div>
    `;
    root.querySelector<HTMLButtonElement>("#checkout")?.addEventListener("click", () => deps.onCheckout());
    root.querySelector<HTMLButtonElement>("#back")?.addEventListener("click", () => goBack());
  };

  async function load(): Promise<void> {
    error = null;
    data = null;
    render();
    try {
      data = await deps.booking.getFolio();
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
