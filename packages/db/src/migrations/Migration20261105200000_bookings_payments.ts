import { Migration } from '@mikro-orm/migrations';

export class Migration20261105200000_bookings_payments extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "bookings" (
      "id" uuid not null,
      "seeker_id" uuid not null,
      "mentor_id" uuid not null,
      "question" text not null,
      "duration_minutes" integer not null default 25,
      "price_minor" integer not null,
      "currency" varchar(255) not null,
      "status" varchar(255) not null,
      "source" varchar(255) not null,
      "landed_at" timestamptz not null,
      "starts_at" timestamptz null,
      "ends_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "bookings_pkey" primary key ("id"),
      constraint "bookings_seeker_id_foreign" foreign key ("seeker_id") references "users" ("id") on update cascade on delete restrict,
      constraint "bookings_mentor_id_foreign" foreign key ("mentor_id") references "mentor_profiles" ("user_id") on update cascade on delete restrict,
      constraint "bookings_question_length_check" check (char_length("question") <= 4000),
      constraint "bookings_duration_minutes_check" check ("duration_minutes" = 25),
      constraint "bookings_price_minor_check" check ("price_minor" > 0),
      constraint "bookings_currency_check" check ("currency" ~ '^[A-Z]{3}$'),
      constraint "bookings_status_check" check ("status" in ('pending_payment', 'payment_failed', 'paid', 'accepted', 'declined', 'expired')),
      constraint "bookings_source_check" check ("source" in ('link', 'list')),
      constraint "bookings_session_times_check" check (
        ("starts_at" is null and "ends_at" is null)
        or ("starts_at" is not null and "ends_at" is not null and "ends_at" > "starts_at")
      )
    );`);
    this.addSql(`create index "bookings_mentor_status_index" on "bookings" ("mentor_id", "status");`);
    this.addSql(`create index "bookings_seeker_id_index" on "bookings" ("seeker_id");`);

    this.addSql(`create table "payments" (
      "id" uuid not null,
      "booking_id" uuid not null,
      "provider" varchar(255) not null,
      "livemode" boolean not null,
      "provider_session_id" varchar(255) null,
      "provider_payment_id" varchar(255) null,
      "amount_minor" integer not null,
      "currency" varchar(255) not null,
      "status" varchar(255) not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "payments_pkey" primary key ("id"),
      constraint "payments_booking_id_foreign" foreign key ("booking_id") references "bookings" ("id") on update cascade on delete cascade,
      constraint "payments_booking_id_unique" unique ("booking_id"),
      constraint "payments_provider_session_id_unique" unique ("provider_session_id"),
      constraint "payments_provider_check" check (length("provider") > 0),
      constraint "payments_amount_minor_check" check ("amount_minor" > 0),
      constraint "payments_currency_check" check ("currency" ~ '^[A-Z]{3}$'),
      constraint "payments_status_check" check ("status" in ('pending', 'succeeded', 'failed', 'refund_pending', 'refunded'))
    );`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payments" cascade;`);
    this.addSql(`drop table if exists "bookings" cascade;`);
  }
}
