import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { loadConfig } from "./config/configuration";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { cors: true, logger: ["log", "warn", "error"] });
  app.setGlobalPrefix(config.prefix);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(config.port);
  Logger.log(`API listening on :${config.port}/${config.prefix}`, "Bootstrap");
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
