import Link from 'next/link';
import { withScope } from '@devmentor/core/server';
import { requirePanelAccess } from '../../../lib/panel-access';

export const metadata = { title: 'Admin dashboard' };

export default async function OperatorDashboardPage() {
  const session = await requirePanelAccess('operator');
  const [users, approvals] = await Promise.all([
    withScope(({ userService }) => userService.listForOperator({ page: 1, pageSize: 6 })),
    withScope(({ refundService }) => refundService.listOperatorApprovals(session)),
  ]);
  const recentUsers = users.items;

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-wrap items-center justify-between gap-group">
        <div className="flex flex-col gap-group">
          <p className="m-0 text-meta text-muted-foreground">DEVMENTOR / ADMIN</p>
          <h1 className="m-0 text-page-title font-strong text-headline">Dashboard</h1>
          <p className="m-0 text-body text-muted-foreground">A clear view of the people and decisions in your pilot.</p>
        </div>
      </header>

      <section aria-label="Pilot overview" className="grid gap-group border-y border-border py-panel-roomy sm:grid-cols-2">
        <div>
          <p className="m-0 text-meta text-muted-foreground">Registered users</p>
          <p className="m-0 text-section-title font-strong text-headline">{users.total}</p>
        </div>
        <div>
          <p className="m-0 text-meta text-muted-foreground">Refunds needing attention</p>
          <p className="m-0 text-section-title font-strong text-headline">{approvals.items.length}</p>
        </div>
      </section>

      <section className="flex flex-col gap-group">
        <div className="flex flex-wrap items-baseline justify-between gap-group">
          <h2 className="m-0 text-section-title font-strong text-headline">Recently joined</h2>
          <Link className="text-link underline" href="/operator/users">View all users</Link>
        </div>
        {recentUsers.length ? (
          <ul className="m-0 list-none p-0">
            {recentUsers.map((user) => (
              <li key={user.id} className="flex flex-wrap justify-between gap-group border-b border-border py-panel-compact">
                <span className="text-body text-foreground">{user.name || 'Name not provided'} <span className="text-muted-foreground">· {user.email}</span></span>
                <time className="text-meta text-muted-foreground" dateTime={user.createdAt}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(user.createdAt))}</time>
              </li>
            ))}
          </ul>
        ) : <p className="m-0 text-body text-muted-foreground">No users have joined yet.</p>}
      </section>

      <nav aria-label="Admin tools" className="flex flex-wrap gap-group border-t border-border pt-panel-compact">
        <Link className="text-link underline" href="/operator/approvals">Review refund approvals ({approvals.items.length})</Link>
        <Link className="text-link underline" href="/operator/vault-answers">Vault answer status</Link>
        <Link className="text-link underline" href="/operator/users">Browse users</Link>
      </nav>
    </main>
  );
}
