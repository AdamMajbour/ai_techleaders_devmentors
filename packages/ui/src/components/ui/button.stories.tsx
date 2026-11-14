import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PREVIEW_STATES, StateMatrix } from '../../../.storybook/blocks/StateMatrix';
import { Button } from './button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Pay 25 PLN', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['default', 'outline', 'ghost', 'destructive', 'secondary', 'link'] },
    size: { control: 'select', options: ['default', 'sm', 'icon', 'lg'] },
    disabledReason: { control: 'text' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const SHOWN_VARIANTS = ['default', 'outline', 'ghost', 'destructive'] as const;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-between-groups">
      <Button>Pay 25 PLN</Button>
      <Button variant="outline">Save draft</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Cancel booking</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-between-groups">
      <Button>Default, 40 px</Button>
      <Button size="sm">Compact, 32 px</Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-between-groups">
      {SHOWN_VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col gap-group">
          <p className="text-label font-strong text-headline">{variant}</p>
          <StateMatrix states={[PREVIEW_STATES.default, PREVIEW_STATES.hover, PREVIEW_STATES.focus, PREVIEW_STATES.disabled]}>
            {(props) => (
              <Button variant={variant} {...props}>
                Label
              </Button>
            )}
          </StateMatrix>
        </div>
      ))}
    </div>
  ),
};

export const BlockedWithReason: Story = {
  args: { disabledReason: 'Write your question to continue' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Pay 25 PLN' });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveAccessibleDescription('Write your question to continue');
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const ClickAndKeyboard: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Pay 25 PLN' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};

export const LongLabelNarrow: Story = {
  args: { children: 'Pay 25 PLN and send the question to the mentor now' },
  render: (args) => (
    <div className="w-80">
      <Button {...args} className="w-full" />
    </div>
  ),
};
