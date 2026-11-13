import { Migration } from '@mikro-orm/migrations';

export class Migration20261105210000_booking_overlap extends Migration {
  override async up(): Promise<void> {
    this.addSql('create extension if not exists "btree_gist";');
    this.addSql(`alter table "bookings"
      add constraint "bookings_accepted_mentor_time_excl"
      exclude using gist (
        "mentor_id" with =,
        tstzrange("starts_at", "ends_at") with &&
      )
      where ("status" = 'accepted');`);
  }

  override async down(): Promise<void> {
    this.addSql('alter table "bookings" drop constraint if exists "bookings_accepted_mentor_time_excl";');
  }
}
