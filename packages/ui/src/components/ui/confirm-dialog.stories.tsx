import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';

const framed = { docs: { story: { inline: false, height: '420px' } } } as const;

const meta = {
  title: 'Primitives/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: 'Take down "Ingress upgrade notes"?',
    description: 'Pending answers that cite this note are cancelled and refunded. Answers already sold stay.',
    confirmLabel: 'Take down note',
    tone: 'destructive',
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  parameters: framed,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('alertdialog', { name: 'Take down "Ingress upgrade notes"?' });
    await expect(dialog).toHaveAccessibleDescription(/cancelled and refunded/);
    await expect(body.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  },
};

export const Default: Story = {
  parameters: framed,
  args: {
    tone: 'default',
    title: 'Send your question to Ada?',
    description: 'You pay 25 PLN now. If the mentor does not answer in time, you are refunded.',
    confirmLabel: 'Pay 25 PLN and send',
  },
};

export const Pending: Story = {
  parameters: framed,
  args: { pending: true, pendingLabel: 'Taking down…' },
};

export const WithError: Story = {
  parameters: framed,
  args: { error: 'The note could not be taken down. Check your connection and try again.' },
};

export const LongTitleNarrow: Story = {
  parameters: framed,
  args: {
    title: 'Cancel your paid vault answer "Why does my ingress upgrade fail after the admission webhook starts on staging?"',
    description: 'The answer has not been released yet. Your 10 PLN is returned to your card within a few days.',
    confirmLabel: 'Cancel answer and refund',
    cancelLabel: 'Keep the answer',
  },
};

function ConfirmFlowExample() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col items-start gap-group p-panel-roomy">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Take down note
      </Button>
      {done ? <p className="text-body">The note was taken down.</p> : null}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={'Take down "Ingress upgrade notes"?'}
        description="Answers already sold stay."
        confirmLabel="Take down note"
        tone="destructive"
        onConfirm={() => {
          setDone(true);
          setOpen(false);
        }}
      />
    </div>
  );
}

export const ConfirmFlow: Story = {
  parameters: framed,
  render: () => <ConfirmFlowExample />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Take down note' }));
    // While the dialog is open the page behind it is aria-hidden, so only the dialog's button matches.
    await userEvent.click(await body.findByRole('button', { name: 'Take down note' }));
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
    await expect(within(canvasElement).getByText('The note was taken down.')).toBeVisible();
  },
};
