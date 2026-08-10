import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { loadConfig } from "./config/configuration";
import { HealthController } from "./health/health.controller";
import { DevicesModule } from "./modules/devices/devices.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingModule } from "./modules/booking/booking.module";
import { NotifyModule } from "./modules/notify/notify.module";
import { RedisModule } from "./modules/redis/redis.module";
import { Room } from "./modules/booking/entities/room.entity";
import { Guest } from "./modules/booking/entities/guest.entity";
import { Booking } from "./modules/booking/entities/booking.entity";
import { FolioEntry } from "./modules/booking/entities/folio-entry.entity";
import { Invoice } from "./modules/booking/entities/invoice.entity";
import { Device } from "./modules/devices/entities/device.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL ?? "postgres://hga:hga@localhost:5432/hga",
      entities: [Room, Guest, Booking, FolioEntry, Invoice, Device],
      migrations: ["dist/database/migrations/*.js"],
      migrationsRun: false,
      autoLoadEntities: true,
      synchronize: false,
    }),
    RedisModule,
    DevicesModule,
    AuthModule,
    BookingModule,
    NotifyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
