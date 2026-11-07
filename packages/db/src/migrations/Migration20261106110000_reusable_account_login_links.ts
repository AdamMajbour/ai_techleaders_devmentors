import { Migration } from '@mikro-orm/migrations';

export class Migration20261106110000_reusable_account_login_links extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "login_tokens" add column "reusable" boolean not null default false;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table "login_tokens" drop column "reusable";');
  }
}
