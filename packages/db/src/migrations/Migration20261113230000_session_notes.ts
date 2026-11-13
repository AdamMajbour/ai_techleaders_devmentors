import { Migration } from '@mikro-orm/migrations';

export class Migration20261113230000_session_notes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "session_notes" ("id" uuid not null, "session_id" uuid not null, "mentor_id" uuid not null, "seeker_id" uuid not null, "title" varchar(255) not null, "content" text not null, "seeker_approved_at" timestamptz null, "withdrawn_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "session_notes_pkey" primary key ("id"));`);
    this.addSql(`create index "session_notes_session_id_index" on "session_notes" ("session_id");`);
    this.addSql(`create index "session_notes_mentor_id_index" on "session_notes" ("mentor_id");`);
    this.addSql(`create index "session_notes_seeker_id_index" on "session_notes" ("seeker_id");`);
  }
  override async down(): Promise<void> {
    this.addSql(`drop table if exists "session_notes" cascade;`);
  }
}
