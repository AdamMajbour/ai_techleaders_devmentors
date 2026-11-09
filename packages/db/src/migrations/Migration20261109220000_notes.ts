import { Migration } from '@mikro-orm/migrations';

export class Migration20261109220000_notes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "notes" (
      "id" uuid not null,
      "mentor_id" uuid not null,
      "title" varchar(120) not null,
      "body" text not null,
      "status" varchar(20) not null default 'draft',
      "ai_notice_version" varchar(100) null,
      "ai_consented_at" timestamptz null,
      "published_at" timestamptz null,
      "taken_down_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "notes_pkey" primary key ("id"),
      constraint "notes_status_check" check ("status" in ('draft', 'published', 'taken_down')),
      constraint "notes_body_length_check" check (char_length("body") between 1 and 20000),
      constraint "notes_published_consent_check" check ("status" <> 'published' or ("ai_notice_version" is not null and "ai_consented_at" is not null))
    );`);
    this.addSql('create index "notes_mentor_status_idx" on "notes" ("mentor_id", "status");');
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "notes" cascade;');
  }
}
