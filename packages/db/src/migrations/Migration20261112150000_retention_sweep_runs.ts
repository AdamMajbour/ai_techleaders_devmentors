import { Migration } from '@mikro-orm/migrations';

export class Migration20261112150000_retention_sweep_runs extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "retention_sweep_runs" (
      "id" uuid not null,
      "status" varchar(16) not null,
      "started_at" timestamptz not null,
      "completed_at" timestamptz null,
      "limit_count" integer not null,
      "processed_count" integer not null default 0,
      "skipped_hold_count" integer not null default 0,
      "error_code" varchar(128) null,
      constraint "retention_sweep_runs_pkey" primary key ("id"),
      constraint "retention_sweep_runs_status_check" check ("status" in ('running', 'completed', 'failed')),
      constraint "retention_sweep_runs_limit_check" check ("limit_count" > 0),
      constraint "retention_sweep_runs_processed_check" check ("processed_count" >= 0),
      constraint "retention_sweep_runs_skipped_check" check ("skipped_hold_count" >= 0)
    );`);
    this.addSql(`create index "retention_sweep_runs_started_index" on "retention_sweep_runs" ("started_at" desc);`);
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "retention_sweep_runs" cascade;');
  }
}
