import type { ScreenContext } from "../core/router";
import { t, toggleLang, onLangChange, getLang } from "../core/i18n";
import { mockBooking } from "../data/mocks";

interface Tile {
  id: string;
  screen: string;
  labelKey: string;
  icon: string;
}

const TILES: Tile[] = [
  { id: "tile-checkin", screen: "checkin", labelKey: "menu.checkin", icon: "🛎" },
  { id: "tile-food", screen: "food", labelKey: "menu.food", icon: "🍽" },
  { id: "tile-taxi", screen: "taxi", labelKey: "menu.taxi", icon: "🚕" },
  { id: "tile-shop", screen: "shop", labelKey: "menu.shop", icon: "🛍" },
  { id: "tile-chat", screen: "chat", labelKey: "menu.chat", icon: "💬" },
  { id: "tile-info", screen: "info", labelKey: "menu.info", icon: "ℹ️" },
];

export function renderHome(ctx: ScreenContext, navigate: (id: string) => void): () => void {
  const { root } = ctx;
  const render = (): void => {
    root.innerHTML = `
      <div class="home">
        <header class="home__header">
          <div class="home__greeting">
            <div class="home__title">${t("app.title")}</div>
            <div class="home__subtitle">${t("booking.greeting", { name: mockBooking.guestName })} · ${t("booking.room", { room: mockBooking.roomNumber })}</div>
          </div>
          <button id="lang-toggle" class="lang-toggle" data-focusable="true" aria-label="switch language">
            ${t("lang.switch")}
          </button>
        </header>
        <main class="home__grid" role="list">
          ${TILES.map(
            (tile) => `
            <button
              id="${tile.id}"
              class="tile"
              data-focusable="true"
              data-screen="${tile.screen}"
              role="listitem"
            >
              <span class="tile__icon" aria-hidden="true">${tile.icon}</span>
              <span class="tile__label">${t(tile.labelKey)}</span>
            </button>`,
          ).join("")}
        </main>
        <footer class="home__hint">${t("app.hint.dpad")} · ${getLang().toUpperCase()}</footer>
      </div>
    `;

    root.querySelector<HTMLButtonElement>("#lang-toggle")?.addEventListener("click", () => {
      toggleLang();
    });
    root.querySelectorAll<HTMLButtonElement>(".tile").forEach((el) => {
      el.addEventListener("click", () => {
        const screen = el.dataset.screen;
        if (screen) navigate(screen);
      });
    });
  };

  render();
  const off = onLangChange(() => render());
  return () => off();
}
