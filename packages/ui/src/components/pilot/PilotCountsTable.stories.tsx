import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { pilotRows } from '../../../.storybook/blocks/sampleData';
import { PilotCountsTable } from './PilotCountsTable';

const meta = {
  title: 'Product/Pilot/PilotCountsTable',
  component: PilotCountsTable,
  args: { rows: pilotRows('review'), asOf: '2026-11-30T09:15:00Z', timeZone: 'UTC' },
  render: (args) => (
    <div className="max-w-content">
      <PilotCountsTable {...args} />
    </div>
  ),
} satisfies Meta<typeof PilotCountsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AtTheFirstReview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('columnheader')).toHaveLength(5);
    await expect(canvas.getAllByText('Stop-or-revise condition met')).toHaveLength(2);
  },
};

export const WindowsStillOpen: Story = { args: { rows: pilotRows('start'), asOf: '2026-11-04T09:15:00Z' } };

export const NoConditionMet: Story = { args: { rows: pilotRows('allClear') } };

export const NoCriteria: Story = { args: { rows: [] } };

export const Loading: Story = { args: { status: 'loading' } };

export const LoadFailed: Story = { args: { status: 'error' } };

export const NarrowScreen: Story = {
  render: (args) => (
    <div className="w-80">
      <PilotCountsTable {...args} />
    </div>
  ),
};
