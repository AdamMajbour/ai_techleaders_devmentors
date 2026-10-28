import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { LoadingMessage } from '../../backend/feedback/LoadingMessage';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './table';

const meta = {
  title: 'Primitives/Skeleton',
  component: Skeleton,
  args: { className: 'h-4 w-48' },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function TableLoading() {
  return (
    <div aria-busy="true">
      <LoadingMessage message="Loading questions…" />
      <Table>
        <TableCaption>Your questions</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Question</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2].map((row) => (
            <TableRow key={row}>
              <TableCell><Skeleton className="h-4 w-56" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const TableWhileLoading: Story = {
  render: () => <TableLoading />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The state is announced as text; the blocks are hidden from assistive technology.
    await expect(canvas.getByRole('status')).toHaveTextContent('Loading questions…');
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(9);
    await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
  },
};

export const LoadingMessageAlone: Story = {
  render: () => <LoadingMessage message="Loading your answer…" />,
};

export const NarrowList: Story = {
  render: () => (
    <div className="w-80" aria-busy="true">
      <LoadingMessage />
      <div className="flex flex-col gap-between-groups">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-group">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  ),
};
