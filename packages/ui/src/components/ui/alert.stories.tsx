import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Alert, AlertDescription, AlertTitle } from './alert';

const meta = {
  title: 'Primitives/Alert',
  component: Alert,
  argTypes: { variant: { control: 'inline-radio', options: ['default', 'destructive'] } },
  args: { variant: 'default' },
  render: (args) => (
    <div className="max-w-lg">
      <Alert {...args}>
        <AlertTitle>Test mode</AlertTitle>
        <AlertDescription>Payments in this environment are not real and do not count toward the pilot.</AlertDescription>
      </Alert>
    </div>
  ),
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-between-groups">
      <Alert>
        <AlertTitle>Test mode</AlertTitle>
        <AlertDescription>Payments in this environment are not real.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>The payment failed</AlertTitle>
        <AlertDescription>Your card was not charged. Check the card details and try again.</AlertDescription>
      </Alert>
    </div>
  ),
};

export const LongContentNarrow: Story = {
  render: () => (
    <div className="w-80">
      <Alert variant="destructive">
        <AlertTitle>The mentor could not review this answer in time and your payment was returned</AlertTitle>
        <AlertDescription>
          The refund reaches your card within a few days, depending on your bank. You can ask the same question again.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const RolesFollowSeverity: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-between-groups">
      <Alert>
        <AlertTitle>Test mode</AlertTitle>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>The payment failed</AlertTitle>
      </Alert>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('Test mode');
    await expect(canvas.getByRole('alert')).toHaveTextContent('The payment failed');
  },
};
