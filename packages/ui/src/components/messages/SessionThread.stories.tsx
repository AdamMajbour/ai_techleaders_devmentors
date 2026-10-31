import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import type { ApiResult } from '../../backend/api/types';
import { MESSAGES, SESSION } from '../../../.storybook/blocks/sampleData';
import { SessionThread } from './SessionThread';

const ok: ApiResult<unknown> = { ok: true, status: 201, data: {} };

const meta = {
  title: 'Product/Messages/SessionThread',
  component: SessionThread,
  args: { ...SESSION, viewerId: 'seeker', now: '2026-11-03T13:13:00Z', messages: MESSAGES, onSend: fn(async () => ok), onRetry: fn() },
} satisfies Meta<typeof SessionThread>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('12 minutes left. The session ends at 13:25.')).toBeVisible();
    await expect(canvas.getByLabelText('Message')).toBeEnabled();
  },
};

export const SeenByTheMentor: Story = { args: { viewerId: 'mentor' } };

export const BeforeTheStart: Story = { args: { now: '2026-11-03T12:50:00Z', messages: [] } };

export const AfterTheEnd: Story = {
  args: { now: '2026-11-03T13:40:00Z' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('The session ended at 13:25. The conversation is read-only.')).toBeVisible();
    await expect(canvas.getByLabelText('Message')).toBeDisabled();
  },
};

export const NothingWrittenYet: Story = { args: { messages: [] } };

export const NothingWrittenAndOver: Story = { args: { messages: [], now: '2026-11-03T13:40:00Z' } };

export const Loading: Story = { args: { status: 'loading', messages: [] } };

export const LoadFailed: Story = { args: { status: 'error', messages: [] } };

export const RefreshFailedKeepsTheMessages: Story = { args: { refreshFailed: true } };

export const ManyMessages: Story = {
  args: {
    messages: Array.from({ length: 12 }, (_, index) => ({
      ...MESSAGES[index % MESSAGES.length],
      id: `many-${index}`,
      sentAt: `2026-11-03T13:${String(1 + index).padStart(2, '0')}:00Z`,
    })),
  },
};
