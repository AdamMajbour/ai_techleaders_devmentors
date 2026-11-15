import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriceNotice } from './PriceNotice';

const meta = {
  title: 'Product/Bookings/PriceNotice',
  component: PriceNotice,
  args: {
    amountMinor: 2500,
    currency: 'PLN',
    description: 'for a 25-minute text session with Ada Kowalska',
    refundRule: 'You pay now, before you write. If the mentor does not accept or does not show up, you are refunded.',
  },
  render: (args) => (
    <div className="max-w-session">
      <PriceNotice {...args} />
    </div>
  ),
} satisfies Meta<typeof PriceNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const LongTextNarrow: Story = {
  args: {
    description: 'for a 25-minute text session with a mentor who answers questions about Kubernetes upgrades and ingress controllers',
  },
  render: (args) => (
    <div className="w-80">
      <PriceNotice {...args} />
    </div>
  ),
};

export const WholeAmountsAreShortened: Story = { args: { amountMinor: 1000, description: 'for an answer in the vault' } };
