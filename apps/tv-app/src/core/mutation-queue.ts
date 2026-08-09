import { ApiClient, ApiError } from "./api-client";

const STORAGE_KEY = "hga.mutations.queue";
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const MAX_ATTEMPTS = 8;

export type MutationStatus = "pending" | "sending" | "sent" | "failed";

export interface Mutation {
  id: string;
  path: string;
  body: unknown;
  idempotencyKey: string;
  attempts: number;
  status: MutationStatus;
  nextAttemptAt: number;
  createdAt: number;
  lastError?: string;
}

export type QueueListener = (queue: Mutation[]) => void;

function randomKey(): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rnd}`;
}

function readQueue(): Mutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Mutation[];
  } catch {
    return [];
  }
}

function writeQueue(q: Mutation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch {
    // quota exceeded — accept loss of durability, keep only in-memory
  }
}

export class MutationQueue {
  private queue: Mutation[] = readQueue();
  private listeners = new Set<QueueListener>();
  private processing = false;
  private isOnline = true;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiClient) {}

  setOnline(online: boolean): void {
    this.isOnline = online;
    if (online) this.schedule(0);
  }

  enqueue(path: string, body: unknown): Mutation {
    const m: Mutation = {
      id: randomKey(),
      path,
      body,
      idempotencyKey: randomKey(),
      attempts: 0,
      status: "pending",
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
    };
    this.queue.push(m);
    this.persist();
    this.schedule(0);
    return m;
  }

  list(): Mutation[] {
    return this.queue.slice();
  }

  subscribe(cb: QueueListener): () => void {
    this.listeners.add(cb);
    cb(this.list());
    return () => this.listeners.delete(cb);
  }

  private schedule(delay: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), delay);
  }

  private async tick(): Promise<void> {
    if (this.processing) return;
    if (!this.isOnline) return;
    const now = Date.now();
    const next = this.queue.find(
      (m) => (m.status === "pending" || m.status === "failed") && m.nextAttemptAt <= now,
    );
    if (!next) {
      const upcoming = this.queue
        .filter((m) => m.status === "pending" || m.status === "failed")
        .map((m) => m.nextAttemptAt - now)
        .filter((d) => d > 0)
        .sort((a, b) => a - b)[0];
      if (upcoming !== undefined) this.schedule(upcoming);
      return;
    }

    this.processing = true;
    next.status = "sending";
    next.attempts += 1;
    this.emit();
    try {
      await this.api.post(next.path, next.body, next.idempotencyKey);
      next.status = "sent";
      this.queue = this.queue.filter((m) => m.id !== next.id);
      this.persist();
    } catch (err) {
      const nonRetriable = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (nonRetriable || next.attempts >= MAX_ATTEMPTS) {
        next.status = "failed";
        next.lastError = String((err as Error)?.message ?? err);
        next.nextAttemptAt = Number.MAX_SAFE_INTEGER;
        this.persist();
      } else {
        next.status = "pending";
        next.lastError = String((err as Error)?.message ?? err);
        const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (next.attempts - 1), MAX_BACKOFF_MS);
        next.nextAttemptAt = Date.now() + backoff;
        this.persist();
        this.schedule(backoff);
      }
    } finally {
      this.processing = false;
      this.emit();
      this.schedule(50);
    }
  }

  private emit(): void {
    const snapshot = this.list();
    this.listeners.forEach((cb) => cb(snapshot));
  }

  private persist(): void {
    writeQueue(this.queue);
  }
}
