export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    traceId?: string;
  };
}

export const ERROR_CODES = {
  AUTH_INVALID: "AUTH_INVALID",
  AUTH_LOCKED: "AUTH_LOCKED",
  DEVICE_UNKNOWN: "DEVICE_UNKNOWN",
  DEVICE_UNBOUND: "DEVICE_UNBOUND",
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
  BOOKING_CLOSED: "BOOKING_CLOSED",
  VALIDATION: "VALIDATION",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
