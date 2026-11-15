import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { ApiResult } from '../api/types';
import { ActionButton } from './ActionButton';

const ok: ApiResult<unknown> = { ok: true, status: 200, data: {} };
const failure: ApiResult<unknown> = {
  ok: false,
  status: 409,
  error: { code: 'conflict', message: 'This booking has already been accepted.' },
};
const runSuccess: () => Promise<ApiResult<unknown>> = async () => ok;

const meta = {
  title: 'Backend/ActionButton',
  component: ActionButton,
  args: { label: 'Accept booking', run: runSuccess, onDone: fn() },
} satisfies Meta<typeof ActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Loading: Story = {
  args: {
    run: async () => {
      await new Promise((resolve) => setTimeout(resolve, 750));
      return ok;
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept booking' }));
    await expect(canvas.getByRole('button', { name: 'Working…' })).toBeDisabled();
  },
};

export const ServerErrorAndRetry: Story = {
  args: {
    run: (() => {
      let attempts = 0;
      return async () => {
        attempts += 1;
        return attempts === 1 ? failure : ok;
      };
    })(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept booking' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('This booking has already been accepted.');
    await expect(canvas.getByRole('button', { name: 'Accept booking' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Accept booking' }));
    await expect(args.onDone).toHaveBeenCalledTimes(1);
  },
};

export const WithConfirmation: Story = {
  args: { label: 'Approve refund', confirm: 'Approve this refund?' },
};

export const UnexpectedFailure: Story = {
  args: { run: async () => Promise.reject(new Error('network unavailable')) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept booking' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  },
};
