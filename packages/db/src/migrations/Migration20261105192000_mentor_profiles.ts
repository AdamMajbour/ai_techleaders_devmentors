import { Migration } from '@mikro-orm/migrations';

export class Migration20261105192000_mentor_profiles extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "mentor_profiles" (
      "id" uuid not null,
      "user_id" uuid not null,
      "slug" varchar(255) not null,
      "headline" varchar(255) not null,
      "bio" text not null,
      "technologies" text not null,
      "public_work_url" varchar(255) not null,
      "is_listed" boolean not null default false,
      "last_active_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "mentor_profiles_pkey" primary key ("id"),
      constraint "mentor_profiles_user_id_unique" unique ("user_id"),
      constraint "mentor_profiles_slug_unique" unique ("slug"),
      constraint "mentor_profiles_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade
    );`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mentor_profiles" cascade;`);
  }
}
