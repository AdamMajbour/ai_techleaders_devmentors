import { Migration } from '@mikro-orm/migrations';

export class Migration20261031235000_status_transitions extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "status_transitions" (
      "id" uuid not null,
      "entity_type" varchar(255) not null,
      "entity_id" uuid not null,
      "from_status" varchar(255) not null,
      "to_status" varchar(255) not null,
      "actor_kind" varchar(255) not null,
      "actor_user_id" uuid null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "status_transitions_pkey" primary key ("id"),
      constraint "status_transitions_actor_kind_check" check ("actor_kind" in ('user', 'system', 'webhook'))
    );`);
    this.addSql(`create index "status_transitions_entity_type_entity_id_created_at_index" on "status_transitions" ("entity_type", "entity_id", "created_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "status_transitions" cascade;`);
  }
}
