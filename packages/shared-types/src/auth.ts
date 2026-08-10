import type { GuestDto } from "./booking.js";

export interface LoginRequest {
  bookingCode?: string;
  pin?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  guest: {
    id: string;
    name: string;
    roomNumber: string;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface JwtGuestPayload {
  sub: string;
  bookingId: string;
  roomId: string;
  deviceId: string;
  iat: number;
  exp: number;
}

export type { GuestDto };
