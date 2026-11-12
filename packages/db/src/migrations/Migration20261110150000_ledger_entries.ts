import { Migration } from '@mikro-orm/migrations';

export class Migration20261110150000_ledger_entries extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "ledger_entries" (
      "id" uuid not null,
      "account_id" uuid not null,
      "amount_minor" integer not null,
      "currency" varchar(3) not null,
      "livemode" boolean not null,
      "source_type" varchar(64) not null,
      "source_id" uuid not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "ledger_entries_pkey" primary key ("id"),
      constraint "ledger_entries_amount_check" check ("amount_minor" > 0),
      constraint "ledger_entries_currency_check" check ("currency" ~ '^[A-Z]{3}$'),
      constraint "ledger_entries_source_type_check" check (length("source_type") > 0),
      constraint "ledger_entries_source_account_unique" unique ("source_type", "source_id", "account_id")
    );`);
    this.addSql(`create index "ledger_entries_account_livemode_index" on "ledger_entries" ("account_id", "livemode", "created_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ledger_entries" cascade;`);
  }
}
