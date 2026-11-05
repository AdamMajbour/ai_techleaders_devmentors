import { Migration } from '@mikro-orm/migrations';

export class Migration20261105214000_pending_refund_approval_uniqueness extends Migration {
  override async up(): Promise<void> {
    this.addSql(`drop index "approval_requests_one_refund_per_subject";`);
    this.addSql(`create unique index "approval_requests_one_refund_per_subject"
      on "approval_requests" ("kind", "subject_type", "subject_id")
      where "kind" = 'refund' and "status" = 'pending';`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "approval_requests_one_refund_per_subject";`);
    this.addSql(`create unique index "approval_requests_one_refund_per_subject"
      on "approval_requests" ("kind", "subject_type", "subject_id")
      where "kind" = 'refund';`);
  }
}
