import { Migration } from '@mikro-orm/migrations';

export class Migration20261112130000_retention_legal_holds extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "retention_legal_holds" (
      "id" uuid not null,
      "content_type" varchar(32) not null,
      "content_id" uuid not null,
      "reason" varchar(2000) not null,
      "created_by" uuid not null,
      "created_at" timestamptz not null,
      constraint "retention_legal_holds_pkey" primary key ("id"),
      constraint "retention_legal_holds_type_check" check ("content_type" in ('message', 'booking_question', 'note', 'vault_question', 'vault_answer', 'citation')),
      constraint "retention_legal_holds_reason_check" check (length(trim("reason")) > 0),
      constraint "retention_legal_holds_creator_fk" foreign key ("created_by") references "users" ("id") on delete restrict
    );`);
    this.addSql(`create index "retention_legal_holds_content_index" on "retention_legal_holds" ("content_type", "content_id", "created_at" desc);`);
    this.addSql(`create table "retention_legal_hold_releases" (
      "id" uuid not null,
      "hold_id" uuid not null,
      "reason" varchar(2000) not null,
      "released_by" uuid not null,
      "released_at" timestamptz not null,
      constraint "retention_legal_hold_releases_pkey" primary key ("id"),
      constraint "retention_legal_hold_releases_hold_unique" unique ("hold_id"),
      constraint "retention_legal_hold_releases_reason_check" check (length(trim("reason")) > 0),
      constraint "retention_legal_hold_releases_hold_fk" foreign key ("hold_id") references "retention_legal_holds" ("id") on delete restrict,
      constraint "retention_legal_hold_releases_releaser_fk" foreign key ("released_by") references "users" ("id") on delete restrict
    );`);
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "retention_legal_hold_releases" cascade;');
    this.addSql('drop table if exists "retention_legal_holds" cascade;');
  }
}
