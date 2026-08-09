export interface Money {
  amount: string;
  currency: "RUB";
}

export interface Booking {
  id: string;
  guest: { id: string; name: string; email: string };
  room: { id: string; number: string };
  checkIn: string;
  checkOut: string;
  guests: number;
  tariff: string;
  includedServices: string[];
  totalAmount: Money;
}

export interface FolioEntry {
  id: string;
  source: "food" | "shop" | "taxi" | "stay" | "other";
  description: string;
  createdAt: string;
  amount: Money;
}

export interface Folio {
  entries: FolioEntry[];
  total: Money;
}

export interface MenuItem {
  id: string;
  name: { ru: string; en: string };
  price: Money;
}

export const mockBooking: Booking = {
  id: "bk-2026-08-305",
  guest: { id: "g-1", name: "Иван Петров", email: "guest@example.com" },
  room: { id: "r-305", number: "305" },
  checkIn: "2026-08-09",
  checkOut: "2026-08-12",
  guests: 2,
  tariff: "Стандарт · завтрак включён",
  includedServices: ["Wi-Fi", "Завтрак", "Спа-зона"],
  totalAmount: { amount: "24500.00", currency: "RUB" },
};

export const mockFolio: Folio = {
  entries: [
    {
      id: "f1",
      source: "stay",
      description: "Проживание · 3 ночи × 6500 ₽",
      createdAt: "2026-08-09T14:00:00Z",
      amount: { amount: "19500.00", currency: "RUB" },
    },
    {
      id: "f2",
      source: "food",
      description: "Room service · Цезарь с курицей",
      createdAt: "2026-08-09T20:15:00Z",
      amount: { amount: "590.00", currency: "RUB" },
    },
    {
      id: "f3",
      source: "food",
      description: "Мини-бар · Вода 0.5 л ×2",
      createdAt: "2026-08-10T09:30:00Z",
      amount: { amount: "200.00", currency: "RUB" },
    },
    {
      id: "f4",
      source: "taxi",
      description: "Такси до аэропорта",
      createdAt: "2026-08-11T07:45:00Z",
      amount: { amount: "1450.00", currency: "RUB" },
    },
    {
      id: "f5",
      source: "shop",
      description: "Магазин отеля · сувениры",
      createdAt: "2026-08-11T18:00:00Z",
      amount: { amount: "2760.00", currency: "RUB" },
    },
  ],
  total: { amount: "24500.00", currency: "RUB" },
};

export const mockMenu: MenuItem[] = [
  { id: "m1", name: { ru: "Цезарь с курицей", en: "Chicken Caesar" }, price: { amount: "590.00", currency: "RUB" } },
  { id: "m2", name: { ru: "Борщ", en: "Borscht" }, price: { amount: "420.00", currency: "RUB" } },
  { id: "m3", name: { ru: "Стейк рибай", en: "Ribeye steak" }, price: { amount: "1890.00", currency: "RUB" } },
];

export const MOCK_VALID_CODES = ["ABC123", "GUEST01"];
export const MOCK_VALID_PINS = ["4821", "1234"];
