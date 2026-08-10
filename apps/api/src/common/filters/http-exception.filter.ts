import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "node:crypto";

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const traceId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = { code: "INTERNAL", message: "Internal server error" };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === "string") {
        body = { code: resp, message: resp };
      } else if (typeof resp === "object" && resp !== null) {
        const r = resp as Record<string, unknown>;
        const message = typeof r.message === "string" ? r.message : Array.isArray(r.message) ? r.message.join(", ") : "Error";
        const code = typeof r.code === "string" ? r.code : mapStatusToCode(status);
        body = { code, message, details: r.details };
      }
    } else if (exception instanceof Error) {
      this.logger.error(`${req.method} ${req.url} ${exception.message}`, exception.stack);
    }

    res.status(status).json({ error: { ...body, traceId } });
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return "VALIDATION";
    case 401:
      return "AUTH_INVALID";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "BUSINESS_RULE";
    default:
      return status >= 500 ? "INTERNAL" : "ERROR";
  }
}
