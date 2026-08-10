import { Body, Controller, Headers, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginRequestDto, RefreshRequestDto } from "./dto/login.dto";
import type { LoginResponse, RefreshResponse } from "@hga/shared-types";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  login(@Body() body: LoginRequestDto, @Headers("x-device-token") deviceToken?: string): Promise<LoginResponse> {
    return this.auth.login(deviceToken, body);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() body: RefreshRequestDto): Promise<RefreshResponse> {
    return this.auth.refresh(body.refreshToken);
  }
}
