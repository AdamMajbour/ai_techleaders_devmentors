import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PREVIEW_STATES, StateMatrix } from '../../../.storybook/blocks/StateMatrix';
import { TextLink } from './text-link';

const meta = {
  title: 'Primitives/TextLink',
  component: TextLink,
  args: { href: '#terms', children: 'pilot terms' },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const InSentence: Story = {
  render: (args) => (
    <p className="max-w-(--measure-text) text-body">
      By paying you accept the <TextLink {...args} />. A mentor reads your question before accepting it.
    </p>
  ),
};

export const States: Story = {
  render: (args) => (
    <StateMatrix states={[PREVIEW_STATES.default, PREVIEW_STATES.hover, PREVIEW_STATES.focus]}>
      {(props) => (
        <TextLink {...args} {...props}>
          Read the pilot terms
        </TextLink>
      )}
    </StateMatrix>
  ),
};

export const LongTextNarrow: Story = {
  args: { children: 'terms of the pilot, payment handling and the retention of your question text' },
  render: (args) => (
    <p className="w-80 text-body">
      See the <TextLink {...args} /> for details.
    </p>
  ),
};

export const KeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'pilot terms' });
    await userEvent.tab();
    await expect(link).toHaveFocus();
    await expect(link).toHaveAttribute('href', '#terms');
  },
};
