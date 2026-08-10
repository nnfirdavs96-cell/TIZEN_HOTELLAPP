import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Device } from "./entities/device.entity";
import { Room } from "../booking/entities/room.entity";
import { DevicesService } from "./devices.service";
import { DevicesController } from "./devices.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Device, Room])],
  providers: [DevicesService],
  controllers: [DevicesController],
  exports: [DevicesService],
})
export class DevicesModule {}
