import { Migration } from '@mikro-orm/migrations';

export class Migration20261105183000_approval_requests extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "approval_requests" (
      "id" uuid not null,
      "kind" varchar(255) not null,
      "subject_type" varchar(255) not null,
      "subject_id" uuid not null,
      "reason" text not null,
      "status" varchar(255) not null,
      "decided_by" uuid null,
      "decided_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "approval_requests_pkey" primary key ("id"),
      constraint "approval_requests_status_check" check ("status" in ('pending', 'approved', 'rejected')),
      constraint "approval_requests_lifecycle_check" check (
        ("status" = 'pending' and "decided_by" is null and "decided_at" is null)
        or ("status" in ('approved', 'rejected') and "decided_by" is not null and "decided_at" is not null)
      )
    );`);
    this.addSql(`create unique index "approval_requests_one_pending_per_subject"
      on "approval_requests" ("kind", "subject_type", "subject_id")
      where "status" = 'pending';`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "approval_requests_one_pending_per_subject";`);
    this.addSql(`drop table if exists "approval_requests" cascade;`);
  }
}
