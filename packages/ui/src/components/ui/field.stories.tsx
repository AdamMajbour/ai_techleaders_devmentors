import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Checkbox } from './checkbox';
import { Field } from './field';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';

const meta = {
  title: 'Primitives/Field',
  component: Field,
  args: {
    label: 'Your question',
    hint: 'Paste the error and what you already tried. Do not paste secrets.',
    children: <Textarea />,
  },
  argTypes: {
    requirement: { control: 'inline-radio', options: [undefined, 'required', 'optional'] },
    orientation: { control: 'inline-radio', options: ['stacked', 'inline'] },
    error: { control: 'text' },
  },
  render: (args) => (
    <div className="max-w-md">
      <Field {...args} />
    </div>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Controls: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-between-groups">
      <Field label="Email" requirement="required" hint="We send the sign-in link here">
        <Input type="email" autoComplete="email" />
      </Field>
      <Field label="Your question" requirement="required">
        <Textarea />
      </Field>
      <Field label="Technology" requirement="optional">
        <Select defaultValue="">
          <option value="">All technologies</option>
          <option value="python">Python</option>
        </Select>
      </Field>
      <Field label="I understand that the AI writes the answer" orientation="inline">
        <Checkbox />
      </Field>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-between-groups">
      <Field label="Default">
        <Input />
      </Field>
      <Field label="With a hint" hint="Use the address you were invited with">
        <Input />
      </Field>
      <Field label="Required" requirement="required">
        <Input />
      </Field>
      <Field label="Optional" requirement="optional">
        <Input />
      </Field>
      <Field label="With an error" error="Enter an address like ada@devmentor.local">
        <Input defaultValue="ada@" />
      </Field>
      <Field label="Blocked, with the reason" hint="Locked after the session starts, so the mentor sees the same question">
        <Textarea disabled defaultValue="Why does my ingress upgrade fail?" />
      </Field>
    </div>
  ),
};

export const LongTextNarrow: Story = {
  render: () => (
    <div className="w-80">
      <Field
        label="Describe the problem you are trying to solve and what you have already tried"
        hint="A mentor reads the question before accepting it, so include the error text, the versions you use and the commands you ran."
        error="The question is too short for a mentor to answer. Add the error text and what you tried, then send it again."
      >
        <Textarea />
      </Field>
    </div>
  ),
};

export const LabelAndErrorWiring: Story = {
  args: { label: 'Email', hint: 'Use the invited address', error: 'Enter an address like ada@devmentor.local', children: <Input /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Email');
    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription('Use the invited address Enter an address like ada@devmentor.local');
    await expect(canvas.getByRole('alert')).toHaveTextContent('Enter an address like ada@devmentor.local');
    // Clicking the label is covered in field.test.tsx; storybook's user-event cannot click a label in jsdom.
    await userEvent.tab();
    await expect(input).toHaveFocus();
  },
};
