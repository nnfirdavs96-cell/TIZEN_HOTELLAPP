const CACHE_PREFIX = "hga.cache.";
const DEFAULT_TIMEOUT_MS = 8000;

export interface ApiClientOptions {
  baseUrl: string;
  getAuthToken?: () => string | null;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface ApiResponse<T> {
  data: T;
  fromCache: boolean;
  etag: string | null;
  status: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: "network" | "timeout" | "http" | "parse",
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface CachedEntry<T> {
  etag: string | null;
  data: T;
  savedAt: number;
}

function readCache<T>(key: string): CachedEntry<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedEntry<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, entry: CachedEntry<T>): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — cache miss next time
  }
}

export class ApiClient {
  private baseUrl: string;
  private getAuthToken: () => string | null;
  private timeoutMs: number;
  private fetchImpl: typeof fetch;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.getAuthToken = opts.getAuthToken ?? (() => null);
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  }

  async get<T>(path: string, opts: { cacheKey?: string } = {}): Promise<ApiResponse<T>> {
    const cacheKey = opts.cacheKey ?? path;
    const cached = readCache<T>(cacheKey);
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = this.getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cached?.etag) headers["If-None-Match"] = cached.etag;

    const res = await this.request(path, { method: "GET", headers });
    if (res.status === 304 && cached) {
      return { data: cached.data, fromCache: true, etag: cached.etag, status: 304 };
    }
    const etag = res.headers.get("ETag");
    const data = (await this.parseJson<T>(res));
    writeCache<T>(cacheKey, { etag, data, savedAt: Date.now() });
    return { data, fromCache: false, etag, status: res.status };
  }

  async post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const token = this.getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await this.request(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return this.parseJson<T>(res);
  }

  readCachedOnly<T>(cacheKey: string): T | null {
    return readCache<T>(cacheKey)?.data ?? null;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = this.baseUrl + (path.startsWith("/") ? path : "/" + path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, { ...init, signal: controller.signal });
      if (!res.ok && res.status !== 304) {
        let body: unknown = null;
        try {
          body = await res.clone().json();
        } catch {
          // no json body
        }
        throw new ApiError(`HTTP ${res.status}`, res.status, "http", body);
      }
      return res;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") throw new ApiError("Request timeout", 0, "timeout");
      throw new ApiError("Network error", 0, "network");
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseJson<T>(res: Response): Promise<T> {
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError("Invalid JSON response", res.status, "parse");
    }
  }
}
