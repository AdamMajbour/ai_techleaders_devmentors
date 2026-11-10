import { Migration } from '@mikro-orm/migrations';

export class Migration20261110170000_vault_answers extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "vault_answers" (
      "id" uuid not null,
      "seeker_id" uuid not null,
      "question" text not null,
      "status" varchar(32) not null,
      "price_minor" integer not null,
      "currency" varchar(3) not null,
      "answer_text" text null,
      "failure_reason" varchar(32) null,
      "model_id" varchar(255) null,
      "input_tokens" integer null,
      "output_tokens" integer null,
      "generation_attempts" integer not null default 0,
      "generation_started_at" timestamptz null,
      "preview_required" boolean not null default true,
      "review_expires_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "vault_answers_pkey" primary key ("id"),
      constraint "vault_answers_question_length_check" check (char_length("question") <= 2000),
      constraint "vault_answers_price_check" check ("price_minor" > 0),
      constraint "vault_answers_currency_check" check ("currency" ~ '^[A-Z]{3}$'),
      constraint "vault_answers_status_check" check ("status" in ('pending_payment', 'payment_failed', 'paid', 'generating', 'generation_failed', 'pending_preview', 'rejected', 'expired', 'cancelled', 'released')),
      constraint "vault_answers_failure_reason_check" check ("failure_reason" is null or "failure_reason" in ('unanswerable', 'refused', 'invalid_output', 'unavailable', 'config')),
      constraint "vault_answers_generation_attempts_check" check ("generation_attempts" >= 0),
      constraint "vault_answers_token_counts_check" check (("input_tokens" is null or "input_tokens" >= 0) and ("output_tokens" is null or "output_tokens" >= 0))
    );`);
    this.addSql(`create index "vault_answers_seeker_created_index" on "vault_answers" ("seeker_id", "created_at");`);
    this.addSql(`create index "vault_answers_status_lease_index" on "vault_answers" ("status", "generation_started_at");`);
    this.addSql(`create table "vault_answer_citations" (
      "id" uuid not null,
      "answer_id" uuid not null,
      "note_id" uuid not null,
      "mentor_id" uuid not null,
      "mentor_name" varchar(255) not null,
      "note_title" varchar(255) not null,
      "position" integer not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "vault_answer_citations_pkey" primary key ("id"),
      constraint "vault_answer_citations_position_check" check ("position" >= 0),
      constraint "vault_answer_citations_answer_note_unique" unique ("answer_id", "note_id")
    );`);
    this.addSql(`alter table "payments" alter column "booking_id" drop not null;`);
    this.addSql(`alter table "payments" add column "vault_answer_id" uuid null;`);
    this.addSql(`alter table "payments" add constraint "payments_vault_answer_id_unique" unique ("vault_answer_id");`);
    this.addSql(`alter table "payments" add constraint "payments_one_subject_check" check (num_nonnulls("booking_id", "vault_answer_id") = 1);`);
  }

  override async down(): Promise<void> {
    this.addSql(`do $$ begin
      if exists (select 1 from "payments" where "vault_answer_id" is not null) then
        raise exception 'Cannot roll back vault answers while vault payments exist.';
      end if;
    end $$;`);
    this.addSql(`alter table "payments" drop constraint "payments_one_subject_check";`);
    this.addSql(`alter table "payments" drop constraint "payments_vault_answer_id_unique";`);
    this.addSql(`alter table "payments" drop column "vault_answer_id";`);
    this.addSql(`alter table "payments" alter column "booking_id" set not null;`);
    this.addSql(`drop table if exists "vault_answer_citations" cascade;`);
    this.addSql(`drop table if exists "vault_answers" cascade;`);
  }
}
