import { focusById, focusFirst } from "./focus-engine";

export interface ScreenContext {
  root: HTMLElement;
  params: Record<string, string>;
  goBack: () => void;
}

export type ScreenRenderer = (ctx: ScreenContext) => void | (() => void);

interface ScreenDef {
  id: string;
  render: ScreenRenderer;
}

interface HistoryEntry {
  screenId: string;
  params: Record<string, string>;
  lastFocusId: string | null;
  cleanup?: () => void;
}

export class Router {
  private screens = new Map<string, ScreenDef>();
  private stack: HistoryEntry[] = [];
  private container: HTMLElement;
  private onExit: () => void;

  constructor(container: HTMLElement, onExit: () => void) {
    this.container = container;
    this.onExit = onExit;
  }

  register(id: string, render: ScreenRenderer): void {
    this.screens.set(id, { id, render });
  }

  navigate(id: string, params: Record<string, string> = {}): void {
    const screen = this.screens.get(id);
    if (!screen) throw new Error(`Screen not found: ${id}`);
    this.captureFocusOnTop();
    this.tearDownTop();
    this.container.innerHTML = "";
    const entry: HistoryEntry = { screenId: id, params, lastFocusId: null };
    this.stack.push(entry);
    const cleanup = screen.render({
      root: this.container,
      params,
      goBack: () => this.back(),
    });
    if (typeof cleanup === "function") entry.cleanup = cleanup;
    focusFirst(this.container);
  }

  replace(id: string, params: Record<string, string> = {}): void {
    if (this.stack.length > 0) {
      this.tearDownTop();
      this.stack.pop();
    }
    this.navigate(id, params);
  }

  back(): void {
    if (this.stack.length <= 1) {
      this.onExit();
      return;
    }
    this.tearDownTop();
    this.stack.pop();
    const prev = this.stack.pop();
    if (!prev) return;
    this.navigate(prev.screenId, prev.params);
    if (prev.lastFocusId) focusById(prev.lastFocusId);
  }

  current(): string | null {
    return this.stack[this.stack.length - 1]?.screenId ?? null;
  }

  private captureFocusOnTop(): void {
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active.id) top.lastFocusId = active.id;
  }

  private tearDownTop(): void {
    const top = this.stack[this.stack.length - 1];
    top?.cleanup?.();
  }
}
