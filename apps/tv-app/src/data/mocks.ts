export interface Booking {
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
}

export const mockBooking: Booking = {
  guestName: "Иван Петров",
  roomNumber: "305",
  checkIn: "2026-08-09",
  checkOut: "2026-08-12",
};

export interface MenuItem {
  id: string;
  name: { ru: string; en: string };
  price: number;
  currency: "RUB";
}

export const mockMenu: MenuItem[] = [
  { id: "m1", name: { ru: "Цезарь с курицей", en: "Chicken Caesar" }, price: 590, currency: "RUB" },
  { id: "m2", name: { ru: "Борщ", en: "Borscht" }, price: 420, currency: "RUB" },
  { id: "m3", name: { ru: "Стейк рибай", en: "Ribeye steak" }, price: 1890, currency: "RUB" },
];
