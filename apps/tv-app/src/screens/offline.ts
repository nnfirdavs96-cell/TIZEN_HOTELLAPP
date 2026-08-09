import type { ScreenContext } from "../core/router";
import { t, onLangChange } from "../core/i18n";

export interface OfflineDeps {
  isOnline: () => boolean;
  onOnline: (cb: (online: boolean) => void) => () => void;
  retry: () => Promise<void>;
}

export function renderOffline(ctx: ScreenContext, deps: OfflineDeps): () => void {
  const { root, goBack } = ctx;

  const render = (): void => {
    root.innerHTML = `
      <div class="stub">
        <div class="stub__title">📡 ${t("offline.title")}</div>
        <p class="stub__body">${t("offline.body")}</p>
        <button id="offline-retry" class="btn btn--primary" data-focusable="true">
          ${t("offline.retry")}
        </button>
      </div>
    `;
    const retryBtn = root.querySelector<HTMLButtonElement>("#offline-retry");
    retryBtn?.addEventListener("click", async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = t("offline.checking");
      try {
        await deps.retry();
      } finally {
        retryBtn.disabled = false;
        retryBtn.textContent = t("offline.retry");
      }
    });
  };

  render();
  const offLang = onLangChange(() => render());
  const offNet = deps.onOnline((online) => {
    if (online) goBack();
  });

  return () => {
    offLang();
    offNet();
  };
}
