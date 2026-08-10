import "reflect-metadata";
import * as bcrypt from "bcryptjs";
import { AppDataSource } from "../database/data-source";
import { Room } from "../modules/booking/entities/room.entity";
import { Guest } from "../modules/booking/entities/guest.entity";
import { Booking } from "../modules/booking/entities/booking.entity";
import { FolioEntry } from "../modules/booking/entities/folio-entry.entity";

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const rooms = AppDataSource.getRepository(Room);
  const guests = AppDataSource.getRepository(Guest);
  const bookings = AppDataSource.getRepository(Booking);
  const folio = AppDataSource.getRepository(FolioEntry);

  const room = rooms.create({ number: "305", category: "standard", language: "ru" });
  await rooms.save(room);

  const guest = guests.create({ name: "Иван Петров", email: "guest@example.com" });
  await guests.save(guest);

  const pinHash = await bcrypt.hash("4821", 8);
  const booking = bookings.create({
    room,
    guest,
    bookingCode: "ABC123",
    pinHash,
    checkIn: "2026-08-09",
    checkOut: "2026-08-12",
    guests: 2,
    tariff: "Стандарт · завтрак включён",
    includedServices: ["Wi-Fi", "Завтрак", "Спа-зона"],
    currency: "RUB",
    status: "active",
  });
  await bookings.save(booking);

  const entries: Array<Partial<FolioEntry>> = [
    { booking, source: "stay", description: "Проживание · 3 ночи × 6500 ₽", amount: "19500.00" },
    { booking, source: "food", description: "Room service · Цезарь с курицей", amount: "590.00" },
    { booking, source: "food", description: "Мини-бар · Вода 0.5 л ×2", amount: "200.00" },
    { booking, source: "taxi", description: "Такси до аэропорта", amount: "1450.00" },
    { booking, source: "shop", description: "Магазин отеля · сувениры", amount: "2760.00" },
  ];
  for (const e of entries) await folio.save(folio.create(e));

  // eslint-disable-next-line no-console
  console.log(`Seeded room ${room.number}, booking ${booking.bookingCode} (PIN 4821)`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
