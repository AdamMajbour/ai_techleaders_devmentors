import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from './DataTable';

type Row = { id: string; title: string };
const columns: DataTableColumn<Row>[] = [{ key: 'title', header: 'Title', cell: (row) => row.title }];
const rows: Row[] = [
  { id: '1', title: 'First' },
  { id: '2', title: 'Second' },
];

describe('DataTable', () => {
  it('renders the rows under the column headers', () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />);

    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Second' })).toBeInTheDocument();
  });

  it('shows the loading state instead of the table', () => {
    render(<DataTable columns={columns} rows={undefined} getRowId={(row) => row.id} isLoading />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the error with a retry button', async () => {
    const onRetry = jest.fn();
    render(<DataTable columns={columns} rows={undefined} getRowId={(row) => row.id} error="Could not load" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state for undefined and empty rows', () => {
    const { rerender } = render(<DataTable columns={columns} rows={[]} getRowId={(row) => row.id} emptyTitle="No articles" emptyDescription="Write one" />);
    expect(screen.getByText('No articles')).toBeInTheDocument();
    expect(screen.getByText('Write one')).toBeInTheDocument();

    rerender(<DataTable columns={columns} rows={undefined} getRowId={(row) => row.id} />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders row actions per row', async () => {
    const onDelete = jest.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        rowActions={(row) => <button onClick={() => onDelete(row.id)}>Delete {row.title}</button>}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Delete Second' }));
    expect(onDelete).toHaveBeenCalledWith('2');
  });

  it('paginates, disabling Previous on the first page and Next on the last', async () => {
    const onPageChange = jest.fn();
    const { rerender } = render(
      <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} pagination={{ page: 1, pageCount: 3, onPageChange }} />,
    );

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} pagination={{ page: 3, pageCount: 3, onPageChange }} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it('hides pagination when there is only one page', () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} pagination={{ page: 1, pageCount: 1, onPageChange: jest.fn() }} />);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});
