import { Migration } from '@mikro-orm/migrations';

export class Migration20261110120000_mentor_availability_slots extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "mentor_availability_slots" (
      "id" uuid not null default gen_random_uuid(),
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "mentor_id" uuid not null,
      "starts_at" timestamptz not null,
      "ends_at" timestamptz not null,
      "status" varchar(255) not null default 'open',
      "booking_id" uuid null,
      constraint "mentor_availability_slots_pkey" primary key ("id"),
      constraint "mentor_availability_slots_time_check" check (
        "ends_at" = "starts_at" + interval '25 minutes'
      ),
      constraint "mentor_availability_slots_status_check" check (
        "status" in ('open', 'reserved', 'cancelled')
      ),
      constraint "mentor_availability_slots_booking_check" check (
        ("status" = 'reserved' and "booking_id" is not null)
        or ("status" <> 'reserved' and "booking_id" is null)
      )
    );`);
    this.addSql('create unique index "mentor_availability_slots_mentor_start_unique" on "mentor_availability_slots" ("mentor_id", "starts_at") where "status" <> \'cancelled\';');
    this.addSql(`alter table "mentor_availability_slots"
      add constraint "mentor_availability_slots_no_overlap"
      exclude using gist (
        "mentor_id" with =,
        tstzrange("starts_at", "ends_at") with &&
      ) where ("status" <> 'cancelled');`);
    this.addSql(`alter table "bookings" add column "availability_slot_id" uuid null;`);
    this.addSql('create unique index "bookings_availability_slot_unique" on "bookings" ("availability_slot_id") where "availability_slot_id" is not null;');
    this.addSql('create index "mentor_availability_slots_open_lookup" on "mentor_availability_slots" ("mentor_id", "starts_at") where "status" = \'open\';');
    this.addSql(`create function "release_booking_availability_slot"() returns trigger as $$
      begin
        if new.status in ('payment_failed', 'declined', 'expired') and old.status is distinct from new.status then
          update "mentor_availability_slots"
          set "status" = 'open', "booking_id" = null, "updated_at" = now()
          where "booking_id" = new.id and "status" = 'reserved';
        end if;
        return new;
      end;
    $$ language plpgsql;`);
    this.addSql(`create trigger "bookings_release_availability_slot"
      after update of "status" on "bookings"
      for each row execute function "release_booking_availability_slot"();`);
  }

  override async down(): Promise<void> {
    this.addSql('drop trigger if exists "bookings_release_availability_slot" on "bookings";');
    this.addSql('drop function if exists "release_booking_availability_slot"();');
    this.addSql('alter table "mentor_availability_slots" drop constraint if exists "mentor_availability_slots_no_overlap";');
    this.addSql('drop index if exists "mentor_availability_slots_open_lookup";');
    this.addSql('drop index if exists "bookings_availability_slot_unique";');
    this.addSql('alter table "bookings" drop column if exists "availability_slot_id";');
    this.addSql('drop table if exists "mentor_availability_slots";');
  }
}
