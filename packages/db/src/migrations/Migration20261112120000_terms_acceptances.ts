import { Migration } from '@mikro-orm/migrations';

export class Migration20261112120000_terms_acceptances extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "terms_versions" (
      "id" uuid not null,
      "kind" varchar(16) not null,
      "version" varchar(64) not null,
      "body" text not null,
      "sha256" varchar(64) not null,
      "status" varchar(16) not null default 'draft',
      "published_at" timestamptz null,
      "created_by" uuid not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "terms_versions_pkey" primary key ("id"),
      constraint "terms_versions_created_by_fk" foreign key ("created_by") references "users" ("id") on delete restrict,
      constraint "terms_versions_kind_check" check ("kind" in ('seeker', 'mentor')),
      constraint "terms_versions_status_check" check ("status" in ('draft', 'published', 'archived')),
      constraint "terms_versions_kind_version_unique" unique ("kind", "version"),
      constraint "terms_versions_sha256_format_check" check ("sha256" ~ '^[0-9a-f]{64}$')
    );`);
    this.addSql(`create unique index "terms_versions_one_published_kind" on "terms_versions" ("kind") where "status" = 'published';`);
    this.addSql(`create table "terms_reviews" (
      "id" uuid not null,
      "terms_version_id" uuid not null,
      "sha256" varchar(64) not null,
      "reviewer" varchar(255) not null,
      "scopes" jsonb not null,
      "outcome" varchar(16) not null,
      "reviewed_at" timestamptz not null,
      "note" varchar(1000) null,
      "recorded_by" uuid not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "terms_reviews_pkey" primary key ("id"),
      constraint "terms_reviews_version_fk" foreign key ("terms_version_id") references "terms_versions" ("id") on delete restrict,
      constraint "terms_reviews_recorded_by_fk" foreign key ("recorded_by") references "users" ("id") on delete restrict,
      constraint "terms_reviews_outcome_check" check ("outcome" in ('pass', 'fail'))
    );`);
    this.addSql(`create index "terms_reviews_version_digest_index" on "terms_reviews" ("terms_version_id", "sha256", "reviewed_at" desc);`);
    this.addSql(`create table "terms_acceptances" (
      "id" uuid not null,
      "user_id" uuid not null,
      "terms_version_id" uuid not null,
      "sha256" varchar(64) not null,
      "kind" varchar(16) not null,
      "accepted_at" timestamptz not null,
      "subject_type" varchar(32) null,
      "subject_id" uuid null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "terms_acceptances_pkey" primary key ("id"),
      constraint "terms_acceptances_user_fk" foreign key ("user_id") references "users" ("id") on delete restrict,
      constraint "terms_acceptances_version_fk" foreign key ("terms_version_id") references "terms_versions" ("id") on delete restrict,
      constraint "terms_acceptances_kind_check" check ("kind" in ('seeker', 'mentor')),
      constraint "terms_acceptances_subject_check" check (("subject_type" is null) = ("subject_id" is null)),
      constraint "terms_acceptances_subject_type_check" check ("subject_type" is null or "subject_type" in ('booking', 'vault_answer')),
      constraint "terms_acceptances_user_version_subject_unique" unique nulls not distinct ("user_id", "terms_version_id", "subject_type", "subject_id")
    );`);
    this.addSql(`create index "terms_acceptances_user_kind_index" on "terms_acceptances" ("user_id", "kind", "accepted_at" desc);`);
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "terms_acceptances" cascade;');
    this.addSql('drop table if exists "terms_reviews" cascade;');
    this.addSql('drop table if exists "terms_versions" cascade;');
  }
}
