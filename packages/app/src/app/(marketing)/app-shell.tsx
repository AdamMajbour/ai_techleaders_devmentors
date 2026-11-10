'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LogoutButton } from './logout-button';

type AppRoles = { mentor: boolean; seeker: boolean; operator: boolean };
type NavLink = { href: string; label: string };
type NavGroup = { label: string; links: NavLink[] };

function navigationFor(roles: AppRoles, signedIn: boolean): NavGroup[] {
  const workspace: NavLink[] = [
    ...(roles.mentor ? [{ href: '/mentor', label: 'Mentor workspace' }] : []),
    ...(roles.seeker ? [{ href: '/seeker', label: 'My sessions' }] : []),
    ...((roles.mentor || roles.seeker) ? [{ href: '/mentors', label: 'Find mentors' }] : []),
    ...(signedIn ? [{ href: '/profile', label: 'My profile' }] : []),
    ...(roles.mentor ? [
      { href: '/mentor/bookings', label: 'Bookings' },
      { href: '/mentor/notes', label: 'Notes' },
      { href: '/mentor/profile', label: 'Mentor profile' },
    ] : []),
  ];
  return [
    { label: 'Workspace', links: workspace },
    ...(roles.operator ? [{ label: 'Operations', links: [
      { href: '/operator', label: 'Operator dashboard' },
      { href: '/operator/users', label: 'Users' },
      { href: '/operator/approvals', label: 'Refund approvals' },
    ] }] : []),
  ];
}

function isCurrentPath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, userName, roles }: { children: ReactNode; userName: string | null; roles: AppRoles }) {
  const pathname = usePathname();
  const navigation = navigationFor(roles, Boolean(userName));

  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-group focus:top-group focus:z-50 focus:bg-background focus:p-group focus:text-link focus:underline" href="#main-content">Skip to content</a>
      <aside className="border-b border-border bg-card md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex min-h-16 items-center gap-group border-b border-border px-panel-roomy">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-md bg-primary text-sm font-strong text-primary-foreground">D</span>
          <span className="text-section-title font-strong text-headline">DevMentor</span>
        </div>
        <nav aria-label="Main navigation" className="flex gap-between-groups overflow-x-auto p-panel-compact md:block md:space-y-between-groups md:overflow-visible md:p-panel-roomy">
          {navigation.map((group) => (
            <section key={group.label} aria-labelledby={`nav-${group.label.toLowerCase()}`} className="shrink-0 md:space-y-group">
              <h2 id={`nav-${group.label.toLowerCase()}`} className="hidden px-group text-meta font-strong uppercase tracking-wide text-muted-foreground md:block">{group.label}</h2>
              <ul className="m-0 flex list-none gap-group p-0 md:flex-col">
                {group.links.map((link) => {
                  const active = isCurrentPath(pathname, link.href);
                  return <li key={link.href}><Link aria-current={active ? 'page' : undefined} className={`flex min-h-control-compact items-center whitespace-nowrap rounded-md px-control-x-compact text-label no-underline transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`} href={link.href}>{link.label}</Link></li>;
                })}
              </ul>
            </section>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-group border-b border-border bg-background px-panel-roomy">
          <div><p className="m-0 text-meta text-muted-foreground">DEVMENTOR</p><p className="m-0 text-label font-strong text-headline">{userName ?? 'Your workspace'}</p></div>
          <LogoutButton />
        </header>
        <div id="main-content" className="min-w-0 flex-1 p-panel-roomy md:p-section">{children}</div>
      </div>
    </div>
  );
}
