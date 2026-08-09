import { t, onLangChange } from "../core/i18n";

export interface KeypadOptions {
  maxLength: number;
  masked?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export interface KeypadInstance {
  root: HTMLElement;
  value(): string;
  setValue(v: string): void;
  clear(): void;
  setError(msg: string | null): void;
  destroy(): void;
}

const DIGITS: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function renderCells(value: string, maxLength: number, masked: boolean): string {
  const cells: string[] = [];
  for (let i = 0; i < maxLength; i++) {
    const ch = value[i];
    const shown = ch ? (masked ? "•" : ch) : "";
    cells.push(`<span class="keypad__cell ${ch ? "keypad__cell--filled" : ""}">${shown}</span>`);
  }
  return cells.join("");
}

export function createKeypad(opts: KeypadOptions & { mode: "numeric" | "alphanumeric" }): KeypadInstance {
  const root = document.createElement("div");
  root.className = "keypad";
  let value = "";
  let error: string | null = null;

  const render = (): void => {
    const keys = opts.mode === "numeric" ? DIGITS : [...DIGITS, ...LETTERS];
    root.innerHTML = `
      <div class="keypad__display" aria-live="polite">
        ${renderCells(value, opts.maxLength, opts.masked ?? false)}
      </div>
      ${error ? `<div class="keypad__error" role="alert">${error}</div>` : ""}
      <div class="keypad__grid keypad__grid--${opts.mode}">
        ${keys
          .map(
            (k) => `<button
              class="keypad__key"
              data-focusable="true"
              data-key="${k}"
              aria-label="${k}"
            >${k}</button>`,
          )
          .join("")}
        <button class="keypad__key keypad__key--wide" data-focusable="true" data-key="__back__" aria-label="backspace">
          ← ${t("keypad.backspace")}
        </button>
        <button class="keypad__key keypad__key--submit keypad__key--wide" data-focusable="true" data-key="__ok__">
          OK
        </button>
      </div>
    `;

    root.querySelectorAll<HTMLButtonElement>(".keypad__key").forEach((btn) => {
      btn.addEventListener("click", () => handleKey(btn.dataset.key ?? ""));
    });
  };

  const handleKey = (key: string): void => {
    if (key === "__back__") {
      if (value.length > 0) {
        value = value.slice(0, -1);
        error = null;
        opts.onChange?.(value);
        render();
      }
      return;
    }
    if (key === "__ok__") {
      opts.onSubmit?.(value);
      return;
    }
    if (value.length >= opts.maxLength) return;
    value += key;
    error = null;
    opts.onChange?.(value);
    render();
  };

  render();
  const off = onLangChange(() => render());

  return {
    root,
    value: () => value,
    setValue: (v) => {
      value = v.slice(0, opts.maxLength);
      render();
    },
    clear: () => {
      value = "";
      error = null;
      render();
    },
    setError: (msg) => {
      error = msg;
      render();
    },
    destroy: () => {
      off();
      root.innerHTML = "";
    },
  };
}
