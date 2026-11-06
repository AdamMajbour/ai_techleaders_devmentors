import { Migration } from '@mikro-orm/migrations';

export class Migration20261106090000_messages extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "messages" (
      "id" uuid not null,
      "booking_id" uuid not null,
      "author_id" uuid not null,
      "body" text not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "messages_pkey" primary key ("id"),
      constraint "messages_booking_id_foreign" foreign key ("booking_id") references "bookings" ("id") on update cascade on delete cascade,
      constraint "messages_author_id_foreign" foreign key ("author_id") references "users" ("id") on update cascade on delete restrict,
      constraint "messages_body_length_check" check (char_length("body") between 1 and 2000)
    );`);
    this.addSql(`create index "messages_booking_created_id_index" on "messages" ("booking_id", "created_at", "id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "messages" cascade;`);
  }
}
