import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PREVIEW_STATES, StateMatrix } from '../../../.storybook/blocks/StateMatrix';
import { Select } from './select';

const meta = {
  title: 'Primitives/Select',
  component: Select,
  args: { 'aria-label': 'Technology', defaultValue: '' },
  argTypes: { density: { control: 'inline-radio', options: ['default', 'compact'] }, disabled: { control: 'boolean' } },
  render: (args) => (
    <div className="w-64">
      <Select {...args}>
        <option value="">All technologies</option>
        <option value="python">Python</option>
        <option value="react">React</option>
        <option value="kubernetes">Kubernetes</option>
      </Select>
    </div>
  ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Densities: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-between-groups">
      <Select aria-label="Default, 40 px" defaultValue="">
        <option value="">Default, 40 px</option>
      </Select>
      <Select aria-label="Compact, 32 px" density="compact" defaultValue="">
        <option value="">Compact, 32 px</option>
      </Select>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <StateMatrix states={[PREVIEW_STATES.default, PREVIEW_STATES.focus, PREVIEW_STATES.disabled, PREVIEW_STATES.invalid]}>
      {(props, state) => (
        <div className="w-56">
          <Select aria-label={state.name} defaultValue="" {...props}>
            <option value="">{state.name}</option>
          </Select>
        </div>
      )}
    </StateMatrix>
  ),
};

export const LongOptionNarrow: Story = {
  render: () => (
    <div className="w-72">
      <Select aria-label="Technology" defaultValue="long">
        <option value="long">Kubernetes ingress controllers, admission webhooks and upgrades between minor versions</option>
      </Select>
    </div>
  ),
};

export const Choosing: Story = {
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByRole('combobox', { name: 'Technology' });
    await userEvent.selectOptions(select, 'python');
    await expect(select).toHaveValue('python');
  },
};
