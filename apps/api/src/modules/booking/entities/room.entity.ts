import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "rooms" })
export class Room {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 16, unique: true })
  number: string;

  @Column({ length: 32, default: "standard" })
  category: string;

  @Column({ length: 8, default: "ru" })
  language: string;
}
