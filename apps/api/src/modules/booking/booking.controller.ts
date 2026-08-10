import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { BookingService } from "./booking.service";
import { CheckoutRequestDto } from "./dto/checkout.dto";
import { JwtAuthGuard, type AuthedRequest } from "../../common/guards/jwt-auth.guard";
import type { BookingDto, CheckoutResponse, FolioDto } from "@hga/shared-types";

@Controller("booking")
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get("current")
  current(@Req() req: AuthedRequest): Promise<{ booking: BookingDto }> {
    return this.booking.getCurrent(req.auth.bookingId).then((booking) => ({ booking }));
  }

  @Get("folio")
  folio(@Req() req: AuthedRequest): Promise<FolioDto> {
    return this.booking.getFolio(req.auth.bookingId);
  }

  @Post("checkout")
  @HttpCode(200)
  checkout(@Req() req: AuthedRequest, @Body() body: CheckoutRequestDto): Promise<CheckoutResponse> {
    return this.booking.checkout(req.auth.bookingId, body.email);
  }
}
