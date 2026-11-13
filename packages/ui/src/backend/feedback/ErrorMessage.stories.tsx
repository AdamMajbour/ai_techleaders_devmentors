import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ErrorMessage } from './ErrorMessage';

const meta = {
  title: 'Primitives/ErrorMessage',
  component: ErrorMessage,
  args: { message: 'Questions could not be loaded. Check your connection and try again.', onRetry: fn() },
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRetry: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Questions could not be loaded');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const WithoutRetry: Story = {
  args: { onRetry: undefined, message: 'This question does not exist or you do not have access to it.' },
};

export const LongMessageNarrow: Story = {
  render: (args) => (
    <div className="w-80">
      <ErrorMessage
        {...args}
        message="Your payment was received but the answer could not be started. You are not charged twice. We refund the payment automatically, which usually takes a few days."
      />
    </div>
  ),
};
