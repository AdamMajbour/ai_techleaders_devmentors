import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MESSAGES, SESSION } from '../../.storybook/blocks/sampleData';
import { SessionView } from '../screens/e01-views';

// The pattern: one column with the conversation in the centre, the time window stated in words, a message box
// that is blocked outside the window with the reason written under it, and a conversation that stays readable.
const meta = { title: 'Patterns/Session thread', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const session = { ...SESSION, mentorName: 'Ada Kowalska', messages: MESSAGES };

export const WindowStatedInWords: Story = {
  render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('12 minutes left. The session ends at 13:25.')).toBeVisible();
  },
};

export const BlockedBeforeTheWindow: Story = {
  render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T12:50:00Z" messages={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Message')).toBeDisabled();
    await expect(canvas.getByLabelText('Message')).toHaveAccessibleDescription(/has not started yet/);
  },
};

export const ReadOnlyAfterTheWindow: Story = {
  render: () => <SessionView {...session} viewerId="mentor" now="2026-11-03T13:40:00Z" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.getByLabelText('Message')).toBeDisabled();
  },
};

export const RefreshFailsAndTheMessagesStay: Story = {
  render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" refreshFailed />,
};

export const Loading: Story = {
  render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" status="loading" />,
};

export const LoadFails: Story = {
  render: () => <SessionView {...session} viewerId="seeker" now="2026-11-03T13:13:00Z" status="error" />,
};
