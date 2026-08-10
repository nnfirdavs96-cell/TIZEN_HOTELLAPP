import { IsEmail } from "class-validator";

export class CheckoutRequestDto {
  @IsEmail()
  email: string;
}
