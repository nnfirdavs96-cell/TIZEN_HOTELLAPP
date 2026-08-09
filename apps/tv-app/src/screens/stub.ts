import type { ScreenContext } from "../core/router";
import { t, onLangChange } from "../core/i18n";

export function renderStub(ctx: ScreenContext, titleKey: string): () => void {
  const { root, goBack } = ctx;
  const render = (): void => {
    root.innerHTML = `
      <div class="stub">
        <div class="stub__title">${t(titleKey)}</div>
        <div class="stub__badge">${t("screen.stub.title")}</div>
        <p class="stub__body">${t("screen.stub.body")}</p>
        <button id="stub-back" class="btn btn--primary" data-focusable="true">
          ← ${t("screen.stub.back")}
        </button>
      </div>
    `;
    root.querySelector<HTMLButtonElement>("#stub-back")?.addEventListener("click", () => goBack());
  };

  render();
  const off = onLangChange(() => render());
  return () => off();
}
