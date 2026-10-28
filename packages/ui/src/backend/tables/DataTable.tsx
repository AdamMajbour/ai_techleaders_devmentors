'use client';

import type { ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorMessage } from '../feedback/ErrorMessage';
import { LoadingMessage } from '../feedback/LoadingMessage';

export type DataTableColumn<TRow> = {
  key: string;
  header: string;
  cell: (row: TRow) => ReactNode;
  className?: string;
};

export type DataTablePagination = { page: number; pageCount: number; onPageChange: (page: number) => void };

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[] | undefined;
  getRowId: (row: TRow) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** The next step shown in the empty state: "Clear filter" when filters hide everything, or a create action. */
  emptyAction?: ReactNode;
  /** Names the table for assistive technology. Give it, or label the table another way. */
  caption?: string;
  rowActions?: (row: TRow) => ReactNode;
  pagination?: DataTablePagination;
}

/**
 * Column-config-driven list with the loading, error and empty states built in, pagination and row
 * actions. Every list screen uses this instead of a hand-rolled <table>.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  caption,
  rowActions,
  pagination,
}: DataTableProps<TRow>) {
  if (isLoading) {
    // The rows are not a table, so nothing is announced as data that is not there yet.
    return (
      <div aria-busy="true">
        <LoadingMessage />
        <div className="flex flex-col gap-between-groups">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div className="flex flex-col gap-between-groups">
      <Table>
        {caption && <TableCaption>{caption}</TableCaption>}
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {rowActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
              {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination && pagination.pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-end gap-group text-body">
          <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>
            Previous
          </Button>
          <span className="tabular-nums">
            Page {pagination.page} of {pagination.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pageCount}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
