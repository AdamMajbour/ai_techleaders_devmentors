import { Migration } from '@mikro-orm/migrations';

export class Migration20261115100000_mentor_invitation_batches extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "invitation_batches" (
      "id" uuid not null default gen_random_uuid(),
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "number" integer not null,
      "opened_by" uuid not null,
      "opened_at" timestamptz not null,
      "closed_at" timestamptz null,
      "resumed_at" timestamptz null,
      "resumed_by" uuid null,
      constraint "invitation_batches_pkey" primary key ("id"),
      constraint "invitation_batches_number_unique" unique ("number"),
      constraint "invitation_batches_opened_by_fkey" foreign key ("opened_by") references "users" ("id") on update cascade,
      constraint "invitation_batches_resumed_by_fkey" foreign key ("resumed_by") references "users" ("id") on update cascade
    );`);
    this.addSql('create unique index "invitation_batches_single_open_unique" on "invitation_batches" ((true)) where "closed_at" is null;');

    this.addSql(`create table "mentor_invitations" (
      "id" uuid not null default gen_random_uuid(),
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "email" varchar(254) not null,
      "display_name" varchar(255) not null,
      "stack_tags" text not null default '[]',
      "batch_id" uuid null,
      "access_invitation_id" uuid null,
      "accepted_by_user_id" uuid null,
      "accepted_at" timestamptz null,
      "expires_at" timestamptz not null,
      "publish_due_at" timestamptz null,
      "revoked_at" timestamptz null,
      constraint "mentor_invitations_pkey" primary key ("id"),
      constraint "mentor_invitations_batch_fkey" foreign key ("batch_id") references "invitation_batches" ("id") on update cascade on delete restrict,
      constraint "mentor_invitations_access_invitation_fkey" foreign key ("access_invitation_id") references "invitations" ("id") on update cascade on delete set null,
      constraint "mentor_invitations_accepted_user_fkey" foreign key ("accepted_by_user_id") references "users" ("id") on update cascade,
      constraint "mentor_invitations_acceptance_check" check (("accepted_at" is null) = ("accepted_by_user_id" is null) and ("accepted_at" is null or "publish_due_at" is not null))
    );`);
    this.addSql('create index "mentor_invitations_batch_lookup" on "mentor_invitations" ("batch_id", "created_at");');
    this.addSql('create index "mentor_invitations_email_lookup" on "mentor_invitations" ("email", "created_at" desc);');

    this.addSql(`insert into "mentor_invitations" (
      "email", "display_name", "stack_tags", "access_invitation_id", "accepted_by_user_id", "accepted_at",
      "expires_at", "publish_due_at", "revoked_at", "created_at", "updated_at"
    )
    select "email", "display_name", '[]', "id", "accepted_by_user_id", "accepted_at",
      "created_at" + interval '30 days',
      case when "accepted_at" is null then null else "accepted_at" + interval '14 days' end,
      "revoked_at", "created_at", "updated_at"
    from "invitations" where "role" = 'mentor';`);
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "mentor_invitations";');
    this.addSql('drop table if exists "invitation_batches";');
  }
}
