import type { Meta, StoryObj } from '@storybook/react-vite';
import { MESSAGES, SESSION } from '../../../.storybook/blocks/sampleData';
import { MessageItem } from './MessageItem';

const meta = {
  title: 'Product/Messages/MessageItem',
  component: MessageItem,
  args: { authorName: 'Ada Kowalska', sentAt: '2026-11-03T13:04:00Z', text: 'What does the last line say?', timeZone: SESSION.timeZone },
  render: (args) => (
    <ol className="m-0 max-w-session list-none p-0">
      <MessageItem {...args} />
    </ol>
  ),
} satisfies Meta<typeof MessageItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const OwnMessage: Story = { args: { authorName: 'Sam', own: true } };

export const WithCode: Story = { args: { text: MESSAGES[1].text } };

export const LongUnbrokenLineNarrow: Story = {
  args: { text: 'error: failed to solve: process "/bin/sh -c npm ci --omit=dev --no-audit --no-fund --loglevel=verbose" did not complete successfully: exit code: 1' },
  render: (args) => (
    <ol className="m-0 w-80 list-none p-0">
      <MessageItem {...args} />
    </ol>
  ),
};

export const ManyInARow: Story = {
  render: () => (
    <ol className="m-0 max-w-session list-none p-0">
      {MESSAGES.map((message) => (
        <MessageItem key={message.id} authorName={message.authorName} sentAt={message.sentAt} text={message.text} own={message.authorId === 'seeker'} timeZone={SESSION.timeZone} />
      ))}
    </ol>
  ),
};
