import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "guests" })
export class Guest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 128, nullable: true })
  email: string | null;
}
