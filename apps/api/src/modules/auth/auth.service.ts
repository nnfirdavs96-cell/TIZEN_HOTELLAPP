import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Booking } from "../booking/entities/booking.entity";
import { DevicesService } from "../devices/devices.service";
import { REDIS, type RedisClient } from "../redis/redis.module";
import type { LoginResponse, RefreshResponse } from "@hga/shared-types";

interface GuestJwtPayload {
  sub: string;
  bookingId: string;
  roomId: string;
  deviceId: string;
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly devices: DevicesService,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  async login(deviceToken: string | undefined, input: { bookingCode?: string; pin?: string }): Promise<LoginResponse> {
    if (!deviceToken) {
      throw new UnauthorizedException({ code: "DEVICE_UNBOUND", message: "Device token required" });
    }
    const device = await this.devices.byToken(deviceToken);
    if (!device.room) {
      throw new UnauthorizedException({ code: "DEVICE_UNBOUND", message: "Device is not bound to a room" });
    }

    const booking = await this.findBooking(device.room.id, input);
    if (!booking) throw new UnauthorizedException({ code: "AUTH_INVALID", message: "Invalid credentials" });

    return this.issueTokens(booking, device.id);
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    let payload: GuestJwtPayload;
    try {
      payload = this.jwt.verify<GuestJwtPayload>(refreshToken, {
        secret: this.config.get<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException({ code: "AUTH_INVALID", message: "Invalid refresh token" });
    }
    const stored = await this.redis.get(this.refreshKey(payload.sub, payload.jti));
    if (!stored) throw new UnauthorizedException({ code: "AUTH_INVALID", message: "Refresh token revoked" });

    const accessTtl = this.config.get<number>("jwt.accessTtl") ?? 900;
    const accessToken = await this.jwt.signAsync(
      { sub: payload.sub, bookingId: payload.bookingId, roomId: payload.roomId, deviceId: payload.deviceId, jti: payload.jti },
      { secret: this.config.get<string>("jwt.accessSecret"), expiresIn: accessTtl },
    );
    return { accessToken, expiresIn: accessTtl };
  }

  async logoutBooking(bookingId: string): Promise<void> {
    const keys = await this.redis.keys(`hga:refresh:${bookingId}:*`);
    if (keys.length > 0) await this.redis.del(keys);
  }

  private async findBooking(roomId: string, input: { bookingCode?: string; pin?: string }): Promise<Booking | null> {
    if (input.bookingCode) {
      const b = await this.bookings.findOne({
        where: { bookingCode: input.bookingCode.toUpperCase(), status: "active" },
        relations: ["room", "guest"],
      });
      if (!b || b.room.id !== roomId) return null;
      return b;
    }
    if (input.pin) {
      const candidates = await this.bookings.find({
        where: { room: { id: roomId }, status: "active" },
        relations: ["room", "guest"],
      });
      for (const b of candidates) {
        if (await bcrypt.compare(input.pin, b.pinHash)) return b;
      }
    }
    return null;
  }

  private async issueTokens(booking: Booking, deviceId: string): Promise<LoginResponse> {
    const accessTtl = this.config.get<number>("jwt.accessTtl") ?? 900;
    const refreshTtl = this.config.get<number>("jwt.refreshTtl") ?? 2592000;
    const jti = randomUUID();
    const base: GuestJwtPayload = {
      sub: booking.guest.id,
      bookingId: booking.id,
      roomId: booking.room.id,
      deviceId,
      jti,
    };
    const accessToken = await this.jwt.signAsync(base, {
      secret: this.config.get<string>("jwt.accessSecret"),
      expiresIn: accessTtl,
    });
    const refreshToken = await this.jwt.signAsync(base, {
      secret: this.config.get<string>("jwt.refreshSecret"),
      expiresIn: refreshTtl,
    });
    await this.redis.set(this.refreshKey(booking.id, jti), "1", "EX", refreshTtl);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      guest: {
        id: booking.guest.id,
        name: booking.guest.name,
        roomNumber: booking.room.number,
      },
    };
  }

  private refreshKey(bookingId: string, jti: string): string {
    return `hga:refresh:${bookingId}:${jti}`;
  }
}
