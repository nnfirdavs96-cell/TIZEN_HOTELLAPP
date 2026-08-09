const KEY_ACCESS = "hga.auth.token";
const KEY_REFRESH = "hga.auth.refresh";
const KEY_DEVICE = "hga.device.token";
const KEY_GUEST = "hga.auth.guest";

export interface Guest {
  id: string;
  name: string;
  roomNumber: string;
  language?: "ru" | "en";
}

export type SessionListener = (session: SessionSnapshot) => void;

export interface SessionSnapshot {
  authed: boolean;
  guest: Guest | null;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export class Session {
  private listeners = new Set<SessionListener>();

  getAccessToken(): string | null {
    return safeGet(KEY_ACCESS);
  }

  getRefreshToken(): string | null {
    return safeGet(KEY_REFRESH);
  }

  getDeviceToken(): string | null {
    return safeGet(KEY_DEVICE);
  }

  setDeviceToken(token: string | null): void {
    safeSet(KEY_DEVICE, token);
  }

  getGuest(): Guest | null {
    const raw = safeGet(KEY_GUEST);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Guest;
    } catch {
      return null;
    }
  }

  isAuthed(): boolean {
    return this.getAccessToken() !== null && this.getGuest() !== null;
  }

  login(access: string, refresh: string, guest: Guest): void {
    safeSet(KEY_ACCESS, access);
    safeSet(KEY_REFRESH, refresh);
    safeSet(KEY_GUEST, JSON.stringify(guest));
    this.emit();
  }

  updateAccess(access: string): void {
    safeSet(KEY_ACCESS, access);
    this.emit();
  }

  logout(): void {
    safeSet(KEY_ACCESS, null);
    safeSet(KEY_REFRESH, null);
    safeSet(KEY_GUEST, null);
    this.emit();
  }

  snapshot(): SessionSnapshot {
    return { authed: this.isAuthed(), guest: this.getGuest() };
  }

  subscribe(cb: SessionListener): () => void {
    this.listeners.add(cb);
    cb(this.snapshot());
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    const snap = this.snapshot();
    this.listeners.forEach((cb) => cb(snap));
  }
}
