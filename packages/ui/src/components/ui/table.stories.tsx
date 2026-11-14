import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StatusBadge } from './status-badge';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table';
import { TextLink } from './text-link';

const meta = {
  title: 'Primitives/Table',
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const MENTORS = [
  { role: 'Senior Python engineer', technologies: 'Python, PostgreSQL', work: 'Conference talks', price: '25.00 PLN' },
  { role: 'Frontend engineer', technologies: 'React, TypeScript', work: 'Open-source repositories', price: '25.00 PLN' },
  { role: 'Platform engineer', technologies: 'Kubernetes, Python', work: 'Technical articles', price: '25.00 PLN' },
];

function MentorTable() {
  return (
    <Table>
      <TableCaption>Mentors in the pilot. A session is 25 minutes of text.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Mentor</TableHead>
          <TableHead>Technologies</TableHead>
          <TableHead>Public work</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {MENTORS.map((mentor) => (
          <TableRow key={mentor.role}>
            <TableCell>{mentor.role}</TableCell>
            <TableCell>{mentor.technologies}</TableCell>
            <TableCell>
              <TextLink href="#work">{mentor.work}</TextLink>
            </TableCell>
            <TableCell className="text-right tabular-nums">{mentor.price}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const Playground: Story = { render: () => <MentorTable /> };

export const WithStatusAndFooter: Story = {
  render: () => (
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
        <TableRow>
          <TableCell>Ingress upgrade fails on staging</TableCell>
          <TableCell><StatusBadge>Waiting for the mentor</StatusBadge></TableCell>
          <TableCell className="text-right tabular-nums">25.00 PLN</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Why is my React effect running twice?</TableCell>
          <TableCell><StatusBadge tone="active">Accepted</StatusBadge></TableCell>
          <TableCell className="text-right tabular-nums">25.00 PLN</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Index choice for a jsonb column</TableCell>
          <TableCell><StatusBadge tone="danger">Declined</StatusBadge></TableCell>
          <TableCell className="text-right tabular-nums">25.00 PLN</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total paid</TableCell>
          <TableCell className="text-right tabular-nums">75.00 PLN</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const SelectedRow: Story = {
  render: () => (
    <Table>
      <TableCaption>Mentors</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Mentor</TableHead>
          <TableHead>Chosen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow data-state="selected">
          <TableCell>Senior Python engineer</TableCell>
          <TableCell>Yes</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Frontend engineer</TableCell>
          <TableCell>No</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const LongContentNarrow: Story = {
  render: () => (
    <div className="w-80">
      <MentorTable />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // At 320 px the table scrolls inside its own container instead of breaking the page.
    const container = canvasElement.querySelector('[data-slot="table-container"]');
    await expect(container).toHaveClass('overflow-x-auto');
  },
};

export const HeadersAnnounceEachCell: Story = {
  render: () => <MentorTable />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('table', { name: /Mentors in the pilot/ })).toBeVisible();
    const headers = canvas.getAllByRole('columnheader');
    await expect(headers).toHaveLength(4);
    for (const header of headers) await expect(header).toHaveAttribute('scope', 'col');
  },
};
