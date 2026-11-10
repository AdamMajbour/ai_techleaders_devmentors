import { Migration } from '@mikro-orm/migrations';

export class Migration20261110100000_mentor_profile_github extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "mentor_profiles" add column "github_url" varchar(255) null;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table "mentor_profiles" drop column "github_url";');
  }
}
