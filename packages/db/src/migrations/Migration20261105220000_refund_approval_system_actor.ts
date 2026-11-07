import { Migration } from '@mikro-orm/migrations';

export class Migration20261105220000_refund_approval_system_actor extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "approval_requests"
      add column "decided_by_system" boolean not null default false;`);
    this.addSql(`alter table "approval_requests"
      drop constraint "approval_requests_lifecycle_check";`);
    this.addSql(`alter table "approval_requests"
      add constraint "approval_requests_lifecycle_check" check (
        ("status" = 'pending' and "decided_by" is null and not "decided_by_system" and "decided_at" is null)
        or (
          "status" in ('approved', 'rejected')
          and "decided_at" is not null
          and (
            ("decided_by" is not null and not "decided_by_system")
            or ("decided_by" is null and "decided_by_system")
          )
        )
      );`);
  }

  override async down(): Promise<void> {
    this.addSql(`update "approval_requests"
      set "decided_by" = '00000000-0000-4000-8000-000000000000'
      where "decided_by_system" = true;`);
    this.addSql(`alter table "approval_requests"
      drop constraint "approval_requests_lifecycle_check";`);
    this.addSql(`alter table "approval_requests"
      add constraint "approval_requests_lifecycle_check" check (
        ("status" = 'pending' and "decided_by" is null and "decided_at" is null)
        or ("status" in ('approved', 'rejected') and "decided_by" is not null and "decided_at" is not null)
      );`);
    this.addSql(`alter table "approval_requests" drop column "decided_by_system";`);
  }
}
