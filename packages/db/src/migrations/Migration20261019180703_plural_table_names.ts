import { Migration } from '@mikro-orm/migrations';

// Engineering standards: tables are snake_case plurals. A rename (not drop and create)
// keeps existing rows; constraint and index names follow the new table names.
export class Migration20261019180703_plural_table_names extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" rename to "users";`);
    this.addSql(`alter table "users" rename constraint "user_pkey" to "users_pkey";`);
    this.addSql(`alter table "users" rename constraint "user_email_unique" to "users_email_unique";`);

    this.addSql(`alter table "article" rename to "articles";`);
    this.addSql(`alter table "articles" rename constraint "article_pkey" to "articles_pkey";`);
    this.addSql(`alter index "article_author_id_index" rename to "articles_author_id_index";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter index "articles_author_id_index" rename to "article_author_id_index";`);
    this.addSql(`alter table "articles" rename constraint "articles_pkey" to "article_pkey";`);
    this.addSql(`alter table "articles" rename to "article";`);

    this.addSql(`alter table "users" rename constraint "users_email_unique" to "user_email_unique";`);
    this.addSql(`alter table "users" rename constraint "users_pkey" to "user_pkey";`);
    this.addSql(`alter table "users" rename to "user";`);
  }

}
