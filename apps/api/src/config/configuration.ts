export interface AppConfig {
  port: number;
  prefix: string;
  db: { url: string };
  redis: { url: string };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
  };
  devices: { provisionCode: string };
  email: { provider: string; from: string };
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.API_PORT ?? 3000),
    prefix: process.env.API_PREFIX ?? "v1",
    db: {
      url: process.env.DATABASE_URL ?? "postgres://hga:hga@localhost:5432/hga",
    },
    redis: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
      accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
      refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2592000),
    },
    devices: { provisionCode: process.env.PROVISION_CODE ?? "HOTEL-SETUP-CODE" },
    email: {
      provider: process.env.EMAIL_PROVIDER ?? "console",
      from: process.env.EMAIL_FROM ?? "noreply@hotel.local",
    },
  };
}
