import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1700000000000 implements MigrationInterface {
  name = "InitSchema1700000000000";

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await q.query(`
      CREATE TABLE rooms (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        number varchar(16) NOT NULL UNIQUE,
        category varchar(32) NOT NULL DEFAULT 'standard',
        language varchar(8) NOT NULL DEFAULT 'ru'
      )
    `);

    await q.query(`
      CREATE TABLE guests (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(128) NOT NULL,
        email varchar(128) NULL
      )
    `);

    await q.query(`
      CREATE TABLE bookings (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
        "bookingCode" varchar(32) NOT NULL UNIQUE,
        "pinHash" varchar(4) NOT NULL,
        "checkIn" date NOT NULL,
        "checkOut" date NOT NULL,
        guests int NOT NULL DEFAULT 1,
        tariff varchar(128) NOT NULL DEFAULT 'Стандарт',
        "includedServices" text NOT NULL DEFAULT '',
        currency varchar(8) NOT NULL DEFAULT 'RUB',
        status varchar(16) NOT NULL DEFAULT 'active'
      )
    `);
    await q.query(`CREATE INDEX ix_bookings_room_status ON bookings (room_id, status)`);

    await q.query(`
      CREATE TABLE folio_entries (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        source varchar(16) NOT NULL,
        description varchar(256) NOT NULL,
        amount numeric(12,2) NOT NULL,
        currency varchar(8) NOT NULL DEFAULT 'RUB',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX ix_folio_booking ON folio_entries (booking_id, created_at)`);

    await q.query(`
      CREATE TABLE invoices (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        email varchar(128) NOT NULL,
        total numeric(12,2) NOT NULL,
        currency varchar(8) NOT NULL DEFAULT 'RUB',
        status varchar(16) NOT NULL DEFAULT 'sent',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await q.query(`
      CREATE TABLE devices (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tokenHash" varchar(128) NOT NULL UNIQUE,
        room_id uuid NULL REFERENCES rooms(id) ON DELETE SET NULL,
        "tizenModel" varchar(128) NULL,
        webrtc boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX ix_devices_token ON devices ("tokenHash")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS devices`);
    await q.query(`DROP TABLE IF EXISTS invoices`);
    await q.query(`DROP TABLE IF EXISTS folio_entries`);
    await q.query(`DROP TABLE IF EXISTS bookings`);
    await q.query(`DROP TABLE IF EXISTS guests`);
    await q.query(`DROP TABLE IF EXISTS rooms`);
  }
}
