import { Migration } from '@mikro-orm/migrations';

export class Migration20261019182107_add_user_password_hash extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "users" add column "password_hash" varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "users" drop column "password_hash";`);
  }

}
