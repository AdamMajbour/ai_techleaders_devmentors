import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { ApiResult } from '../../backend/api/types';
import { Composer, type ComposerProps } from './Composer';

const ok: ApiResult<unknown> = { ok: true, status: 201, data: {} };

const meta = {
  title: 'Product/Messages/Composer',
  component: Composer,
  // A mock at runtime. Typed as the prop so a story can replace it with a plain function.
  args: { onSend: fn(async () => ok) as ComposerProps['onSend'] },
  render: (args) => (
    <div className="max-w-session">
      <Composer {...args} />
    </div>
  ),
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SendsWithTheKeyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const box = within(canvasElement).getByLabelText('Message');
    await userEvent.type(box, 'x509: certificate signed by unknown authority{Control>}{Enter}{/Control}');
    await waitFor(() => expect(args.onSend).toHaveBeenCalledWith('x509: certificate signed by unknown authority'));
    await waitFor(() => expect(box).toHaveValue(''));
  },
};

export const BlockedBeforeTheStart: Story = {
  args: { blockedReason: 'The session has not started yet. You can write when it starts.' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Message')).toBeDisabled();
  },
};

export const BlockedAfterTheEnd: Story = {
  args: { blockedReason: 'The session has ended. You can still read the conversation.' },
};

export const Sending: Story = {
  args: { onSend: () => new Promise<ApiResult<unknown>>(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Message'), 'One more thing');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(canvas.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  },
};

export const SendFailsAndKeepsTheText: Story = {
  args: { onSend: async () => ({ ok: false, status: 0, error: { code: 'network_error', message: 'Check your connection and send again.' } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Message'), 'Do not lose this');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Message not sent. Check your connection and send again.');
    await expect(canvas.getByLabelText('Message')).toHaveValue('Do not lose this');
  },
};

export const NearTheLimit: Story = {
  args: { maxLength: 60 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Message'), 'x'.repeat(56));
    await expect(canvas.getByText('4 characters left')).toBeVisible();
  },
};
