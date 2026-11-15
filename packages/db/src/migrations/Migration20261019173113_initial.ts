import { Migration } from '@mikro-orm/migrations';

export class Migration20261019173113_initial extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "article" ("id" uuid not null, "title" varchar(255) not null, "content" text not null, "author_id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "article_pkey" primary key ("id"));`);
    this.addSql(`create index "article_author_id_index" on "article" ("author_id");`);

    this.addSql(`create table "user" ("id" uuid not null, "email" varchar(255) not null, "name" varchar(255) not null, "avatar" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "user_pkey" primary key ("id"));`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "article" cascade;`);
    this.addSql(`drop table if exists "user" cascade;`);
  }

}
