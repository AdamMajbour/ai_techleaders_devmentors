import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MENTORS, PRICE } from '../../../.storybook/blocks/sampleData';
import { MentorRow } from './MentorRow';

const meta = {
  title: 'Product/Mentors/MentorRow',
  component: MentorRow,
  args: { mentor: MENTORS[0], ...PRICE, href: '#mentor' },
  render: (args) => (
    <ul className="m-0 max-w-content list-none p-0">
      <MentorRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof MentorRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ManyInAList: Story = {
  render: (args) => (
    <ul className="m-0 max-w-content list-none p-0">
      {MENTORS.map((mentor) => (
        <MentorRow key={mentor.id} {...args} mentor={mentor} href={`#${mentor.id}`} />
      ))}
    </ul>
  ),
};

export const WithoutPublicWork: Story = { args: { mentor: MENTORS[2] } };

export const NeverActive: Story = { args: { mentor: MENTORS[3] } };

export const LongTextNarrow: Story = {
  args: {
    mentor: {
      ...MENTORS[0],
      headline:
        'Upgraded ingress-nginx on bare metal clusters, migrated three teams off a deprecated annotation set and wrote down every step that broke on the way',
      technologies: ['Kubernetes', 'Go', 'Linux networking', 'Prometheus', 'Terraform', 'Helm', 'OpenTelemetry'],
    },
  },
  render: (args) => (
    <ul className="m-0 w-80 list-none p-0">
      <MentorRow {...args} />
    </ul>
  ),
};

export const NoRatingAnywhere: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 3 })).toBeVisible();
    await expect(canvasElement.textContent).not.toMatch(/★|rating|stars|score|top mentor/i);
  },
};
