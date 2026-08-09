import type { ScreenContext } from "../core/router";
import { t, onLangChange } from "../core/i18n";

export interface CheckoutSuccessDeps {
  invoiceId: string;
  email: string;
  onDone: () => void;
}

export function renderCheckoutSuccess(ctx: ScreenContext, deps: CheckoutSuccessDeps): () => void {
  const { root } = ctx;

  const render = (): void => {
    root.innerHTML = `
      <div class="stub checkout-success">
        <div class="checkout-success__icon" aria-hidden="true">✅</div>
        <div class="stub__title">${t("checkout.success.title")}</div>
        <p class="stub__body">${t("checkout.success.body", { email: deps.email })}</p>
        <p class="checkout-success__meta">${t("checkout.success.invoice")}: <b>${deps.invoiceId}</b></p>
        <button id="done" class="btn btn--primary" data-focusable="true">${t("checkout.success.done")}</button>
      </div>
    `;
    root.querySelector<HTMLButtonElement>("#done")?.addEventListener("click", () => deps.onDone());
  };

  render();
  const off = onLangChange(() => render());
  return () => off();
}
