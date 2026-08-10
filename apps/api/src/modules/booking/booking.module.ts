import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Booking } from "./entities/booking.entity";
import { FolioEntry } from "./entities/folio-entry.entity";
import { Invoice } from "./entities/invoice.entity";
import { Room } from "./entities/room.entity";
import { Guest } from "./entities/guest.entity";
import { BookingService } from "./booking.service";
import { BookingController } from "./booking.controller";
import { AuthModule } from "../auth/auth.module";
import { NotifyModule } from "../notify/notify.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, FolioEntry, Invoice, Room, Guest]),
    AuthModule,
    NotifyModule,
  ],
  providers: [BookingService],
  controllers: [BookingController],
})
export class BookingModule {}
