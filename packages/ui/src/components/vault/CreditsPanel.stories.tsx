import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { CREDIT_ENTRIES } from '../../../.storybook/blocks/sampleData';
import { CreditsPanel } from './CreditsPanel';

const meta = {
  title: 'Product/Vault/CreditsPanel',
  component: CreditsPanel,
  args: { balanceMinor: 667, currency: 'PLN', entries: CREDIT_ENTRIES.filter((entry) => entry.livemode), timeZone: 'UTC' },
  render: (args) => (
    <div className="max-w-session">
      <CreditsPanel {...args} />
    </div>
  ),
} satisfies Meta<typeof CreditsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCredits: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Not paid out yet. Payout is arranged separately.')).toBeVisible();
    await expect(canvas.getAllByRole('row')).toHaveLength(3);
  },
};

export const WithTestCredits: Story = { args: { entries: CREDIT_ENTRIES, testBalanceMinor: 400 } };

export const NoCreditsYet: Story = { args: { balanceMinor: 0, entries: [] } };

export const Loading: Story = { args: { status: 'loading', balanceMinor: 0, entries: [] } };

export const LoadFailed: Story = { args: { status: 'error', balanceMinor: 0, entries: [] } };

export const ManyEntries: Story = {
  args: {
    balanceMinor: 400 * 14,
    entries: Array.from({ length: 14 }, (_, index) => ({ id: `e${index}`, date: `2026-11-${String(3 + index).padStart(2, '0')}T10:00:00Z`, amountMinor: 400, livemode: true })),
  },
};

export const NarrowScreen: Story = {
  render: (args) => (
    <div className="w-80">
      <CreditsPanel {...args} />
    </div>
  ),
};
