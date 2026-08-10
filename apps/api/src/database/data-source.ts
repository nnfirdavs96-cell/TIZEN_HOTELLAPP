import "reflect-metadata";
import { DataSource } from "typeorm";
import { config as loadEnv } from "dotenv";
import { Room } from "../modules/booking/entities/room.entity";
import { Guest } from "../modules/booking/entities/guest.entity";
import { Booking } from "../modules/booking/entities/booking.entity";
import { FolioEntry } from "../modules/booking/entities/folio-entry.entity";
import { Invoice } from "../modules/booking/entities/invoice.entity";
import { Device } from "../modules/devices/entities/device.entity";

loadEnv();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL ?? "postgres://hga:hga@localhost:5432/hga",
  entities: [Room, Guest, Booking, FolioEntry, Invoice, Device],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
});
