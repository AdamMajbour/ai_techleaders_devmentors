import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { ApiResult } from '../../backend/api/types';
import { NOTICE_DRAFT_LABEL, NOTICE_ITEMS, NOTICE_VERSION } from '../../../.storybook/blocks/sampleData';
import { PublishNoticePanel, type PublishNoticePanelProps } from './PublishNoticePanel';

const ok: ApiResult<unknown> = { ok: true, status: 200, data: { status: 'published' } };

const meta = {
  title: 'Product/Notes/PublishNoticePanel',
  component: PublishNoticePanel,
  args: {
    noticeItems: NOTICE_ITEMS,
    noticeVersion: NOTICE_VERSION,
    termsVersionId: '00000000-0000-4000-8000-000000000001',
    termsSha256: 'a'.repeat(64),
    onPublish: fn(async () => ok) as PublishNoticePanelProps['onPublish'],
    onSuccess: fn(),
  },
  render: (args) => (
    <div className="flex max-w-session flex-col gap-between-groups">
      <p className="m-0 text-label text-muted-foreground">{NOTICE_DRAFT_LABEL}</p>
      <PublishNoticePanel {...args} />
    </div>
  ),
} satisfies Meta<typeof PublishNoticePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotYetAgreed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('checkbox').every((box) => box.getAttribute('aria-checked') === 'false')).toBe(true);
    await expect(canvas.getByRole('button', { name: 'Publish note' })).toHaveAccessibleDescription('Read and accept both items to publish');
  },
};

export const PublishesAfterTheMentorAgrees: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('checkbox')[0]);
    await userEvent.click(canvas.getAllByRole('checkbox')[1]);
    await userEvent.click(canvas.getByRole('button', { name: 'Publish note' }));
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
    await expect(args.onPublish).toHaveBeenCalledWith({ consent: true, noticeVersion: NOTICE_VERSION, acceptedTerms: true, termsVersionId: '00000000-0000-4000-8000-000000000001', termsSha256: 'a'.repeat(64) });
  },
};

export const Publishing: Story = {
  args: { onPublish: () => new Promise<ApiResult<unknown>>(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('checkbox')[0]);
    await userEvent.click(canvas.getAllByRole('checkbox')[1]);
    await userEvent.click(canvas.getByRole('button', { name: 'Publish note' }));
    await expect(canvas.getByRole('button', { name: 'Publishing…' })).toBeDisabled();
  },
};

export const NoticeChangedMeanwhile: Story = {
  args: { onPublish: async () => ({ ok: false, status: 409, error: { code: 'notice_changed', message: 'The notice changed. Read it again before you publish.' } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('checkbox')[0]);
    await userEvent.click(canvas.getAllByRole('checkbox')[1]);
    await userEvent.click(canvas.getByRole('button', { name: 'Publish note' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The notice changed');
  },
};

export const ServerUnreachable: Story = {
  args: { onPublish: async () => ({ ok: false, status: 0, error: { code: 'network_error', message: 'The server could not be reached. Check your connection and try again.' } }) },
};

export const PublishingNotOpenYet: Story = {
  args: { blockedReason: 'Publishing opens when the notice has been reviewed.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole('checkbox')[0]);
    await expect(canvas.getByRole('button', { name: 'Publish note' })).toHaveAccessibleDescription('Publishing opens when the notice has been reviewed.');
  },
};

export const NarrowScreen: Story = {
  render: (args) => (
    <div className="w-80">
      <PublishNoticePanel {...args} />
    </div>
  ),
};
