export type Currency = "RUB" | "USD" | "EUR";

export interface Money {
  amount: string;
  currency: Currency;
}
