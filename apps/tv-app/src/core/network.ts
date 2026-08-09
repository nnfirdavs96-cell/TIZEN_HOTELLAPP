const HEALTH_INTERVAL_MS = 15_000;
const HEALTH_TIMEOUT_MS = 4000;

export type NetworkListener = (online: boolean) => void;

export interface NetworkMonitorOptions {
  healthUrl?: string;
  fetchImpl?: typeof fetch;
}

export class NetworkMonitor {
  private listeners = new Set<NetworkListener>();
  private currentlyOnline: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;
  private healthUrl: string | null;
  private fetchImpl: typeof fetch;

  constructor(opts: NetworkMonitorOptions = {}) {
    this.healthUrl = opts.healthUrl ?? null;
    this.fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
    this.currentlyOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  }

  start(): void {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    if (this.healthUrl) {
      this.timer = setInterval(() => this.probe(), HEALTH_INTERVAL_MS);
      this.probe();
    }
  }

  stop(): void {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  online(): boolean {
    return this.currentlyOnline;
  }

  subscribe(cb: NetworkListener): () => void {
    this.listeners.add(cb);
    cb(this.currentlyOnline);
    return () => this.listeners.delete(cb);
  }

  async probe(): Promise<void> {
    if (!this.healthUrl) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(this.healthUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      this.set(res.ok);
    } catch {
      this.set(false);
    } finally {
      clearTimeout(timer);
    }
  }

  private handleOnline = (): void => this.set(true);
  private handleOffline = (): void => this.set(false);

  private set(next: boolean): void {
    if (next === this.currentlyOnline) return;
    this.currentlyOnline = next;
    this.listeners.forEach((cb) => cb(next));
  }
}
