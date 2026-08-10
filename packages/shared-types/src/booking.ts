import type { Money } from "./money.js";

export interface GuestDto {
  id: string;
  name: string;
  email: string;
}

export interface RoomDto {
  id: string;
  number: string;
}

export interface BookingDto {
  id: string;
  guest: GuestDto;
  room: RoomDto;
  checkIn: string;
  checkOut: string;
  guests: number;
  tariff: string;
  includedServices: string[];
  totalAmount: Money;
}

export type FolioSource = "stay" | "food" | "shop" | "taxi" | "other";

export interface FolioEntryDto {
  id: string;
  source: FolioSource;
  description: string;
  createdAt: string;
  amount: Money;
}

export interface FolioDto {
  entries: FolioEntryDto[];
  total: Money;
}

export interface CheckoutRequest {
  email: string;
}

export interface CheckoutResponse {
  invoiceId: string;
  status: "sent" | "failed";
}
