'use client';

import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

// A dense data table. Column headers are clear (R01.3), rows are divided by a hairline, not boxed in
// cards (R01.1), and cells use the compact relation spacing (K1). The container scrolls sideways at
// narrow widths, so a wide table never breaks the page (WCAG 1.4.10 allows this for data tables). The container is
// focusable, so a keyboard user can scroll it (WCAG 2.1.1; axe: scrollable-region-focusable).
function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" tabIndex={0} className="relative w-full overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <table data-slot="table" className={cn('w-full caption-bottom border-collapse text-body', className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return <tfoot data-slot="table-footer" className={cn('border-t border-border bg-muted font-strong', className)} {...props} />;
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cn('border-b border-border data-[state=selected]:bg-muted', className)} {...props} />;
}

// scope="col" by default: a screen reader announces the column header with each cell.
function TableHead({ className, scope = 'col', ...props }: ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn('px-panel-compact py-group text-left align-middle text-label font-strong text-table-header-foreground', className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('px-panel-compact py-group align-middle', className)} {...props} />;
}

// The caption names the table for assistive technology. Give every table a caption or an aria-label.
function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return <caption data-slot="table-caption" className={cn('mt-between-groups text-meta text-muted-foreground', className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
