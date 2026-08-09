import type { ApiClient } from "../core/api-client";
import { ApiError } from "../core/api-client";
import type { Session, Guest } from "../core/session";
import { mockBooking, MOCK_VALID_CODES, MOCK_VALID_PINS } from "../data/mocks";

export interface LoginInput {
  bookingCode?: string;
  pin?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  guest: Guest;
}

const MOCK_DELAY_MS = 400;
const AUTH_ERR = "AUTH_INVALID";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class AuthService {
  constructor(
    private api: ApiClient,
    private session: Session,
    private useMocks: boolean,
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    if (this.useMocks) return this.mockLogin(input);
    try {
      const res = await this.api.post<LoginResult>("/v1/auth/login", input);
      this.session.login(res.accessToken, res.refreshToken, res.guest);
      return res;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw new Error(AUTH_ERR);
      }
      throw err;
    }
  }

  logout(): void {
    this.session.logout();
  }

  static isAuthError(err: unknown): boolean {
    return err instanceof Error && err.message === AUTH_ERR;
  }

  private async mockLogin(input: LoginInput): Promise<LoginResult> {
    await delay(MOCK_DELAY_MS);
    const codeOk = input.bookingCode ? MOCK_VALID_CODES.includes(input.bookingCode.toUpperCase()) : false;
    const pinOk = input.pin ? MOCK_VALID_PINS.includes(input.pin) : false;
    if (!codeOk && !pinOk) throw new Error(AUTH_ERR);
    const guest: Guest = {
      id: mockBooking.guest.id,
      name: mockBooking.guest.name,
      roomNumber: mockBooking.room.number,
    };
    const result: LoginResult = {
      accessToken: "mock.access." + Math.random().toString(36).slice(2),
      refreshToken: "mock.refresh." + Math.random().toString(36).slice(2),
      expiresIn: 900,
      guest,
    };
    this.session.login(result.accessToken, result.refreshToken, guest);
    return result;
  }
}
