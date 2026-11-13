import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { ApiResult } from '../../backend/api/types';
import { NOTE_BODY } from '../../../.storybook/blocks/sampleData';
import { NoteEditor, type NoteEditorProps } from './NoteEditor';

const ok: ApiResult<unknown> = { ok: true, status: 200, data: {} };

const meta = {
  title: 'Product/Notes/NoteEditor',
  component: NoteEditor,
  args: {
    onSave: fn(async () => ok) as NoteEditorProps['onSave'],
    onSuccess: fn(),
  },
  render: (args) => (
    <div className="max-w-session">
      <NoteEditor {...args} />
    </div>
  ),
} satisfies Meta<typeof NoteEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewNote: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Title/), 'Ingress upgrades on bare metal');
    await userEvent.type(canvas.getByLabelText(/Note/), 'Read the previous logs first.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
    await expect(args.onSave).toHaveBeenCalledWith({ title: 'Ingress upgrades on bare metal', body: 'Read the previous logs first.' });
  },
};

export const Draft: Story = { args: { status: 'draft', initialValues: { title: 'Reading admission webhook logs', body: NOTE_BODY } } };

export const Published: Story = { args: { status: 'published', initialValues: { title: 'Ingress upgrades on bare metal', body: NOTE_BODY } } };

export const TakenDown: Story = { args: { status: 'taken_down', initialValues: { title: 'Cert-manager renewals that silently fail', body: NOTE_BODY } } };

export const MissingFieldsAreNamed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save draft' }));
    await expect(await canvas.findByText('Give the note a title.')).toBeVisible();
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};

export const ServerRefuses: Story = {
  args: {
    onSave: async () => ({ ok: false, status: 400, error: { code: 'validation_failed', message: 'Check the note.', fieldErrors: { title: ['You already have a note with this title.'] } } }),
    initialValues: { title: 'Ingress upgrades on bare metal', body: NOTE_BODY },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save draft' }));
    await expect(await canvas.findByText('You already have a note with this title.')).toBeVisible();
    await expect(canvas.getByLabelText(/Note/)).toHaveValue(NOTE_BODY);
  },
};

export const LongTitleNarrow: Story = {
  args: { status: 'draft', initialValues: { title: 'What to check before, during and after an ingress-nginx upgrade on bare metal clusters with custom admission webhooks', body: NOTE_BODY } },
  render: (args) => (
    <div className="w-80">
      <NoteEditor {...args} />
    </div>
  ),
};
