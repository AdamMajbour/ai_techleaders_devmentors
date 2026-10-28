import { render, screen, within } from '@testing-library/react';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table';

function Sample({ selected = false }: { selected?: boolean }) {
  return (
    <Table>
      <TableCaption>Your questions</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Mentor</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow data-state={selected ? 'selected' : undefined}>
          <TableCell>Senior Python engineer</TableCell>
          <TableCell className="text-right tabular-nums">25.00 EUR</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right tabular-nums">25.00 EUR</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

describe('Table', () => {
  it('is named by its caption', () => {
    render(<Sample />);
    expect(screen.getByRole('table', { name: 'Your questions' })).toBeInTheDocument();
  });

  it('makes column headers real column headers, so each cell is announced with its header', () => {
    render(<Sample />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Mentor', 'Price']);
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'));
  });

  it('draws column headers with the clear header role (R01.3)', () => {
    render(<Sample />);
    const header = screen.getByRole('columnheader', { name: 'Mentor' });
    expect(header).toHaveClass('text-label', 'font-strong', 'text-table-header-foreground');
  });

  it('divides rows with a hairline and has no shadow or card (R01.1)', () => {
    render(<Sample />);
    const row = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')[0];
    expect(row).toHaveClass('border-b', 'border-border');
    expect(row.className).not.toMatch(/shadow|rounded/);
  });

  it('shows a selected row with a surface, not only a colour change of text', () => {
    render(<Sample selected />);
    const row = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')[0];
    expect(row).toHaveAttribute('data-state', 'selected');
    expect(row).toHaveClass('data-[state=selected]:bg-muted');
  });

  it('scrolls inside its own container so a wide table cannot break the page', () => {
    const { container } = render(<Sample />);
    expect(container.querySelector('[data-slot="table-container"]')).toHaveClass('overflow-x-auto');
  });

  it('lets a header scope be overridden for a row header', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableHead scope="row">Mentor</TableHead>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('rowheader', { name: 'Mentor' })).toHaveAttribute('scope', 'row');
  });

  it('has a scroll container that a keyboard user can focus and scroll (WCAG 2.1.1)', () => {
    const { container } = render(<Sample />);
    expect(container.querySelector('[data-slot="table-container"]')).toHaveAttribute('tabindex', '0');
  });
});
