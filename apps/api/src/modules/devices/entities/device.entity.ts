import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Room } from "../../booking/entities/room.entity";

@Entity({ name: "devices" })
export class Device {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 128, unique: true })
  @Index()
  tokenHash: string;

  @ManyToOne(() => Room, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "room_id" })
  room: Room | null;

  @Column({ length: 128, nullable: true })
  tizenModel: string | null;

  @Column({ type: "boolean", default: false })
  webrtc: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
