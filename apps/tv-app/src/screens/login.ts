import type { ScreenContext } from "../core/router";
import { t, onLangChange } from "../core/i18n";
import { createKeypad } from "../components/keypad";
import { AuthService } from "../services/auth";

const MAX_ATTEMPTS = 5;

export interface LoginDeps {
  auth: AuthService;
  onSuccess: () => void;
}

export function renderLogin(ctx: ScreenContext, deps: LoginDeps): () => void {
  const { root } = ctx;
  let mode: "code" | "pin" = "code";
  let attempts = 0;
  let submitting = false;

  const layout = document.createElement("div");
  layout.className = "login";
  root.appendChild(layout);

  const header = document.createElement("header");
  header.className = "login__header";
  layout.appendChild(header);

  const modeSwitch = document.createElement("div");
  modeSwitch.className = "login__modes";
  layout.appendChild(modeSwitch);

  const keypadHost = document.createElement("div");
  keypadHost.className = "login__keypad";
  layout.appendChild(keypadHost);

  let keypad = mount();

  function mount(): ReturnType<typeof createKeypad> {
    const k = createKeypad({
      mode: mode === "pin" ? "numeric" : "alphanumeric",
      maxLength: mode === "pin" ? 4 : 8,
      masked: mode === "pin",
      onSubmit: (value) => submit(value),
    });
    keypadHost.innerHTML = "";
    keypadHost.appendChild(k.root);
    return k;
  }

  const renderHeader = (): void => {
    header.innerHTML = `
      <div class="login__title">${t("login.title")}</div>
      <div class="login__subtitle">${mode === "pin" ? t("login.subtitle.pin") : t("login.subtitle.code")}</div>
    `;
    modeSwitch.innerHTML = `
      <button id="mode-code" class="login__mode ${mode === "code" ? "is-active" : ""}" data-focusable="true">
        ${t("login.mode.code")}
      </button>
      <button id="mode-pin" class="login__mode ${mode === "pin" ? "is-active" : ""}" data-focusable="true">
        ${t("login.mode.pin")}
      </button>
    `;
    modeSwitch.querySelector<HTMLButtonElement>("#mode-code")?.addEventListener("click", () => switchMode("code"));
    modeSwitch.querySelector<HTMLButtonElement>("#mode-pin")?.addEventListener("click", () => switchMode("pin"));
  };

  const switchMode = (next: "code" | "pin"): void => {
    if (next === mode) return;
    mode = next;
    keypad.destroy();
    keypad = mount();
    renderHeader();
  };

  async function submit(value: string): Promise<void> {
    if (submitting) return;
    const needed = mode === "pin" ? 4 : 6;
    if (value.length < needed) {
      keypad.setError(t("login.error.tooShort"));
      return;
    }
    submitting = true;
    keypad.setError(null);
    try {
      await deps.auth.login(mode === "pin" ? { pin: value } : { bookingCode: value });
      deps.onSuccess();
    } catch (err) {
      attempts += 1;
      const isAuth = AuthService.isAuthError(err);
      if (attempts >= MAX_ATTEMPTS) {
        keypad.setError(t("login.error.locked"));
      } else if (isAuth) {
        keypad.setError(t("login.error.invalid", { left: String(MAX_ATTEMPTS - attempts) }));
      } else {
        keypad.setError(t("login.error.network"));
      }
      keypad.clear();
    } finally {
      submitting = false;
    }
  }

  renderHeader();
  const off = onLangChange(() => {
    renderHeader();
    keypad.destroy();
    keypad = mount();
  });

  return () => {
    off();
    keypad.destroy();
  };
}
