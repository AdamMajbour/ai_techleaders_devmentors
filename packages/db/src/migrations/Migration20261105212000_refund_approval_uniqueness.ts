import { Migration } from '@mikro-orm/migrations';

export class Migration20261105212000_refund_approval_uniqueness extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create unique index "approval_requests_one_refund_per_subject"
      on "approval_requests" ("kind", "subject_type", "subject_id")
      where "kind" = 'refund';`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "approval_requests_one_refund_per_subject";`);
  }
}
