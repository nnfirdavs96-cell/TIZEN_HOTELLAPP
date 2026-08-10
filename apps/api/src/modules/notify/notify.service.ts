import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface InvoiceEmail {
  to: string;
  invoiceId: string;
  total: string;
  currency: string;
  guestName: string;
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger("Notify");

  constructor(private readonly config: ConfigService) {}

  async sendInvoice(input: InvoiceEmail): Promise<void> {
    const provider = this.config.get<string>("email.provider") ?? "console";
    const from = this.config.get<string>("email.from") ?? "noreply@hotel.local";

    if (provider === "console") {
      this.logger.log(
        `[email→${input.to}] from=${from} invoice=${input.invoiceId} total=${input.total} ${input.currency} guest="${input.guestName}"`,
      );
      return;
    }

    // Placeholders for real providers (SMTP/SendGrid) — implemented when the hotel picks one.
    this.logger.warn(`Unknown email provider "${provider}", falling back to log-only`);
    this.logger.log(
      `[email→${input.to}] invoice=${input.invoiceId} total=${input.total} ${input.currency}`,
    );
  }
}
