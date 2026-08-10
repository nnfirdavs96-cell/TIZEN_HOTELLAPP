import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { createHash, randomBytes } from "node:crypto";
import { Device } from "./entities/device.entity";
import { Room } from "../booking/entities/room.entity";
import type { DeviceProvisionResponse, DeviceBindResponse } from "@hga/shared-types";

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device) private readonly devices: Repository<Device>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    private readonly config: ConfigService,
  ) {}

  async provision(input: {
    provisionCode: string;
    tizenModel?: string;
    capabilities?: { webrtc?: boolean };
  }): Promise<DeviceProvisionResponse> {
    const expected = this.config.get<string>("devices.provisionCode");
    if (!expected || input.provisionCode !== expected) {
      throw new UnauthorizedException({ code: "AUTH_INVALID", message: "Invalid provision code" });
    }
    const token = randomBytes(32).toString("base64url");
    const device = this.devices.create({
      tokenHash: sha256(token),
      tizenModel: input.tizenModel ?? null,
      webrtc: !!input.capabilities?.webrtc,
      room: null,
    });
    await this.devices.save(device);
    return { deviceId: device.id, deviceToken: token, roomId: null };
  }

  async bind(deviceId: string, roomNumber: string): Promise<DeviceBindResponse> {
    const device = await this.devices.findOne({ where: { id: deviceId } });
    if (!device) throw new NotFoundException({ code: "DEVICE_UNKNOWN", message: "Device not found" });
    const room = await this.rooms.findOne({ where: { number: roomNumber } });
    if (!room) throw new NotFoundException({ code: "NOT_FOUND", message: `Room ${roomNumber} not found` });
    device.room = room;
    await this.devices.save(device);
    return { roomId: room.id };
  }

  async byToken(token: string): Promise<Device> {
    const hash = sha256(token);
    const device = await this.devices.findOne({ where: { tokenHash: hash }, relations: ["room"] });
    if (!device) throw new UnauthorizedException({ code: "DEVICE_UNKNOWN", message: "Unknown device" });
    return device;
  }

  async listUnbound(): Promise<Device[]> {
    return this.devices.find({ where: { room: IsNull() } });
  }
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
