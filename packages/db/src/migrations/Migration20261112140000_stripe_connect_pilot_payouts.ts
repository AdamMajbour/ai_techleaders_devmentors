import { Migration } from '@mikro-orm/migrations';

export class Migration20261112140000_stripe_connect_pilot_payouts extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "stripe_connect_accounts" (
      "user_id" uuid not null,
      "stripe_account_id" varchar(255) not null,
      "country" varchar(2) not null default 'PL',
      "details_submitted" boolean not null default false,
      "payouts_enabled" boolean not null default false,
      "transfers_enabled" boolean not null default false,
      "checked_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "stripe_connect_accounts_pkey" primary key ("user_id"),
      constraint "stripe_connect_accounts_id_unique" unique ("stripe_account_id"),
      constraint "stripe_connect_accounts_user_fk" foreign key ("user_id") references "users" ("id") on delete restrict,
      constraint "stripe_connect_accounts_country_check" check ("country" = 'PL')
    );`);
    this.addSql(`create table "payout_transfers" (
      "id" uuid not null,
      "ledger_entry_id" uuid not null,
      "mentor_id" uuid not null,
      "stripe_transfer_id" varchar(255) null,
      "amount_minor" integer not null,
      "currency" varchar(3) not null,
      "status" varchar(16) not null,
      "failure_code" varchar(255) null,
      "attempts" integer not null default 0,
      "idempotency_key" varchar(255) not null,
      "initiated_by" uuid not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "payout_transfers_pkey" primary key ("id"),
      constraint "payout_transfers_ledger_unique" unique ("ledger_entry_id"),
      constraint "payout_transfers_stripe_id_unique" unique ("stripe_transfer_id"),
      constraint "payout_transfers_idempotency_unique" unique ("idempotency_key"),
      constraint "payout_transfers_status_check" check ("status" in ('pending', 'paid', 'failed')),
      constraint "payout_transfers_amount_check" check ("amount_minor" > 0),
      constraint "payout_transfers_currency_check" check ("currency" = 'EUR'),
      constraint "payout_transfers_attempts_check" check ("attempts" >= 0),
      constraint "payout_transfers_ledger_fk" foreign key ("ledger_entry_id") references "ledger_entries" ("id") on delete restrict,
      constraint "payout_transfers_mentor_fk" foreign key ("mentor_id") references "users" ("id") on delete restrict,
      constraint "payout_transfers_initiator_fk" foreign key ("initiated_by") references "users" ("id") on delete restrict
    );`);
    this.addSql(`create index "payout_transfers_mentor_status_index" on "payout_transfers" ("mentor_id", "status", "created_at" desc);`);
    this.addSql(`create table "payout_transfer_attempts" (
      "id" uuid not null,
      "payout_transfer_id" uuid not null,
      "attempted_by" uuid not null,
      "attempted_at" timestamptz not null,
      "status" varchar(16) not null,
      "stripe_transfer_id" varchar(255) null,
      "error_code" varchar(128) null,
      constraint "payout_transfer_attempts_pkey" primary key ("id"),
      constraint "payout_transfer_attempts_status_check" check ("status" in ('paid', 'failed')),
      constraint "payout_transfer_attempts_transfer_fk" foreign key ("payout_transfer_id") references "payout_transfers" ("id") on delete restrict,
      constraint "payout_transfer_attempts_actor_fk" foreign key ("attempted_by") references "users" ("id") on delete restrict
    );`);
    this.addSql(`create index "payout_transfer_attempts_history_index" on "payout_transfer_attempts" ("payout_transfer_id", "attempted_at" desc);`);
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "payout_transfer_attempts" cascade;');
    this.addSql('drop table if exists "payout_transfers" cascade;');
    this.addSql('drop table if exists "stripe_connect_accounts" cascade;');
  }
}
