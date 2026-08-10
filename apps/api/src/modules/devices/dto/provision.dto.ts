import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ProvisionRequestDto {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  provisionCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  tizenModel?: string;

  @IsOptional()
  capabilities?: { webrtc?: boolean };
}

export class BindRequestDto {
  @IsString()
  deviceId: string;

  @IsString()
  @MaxLength(16)
  roomNumber: string;
}

export class BindResponseWebrtc {
  @IsBoolean()
  webrtc: boolean;
}
