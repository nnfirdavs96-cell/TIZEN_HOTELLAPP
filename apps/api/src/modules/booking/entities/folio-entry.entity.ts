import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Booking } from "./booking.entity";

export type FolioSource = "stay" | "food" | "shop" | "taxi" | "other";

@Entity({ name: "folio_entries" })
export class FolioEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Booking, { onDelete: "CASCADE" })
  @JoinColumn({ name: "booking_id" })
  booking: Booking;

  @Column({ length: 16 })
  source: FolioSource;

  @Column({ length: 256 })
  description: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 8, default: "RUB" })
  currency: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
