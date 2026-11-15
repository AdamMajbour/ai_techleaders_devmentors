import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

// The shell of a page: one main landmark and one h1. Lists and tables use the content width, a single column of text the
// session width (narrow).
export function Page({ title, children, headerAction, narrow = false, className }: { title: string; children: ReactNode; headerAction?: ReactNode; narrow?: boolean; className?: string }) {
  return (
    <main className={cn('mx-auto flex w-full flex-col gap-between-groups py-between-groups', narrow ? 'max-w-session' : 'max-w-content', className)}>
      {headerAction ? (
        <header className="flex flex-wrap items-center justify-between gap-group">
          <h1 className="m-0 text-page-title font-strong text-headline">{title}</h1>
          {headerAction}
        </header>
      ) : <h1 className="m-0 text-page-title font-strong text-headline">{title}</h1>}
      {children}
    </main>
  );
}
