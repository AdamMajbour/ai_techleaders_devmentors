import Link from 'next/link';
import { withScope } from '@devmentor/core/server';
import { requirePanelAccess } from '../../../../lib/panel-access';
import { operatorUserListQuerySchema, parseOrThrow } from '@devmentor/core';

export const metadata = { title: 'Users · Admin' };

export default async function OperatorUsersPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await requirePanelAccess('operator');
  const queryParams = await searchParams;
  const query = parseOrThrow(operatorUserListQuerySchema, { page: Array.isArray(queryParams.page) ? queryParams.page[0] : queryParams.page });
  const users = await withScope(({ userService }) => userService.listForOperator(query));

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-wrap items-center justify-between gap-group">
        <div className="flex flex-col gap-group">
          <Link className="text-link underline" href="/operator">Admin dashboard</Link>
          <h1 className="m-0 text-page-title font-strong text-headline">Users</h1>
            <p className="m-0 text-body text-muted-foreground">{users.total} registered {users.total === 1 ? 'user' : 'users'}.</p>
        </div>
      </header>
      {users.items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-body">
            <thead><tr className="border-b border-border text-label font-strong text-headline"><th className="px-panel-compact py-group">Name</th><th className="px-panel-compact py-group">Email</th><th className="px-panel-compact py-group">Joined</th></tr></thead>
            <tbody>{users.items.map((user) => (
              <tr key={user.id} className="border-b border-border">
                <td className="px-panel-compact py-panel-compact text-foreground">{user.name || 'Name not provided'}</td>
                <td className="px-panel-compact py-panel-compact text-foreground">{user.email}</td>
                <td className="px-panel-compact py-panel-compact text-muted-foreground"><time dateTime={user.createdAt}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(user.createdAt))}</time></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="m-0 border-t border-border py-panel-compact text-body text-muted-foreground">No users have joined yet.</p>}
      {users.pageCount > 1 ? (
        <nav aria-label="User pages" className="flex items-center justify-between border-t border-border pt-panel-compact">
          {users.page > 1 ? <Link className="text-link underline" href={`/operator/users?page=${users.page - 1}`}>Previous page</Link> : <span />}
          <span className="text-meta text-muted-foreground">Page {users.page} of {users.pageCount}</span>
          {users.page < users.pageCount ? <Link className="text-link underline" href={`/operator/users?page=${users.page + 1}`}>Next page</Link> : <span />}
        </nav>
      ) : null}
    </main>
  );
}
