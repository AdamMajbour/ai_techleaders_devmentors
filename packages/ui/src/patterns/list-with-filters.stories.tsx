import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { FilterBar } from '../backend/filters';
import { DataTable } from '../backend/tables';
import { Button } from '../components/ui/button';
import { TextLink } from '../components/ui/text-link';

// The pattern: filters above a DataTable, a result count, the active filters shown and removable, and two
// different empty states. The filter bar is the shared FilterBar.
type Mentor = { id: string; role: string; technologies: string[]; work: string; price: string };

const MENTORS: Mentor[] = [
  { id: '1', role: 'Senior Python engineer', technologies: ['Python', 'PostgreSQL'], work: 'Conference talks', price: '25.00 PLN' },
  { id: '2', role: 'Frontend engineer', technologies: ['React', 'TypeScript'], work: 'Open-source repositories', price: '25.00 PLN' },
  { id: '3', role: 'Platform engineer', technologies: ['Kubernetes', 'Python'], work: 'Technical articles', price: '25.00 PLN' },
  { id: '4', role: 'Backend engineer', technologies: ['PostgreSQL', 'TypeScript'], work: 'Talks and notes', price: '25.00 PLN' },
];
const TECHNOLOGIES = ['Python', 'React', 'TypeScript', 'Kubernetes', 'PostgreSQL', 'Go'];
const MANY: Mentor[] = Array.from({ length: 23 }, (_, i) => ({
  id: String(i + 10),
  role: `Mentor ${i + 1}, ${['Python', 'React', 'Kubernetes'][i % 3]} engineer`,
  technologies: [['Python', 'React', 'Kubernetes'][i % 3]],
  work: 'Public work',
  price: '25.00 PLN',
}));
const PAGE_SIZE = 10;

function MentorFilterList({
  rows = MENTORS,
  initialTechnology = '',
  isLoading = false,
  error = null,
  onRetry,
}: {
  rows?: Mentor[];
  initialTechnology?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const [technology, setTechnology] = useState(initialTechnology);
  const [page, setPage] = useState(1);
  const filtered = technology ? rows.filter((mentor) => mentor.technologies.includes(technology)) : rows;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clear = () => {
    setTechnology('');
    setPage(1);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-between-groups">
      {!isLoading && !error && rows.length > 0 ? (
        <FilterBar
          label="Technology"
          allLabel="All technologies"
          options={TECHNOLOGIES.map((name) => ({ value: name, label: name }))}
          value={technology}
          onChange={(value) => {
            setTechnology(value);
            setPage(1);
          }}
          count={filtered.length}
          noun={{ one: 'mentor', many: 'mentors' }}
          phrase={(name) => `for ${name}`}
        />
      ) : null}
      <DataTable
        caption="Mentors in the pilot"
        columns={[
          { key: 'role', header: 'Mentor', cell: (mentor) => mentor.role },
          { key: 'technologies', header: 'Technologies', cell: (mentor) => mentor.technologies.join(', ') },
          { key: 'work', header: 'Public work', cell: (mentor) => <TextLink href="#work">{mentor.work}</TextLink> },
          { key: 'price', header: 'Price', cell: (mentor) => <span className="tabular-nums">{mentor.price}</span>, className: 'text-right' },
        ]}
        rows={visible}
        getRowId={(mentor) => mentor.id}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle={technology ? `No mentors for ${technology}` : 'No mentors yet'}
        emptyDescription={
          technology
            ? 'No mentor lists this technology yet. Try another technology or clear the filter.'
            : 'Mentors appear here after they accept their invitation.'
        }
        emptyAction={technology ? <Button variant="outline" onClick={clear}>Clear filter</Button> : undefined}
        pagination={{ page, pageCount, onPageChange: setPage }}
      />
    </div>
  );
}

const meta = {
  title: 'Patterns/List with filters',
  component: MentorFilterList,
} satisfies Meta<typeof MentorFilterList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('4 mentors');
    await expect(canvas.getByRole('table', { name: 'Mentors in the pilot' })).toBeVisible();
  },
};

export const FilteringShowsTheActiveFilterAndCountsResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Technology'), 'Python');
    await expect(canvas.getByRole('status')).toHaveTextContent('2 mentors for Python');
    await expect(canvas.getByRole('button', { name: 'Technology: Python , remove filter' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all filters' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('4 mentors');
    await expect(canvas.queryByRole('button', { name: /remove filter/ })).not.toBeInTheDocument();
  },
};

export const NoResultsForTheFilters: Story = {
  args: { initialTechnology: 'Go' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No mentors for Go')).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('0 mentors for Go');
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filter' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('4 mentors');
  },
};

export const NothingHereYet: Story = {
  args: { rows: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No mentors yet')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Clear filter' })).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { isLoading: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Loading');
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};

export const LoadFailed: Story = {
  args: { error: 'Mentors could not be loaded. Check your connection and try again.', onRetry: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Mentors could not be loaded');
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const ManyRowsWithPagination: Story = {
  args: { rows: MANY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('23 mentors');
    await expect(canvas.getByText('Page 1 of 3')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(canvas.getByText('Page 2 of 3')).toBeVisible();
  },
};

export const LongTextNarrow: Story = {
  args: {
    rows: [
      { id: '9', role: 'Senior platform engineer who has upgraded ingress controllers on bare metal clusters for several years', technologies: ['Kubernetes', 'Python', 'PostgreSQL'], work: 'Technical articles about ingress upgrades', price: '25.00 PLN' },
    ],
  },
  render: (args) => (
    <div className="w-80">
      <MentorFilterList {...args} />
    </div>
  ),
};
