import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Booking } from "./entities/booking.entity";
import { FolioEntry } from "./entities/folio-entry.entity";
import { Invoice } from "./entities/invoice.entity";
import { AuthService } from "../auth/auth.service";
import { NotifyService } from "../notify/notify.service";
import type { BookingDto, FolioDto, CheckoutResponse } from "@hga/shared-types";

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(FolioEntry) private readonly folio: Repository<FolioEntry>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    private readonly ds: DataSource,
    private readonly auth: AuthService,
    private readonly notify: NotifyService,
  ) {}

  async getCurrent(bookingId: string): Promise<BookingDto> {
    const b = await this.bookings.findOne({ where: { id: bookingId }, relations: ["room", "guest"] });
    if (!b) throw new NotFoundException({ code: "BOOKING_NOT_FOUND", message: "Booking not found" });
    const total = await this.computeTotal(bookingId, b.currency);
    return {
      id: b.id,
      guest: { id: b.guest.id, name: b.guest.name, email: b.guest.email ?? "" },
      room: { id: b.room.id, number: b.room.number },
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guests: b.guests,
      tariff: b.tariff,
      includedServices: b.includedServices ?? [],
      totalAmount: { amount: total, currency: b.currency as "RUB" },
    };
  }

  async getFolio(bookingId: string): Promise<FolioDto> {
    const b = await this.bookings.findOne({ where: { id: bookingId } });
    if (!b) throw new NotFoundException({ code: "BOOKING_NOT_FOUND", message: "Booking not found" });
    const entries = await this.folio.find({
      where: { booking: { id: bookingId } },
      order: { createdAt: "ASC" },
    });
    const total = await this.computeTotal(bookingId, b.currency);
    return {
      entries: entries.map((e) => ({
        id: e.id,
        source: e.source,
        description: e.description,
        createdAt: e.createdAt.toISOString(),
        amount: { amount: e.amount, currency: e.currency as "RUB" },
      })),
      total: { amount: total, currency: b.currency as "RUB" },
    };
  }

  async checkout(bookingId: string, email: string): Promise<CheckoutResponse> {
    const b = await this.bookings.findOne({ where: { id: bookingId } });
    if (!b) throw new NotFoundException({ code: "BOOKING_NOT_FOUND", message: "Booking not found" });
    const total = await this.computeTotal(bookingId, b.currency);

    const invoiceId = await this.ds.transaction(async (m) => {
      const invoice = m.create(Invoice, {
        booking: b,
        email,
        total,
        currency: b.currency,
        status: "sent",
      });
      const saved = await m.save(invoice);
      await m.update(Booking, { id: b.id }, { status: "closed" });
      return saved.id;
    });

    await this.notify.sendInvoice({
      to: email,
      invoiceId,
      total,
      currency: b.currency,
      guestName: (await this.bookings.findOne({ where: { id: b.id }, relations: ["guest"] }))?.guest?.name ?? "",
    });

    await this.auth.logoutBooking(b.id);
    return { invoiceId, status: "sent" };
  }

  private async computeTotal(bookingId: string, currency: string): Promise<string> {
    const raw = await this.folio
      .createQueryBuilder("f")
      .select("COALESCE(SUM(f.amount), 0)", "sum")
      .where("f.booking_id = :id", { id: bookingId })
      .andWhere("f.currency = :cur", { cur: currency })
      .getRawOne<{ sum: string }>();
    return raw?.sum ?? "0.00";
  }
}
