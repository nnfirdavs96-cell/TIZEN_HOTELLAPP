import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export interface AuthedRequest extends Request {
  auth: {
    guestId: string;
    bookingId: string;
    roomId: string;
    deviceId: string;
    jti: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "AUTH_INVALID", message: "Missing bearer token" });
    }
    const token = header.slice(7);
    try {
      const payload = this.jwt.verify<{ sub: string; bookingId: string; roomId: string; deviceId: string; jti: string }>(token, {
        secret: this.config.get<string>("jwt.accessSecret"),
      });
      req.auth = {
        guestId: payload.sub,
        bookingId: payload.bookingId,
        roomId: payload.roomId,
        deviceId: payload.deviceId,
        jti: payload.jti,
      };
      return true;
    } catch {
      throw new UnauthorizedException({ code: "AUTH_INVALID", message: "Invalid or expired access token" });
    }
  }
}
