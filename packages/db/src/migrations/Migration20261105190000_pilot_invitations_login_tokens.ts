import { Migration } from '@mikro-orm/migrations';

export class Migration20261105190000_pilot_invitations_login_tokens extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "invitations" (
      "id" uuid not null,
      "email" varchar(255) not null,
      "display_name" varchar(255) not null,
      "role" varchar(255) not null,
      "invited_by" uuid null,
      "accepted_by_user_id" uuid null,
      "accepted_at" timestamptz null,
      "revoked_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "invitations_pkey" primary key ("id"),
      constraint "invitations_email_lowercase_check" check ("email" = lower("email")),
      constraint "invitations_role_check" check ("role" in ('seeker', 'mentor')),
      constraint "invitations_acceptance_check" check (
        ("accepted_by_user_id" is null and "accepted_at" is null)
        or ("accepted_by_user_id" is not null and "accepted_at" is not null)
      ),
      constraint "invitations_invited_by_fkey" foreign key ("invited_by") references "users" ("id") on delete set null,
      constraint "invitations_accepted_by_user_id_fkey" foreign key ("accepted_by_user_id") references "users" ("id") on delete cascade
    );`);
    this.addSql(`alter table "invitations" add constraint "invitations_email_unique" unique ("email");`);

    this.addSql(`create table "login_tokens" (
      "id" uuid not null,
      "email" varchar(255) not null,
      "token_hash" varchar(64) not null,
      "expires_at" timestamptz not null,
      "consumed_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "login_tokens_pkey" primary key ("id"),
      constraint "login_tokens_email_lowercase_check" check ("email" = lower("email")),
      constraint "login_tokens_token_hash_check" check ("token_hash" ~ '^[0-9a-f]{64}$')
    );`);
    this.addSql(`alter table "login_tokens" add constraint "login_tokens_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create index "login_tokens_expires_at_index" on "login_tokens" ("expires_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "login_tokens" cascade;`);
    this.addSql(`drop table if exists "invitations" cascade;`);
  }
}
