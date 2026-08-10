import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Room } from "./room.entity";
import { Guest } from "./guest.entity";

export type BookingStatus = "active" | "closed";

@Entity({ name: "bookings" })
@Index(["room", "status"])
export class Booking {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Room, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "room_id" })
  room: Room;

  @ManyToOne(() => Guest, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "guest_id" })
  guest: Guest;

  @Column({ length: 32, unique: true })
  bookingCode: string;

  @Column({ length: 4 })
  pinHash: string;

  @Column({ type: "date" })
  checkIn: string;

  @Column({ type: "date" })
  checkOut: string;

  @Column({ type: "int", default: 1 })
  guests: number;

  @Column({ length: 128, default: "Стандарт" })
  tariff: string;

  @Column({ type: "simple-array", default: "" })
  includedServices: string[];

  @Column({ length: 8, default: "RUB" })
  currency: string;

  @Column({ length: 16, default: "active" })
  status: BookingStatus;
}
