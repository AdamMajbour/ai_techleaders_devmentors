import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PREVIEW_STATES, StateMatrix } from '../../../.storybook/blocks/StateMatrix';
import { Checkbox } from './checkbox';

const meta = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  args: { 'aria-label': 'I agree', onCheckedChange: fn() },
  argTypes: { disabled: { control: 'boolean' }, checked: { control: 'boolean' } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithVisibleLabel: Story = {
  render: () => (
    <label className="flex max-w-sm items-start gap-group text-body">
      <Checkbox />
      <span>I understand that the AI writes the answer and that my name and the note title are shown to the seeker.</span>
    </label>
  ),
};

export const States: Story = {
  render: () => (
    <StateMatrix states={[PREVIEW_STATES.default, PREVIEW_STATES.focus, PREVIEW_STATES.disabled, PREVIEW_STATES.invalid]}>
      {(props, state) => (
        <div className="flex gap-between-groups">
          <Checkbox aria-label={`${state.name} unchecked`} {...props} />
          <Checkbox aria-label={`${state.name} checked`} defaultChecked {...props} />
        </div>
      )}
    </StateMatrix>
  ),
};

export const LongLabelNarrow: Story = {
  render: () => (
    <label className="flex w-72 items-start gap-group text-body">
      <Checkbox />
      <span>I accept the pilot terms, the handling of my payment data and that my question is kept until 30 days after the pilot ends.</span>
    </label>
  ),
};

export const ToggleByClickAndSpace: Story = {
  play: async ({ args, canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox', { name: 'I agree' });
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(true);
    await userEvent.keyboard(' ');
    await expect(box).not.toBeChecked();
  },
};
