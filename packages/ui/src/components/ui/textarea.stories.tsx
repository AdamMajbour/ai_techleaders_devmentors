import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PREVIEW_STATES, StateMatrix } from '../../../.storybook/blocks/StateMatrix';
import { Textarea } from './textarea';

const meta = {
  title: 'Primitives/Textarea',
  component: Textarea,
  args: { 'aria-label': 'Question', placeholder: 'Paste the error and what you already tried' },
  argTypes: { disabled: { control: 'boolean' } },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <StateMatrix states={[PREVIEW_STATES.default, PREVIEW_STATES.focus, PREVIEW_STATES.disabled, PREVIEW_STATES.invalid]}>
      {(props, state) => (
        <div className="w-64">
          <Textarea aria-label={state.name} placeholder={state.name} {...props} />
        </div>
      )}
    </StateMatrix>
  ),
};

export const LongContentNarrow: Story = {
  render: () => (
    <div className="w-80">
      <Textarea
        aria-label="Question"
        defaultValue={'kubectl rollout status deploy/ingress-nginx -n ingress\nerror: deployment "ingress-nginx" exceeded its progress deadline\nIngress upgrade from 1.9 to 1.28 fails on staging after the admission webhook starts. '.repeat(3)}
      />
    </div>
  ),
};

export const TypingSeveralLines: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('textbox', { name: 'Question' });
    await userEvent.type(box, 'kubectl get pods{enter}kubectl logs');
    await expect(box).toHaveValue('kubectl get pods\nkubectl logs');
  },
};
