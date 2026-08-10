import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Booking } from "./booking.entity";

@Entity({ name: "invoices" })
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Booking, { onDelete: "CASCADE" })
  @JoinColumn({ name: "booking_id" })
  booking: Booking;

  @Column({ length: 128 })
  email: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  total: string;

  @Column({ length: 8, default: "RUB" })
  currency: string;

  @Column({ length: 16, default: "sent" })
  status: "sent" | "failed";

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
