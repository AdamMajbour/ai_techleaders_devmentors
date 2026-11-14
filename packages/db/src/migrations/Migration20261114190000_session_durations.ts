import { Migration } from '@mikro-orm/migrations';

export class Migration20261114190000_session_durations extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "mentor_availability_slots" drop constraint "mentor_availability_slots_time_check";');
    this.addSql(`alter table "mentor_availability_slots" add constraint "mentor_availability_slots_time_check" check (
      "ends_at" = "starts_at" + interval '25 minutes'
      or "ends_at" = "starts_at" + interval '50 minutes'
    );`);
    this.addSql('alter table "bookings" drop constraint "bookings_duration_minutes_check";');
    this.addSql('alter table "bookings" add constraint "bookings_duration_minutes_check" check ("duration_minutes" in (25, 50));');
  }

  override async down(): Promise<void> {
    this.addSql(`do $$ begin
      if exists (select 1 from "mentor_availability_slots" where "ends_at" - "starts_at" <> interval '25 minutes') then
        raise exception 'Cannot remove 50-minute availability while those slots exist.';
      end if;
      if exists (select 1 from "bookings" where "duration_minutes" <> 25) then
        raise exception 'Cannot remove 50-minute sessions while bookings of that length exist.';
      end if;
    end $$;`);
    this.addSql('alter table "bookings" drop constraint "bookings_duration_minutes_check";');
    this.addSql('alter table "bookings" add constraint "bookings_duration_minutes_check" check ("duration_minutes" = 25);');
    this.addSql('alter table "mentor_availability_slots" drop constraint "mentor_availability_slots_time_check";');
    this.addSql(`alter table "mentor_availability_slots" add constraint "mentor_availability_slots_time_check" check (
      "ends_at" = "starts_at" + interval '25 minutes'
    );`);
  }
}
