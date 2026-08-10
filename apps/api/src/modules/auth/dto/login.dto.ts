import { IsOptional, IsString, Length, ValidateIf } from "class-validator";

export class LoginRequestDto {
  @ValidateIf((o) => !o.pin)
  @IsString()
  @Length(6, 32)
  bookingCode?: string;

  @ValidateIf((o) => !o.bookingCode)
  @IsString()
  @Length(4, 4)
  pin?: string;
}

export class RefreshRequestDto {
  @IsString()
  refreshToken: string;
}
