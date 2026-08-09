import type { ApiClient } from "../core/api-client";
import type { Session } from "../core/session";
import type { Booking, Folio } from "../data/mocks";
import { mockBooking, mockFolio } from "../data/mocks";

const MOCK_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface CheckoutResult {
  invoiceId: string;
  status: "sent" | "failed";
}

export class BookingService {
  constructor(
    private api: ApiClient,
    private session: Session,
    private useMocks: boolean,
  ) {}

  async getCurrent(): Promise<Booking> {
    if (this.useMocks) {
      await delay(MOCK_DELAY_MS);
      return mockBooking;
    }
    const res = await this.api.get<{ booking: Booking }>("/v1/booking/current", { cacheKey: "booking.current" });
    return res.data.booking;
  }

  async getFolio(): Promise<Folio> {
    if (this.useMocks) {
      await delay(MOCK_DELAY_MS);
      return mockFolio;
    }
    const res = await this.api.get<Folio>("/v1/booking/folio", { cacheKey: "booking.folio" });
    return res.data;
  }

  async checkout(email: string): Promise<CheckoutResult> {
    if (this.useMocks) {
      await delay(MOCK_DELAY_MS * 2);
      this.session.logout();
      return { invoiceId: "inv-" + Date.now().toString(36), status: "sent" };
    }
    const res = await this.api.post<CheckoutResult>("/v1/booking/checkout", { email });
    if (res.status === "sent") this.session.logout();
    return res;
  }
}
