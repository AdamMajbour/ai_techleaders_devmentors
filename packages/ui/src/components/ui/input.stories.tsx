import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PREVIEW_STATES, StateMatrix } from '../../../.storybook/blocks/StateMatrix';
import { Input } from './input';

const meta = {
  title: 'Primitives/Input',
  component: Input,
  args: { 'aria-label': 'Email', placeholder: 'ada@devmentor.local', type: 'email' },
  argTypes: { density: { control: 'inline-radio', options: ['default', 'compact'] }, disabled: { control: 'boolean' } },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Densities: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-between-groups">
      <Input aria-label="Default, 40 px" placeholder="Default, 40 px" />
      <Input aria-label="Compact, 32 px" density="compact" placeholder="Compact, 32 px" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <StateMatrix states={[PREVIEW_STATES.default, PREVIEW_STATES.focus, PREVIEW_STATES.disabled, PREVIEW_STATES.invalid]}>
      {(props, state) => <Input aria-label={state.name} placeholder={state.name} {...props} />}
    </StateMatrix>
  ),
};

export const LongValueNarrow: Story = {
  render: () => (
    <div className="w-80">
      <Input
        aria-label="Repository"
        defaultValue="https://github.com/devmentor-example/ingress-nginx-upgrade-notes/blob/main/README.md"
      />
    </div>
  ),
};

export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: 'Email' });
    await userEvent.type(input, 'ada@devmentor.local');
    await expect(input).toHaveValue('ada@devmentor.local');
  },
};
