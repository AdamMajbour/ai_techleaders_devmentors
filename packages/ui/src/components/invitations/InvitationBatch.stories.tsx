import type { Meta, StoryObj } from '@storybook/react';
import { InvitationBatch, type InvitationBatchSection } from './InvitationBatch';

const openBatch: InvitationBatchSection = {
  title: 'Batch 1',
  state: 'Open',
  sent: 2,
  accepted: 1,
  published: 1,
  invitations: [
    { id: 'one', email: 'ada@example.com', displayName: 'Ada Lovelace', stackTags: ['TypeScript', 'Python'], status: 'Published a slot', acceptedAt: '2026-11-01T12:00:00.000Z', publishDueAt: '2026-11-15T12:00:00.000Z' },
    { id: 'two', email: 'grace@example.com', displayName: null, stackTags: ['Next.js'], status: 'Waiting for acceptance', acceptedAt: null, publishDueAt: null },
  ],
};

const meta = {
  title: 'Invitations/InvitationBatch',
  component: InvitationBatch,
  args: { section: openBatch },
} satisfies Meta<typeof InvitationBatch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const Full: Story = { args: { section: { ...openBatch, title: 'Batch 2', state: 'Full', sent: 20 } } };
export const Stopped: Story = { args: { section: { ...openBatch, title: 'Batch 1', state: 'Stopped' } } };
export const CreatedBeforeBatches: Story = {
  args: {
    section: {
      title: 'Created before batches',
      invitations: [{ id: 'legacy', email: 'legacy@example.com', displayName: null, stackTags: [], status: 'Expired, not accepted', acceptedAt: null, publishDueAt: null }],
    },
  },
};
