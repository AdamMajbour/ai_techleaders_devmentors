import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { apiScenario } from '../../.storybook/blocks/mockApi';
import { apiCall } from '../backend/api';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';

// The pattern: a destructive action asks first, names the object, stays open on failure so the user can retry,
// and closes only once the server confirmed. This is the recipe with a real apiCall behind it.
const framed = { docs: { story: { inline: false, height: '420px' } } } as const;

function TakeDownNote({ title = 'Ingress upgrade notes' }: { title?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function takeDown() {
    setPending(true);
    setError(undefined);
    const result = await apiCall('/api/notes/n1/take-down', { method: 'POST', json: {} });
    setPending(false);
    if (result.ok) {
      setDone(true);
      setOpen(false);
    } else {
      setError(`The note could not be taken down. ${result.error.message}`);
    }
  }

  return (
    <div className="flex flex-col items-start gap-group p-panel-roomy">
      <Button variant="destructive" onClick={() => setOpen(true)} disabled={done}>
        Take down note
      </Button>
      {done ? (
        <p role="status" className="m-0 text-body">
          The note was taken down.
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            setOpen(next);
            if (!next) setError(undefined);
          }
        }}
        title={`Take down "${title}"?`}
        description="Pending answers that cite it are cancelled and refunded. Answers already sold stay."
        confirmLabel="Take down note"
        pendingLabel="Taking down…"
        tone="destructive"
        pending={pending}
        error={error}
        onConfirm={takeDown}
      />
    </div>
  );
}

const meta = {
  title: 'Patterns/Confirm destructive action',
  component: TakeDownNote,
  parameters: { layout: 'fullscreen', ...framed },
} satisfies Meta<typeof TakeDownNote>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openDialog(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Take down note' }));
  return within(canvasElement.ownerDocument.body);
}

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement.ownerDocument.body).queryByRole('alertdialog')).not.toBeInTheDocument();
  },
};

export const AsksFirstAndNamesTheObject: Story = {
  play: async ({ canvasElement }) => {
    const body = await openDialog(canvasElement);
    await expect(await body.findByRole('alertdialog', { name: 'Take down "Ingress upgrade notes"?' })).toBeVisible();
    await expect(body.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  },
};

export const CancelClosesWithoutActing: Story = {
  beforeEach: apiScenario('success'),
  play: async ({ canvasElement }) => {
    const body = await openDialog(canvasElement);
    await userEvent.click(await body.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
    await expect(within(canvasElement).queryByText('The note was taken down.')).not.toBeInTheDocument();
  },
};

export const Pending: Story = {
  beforeEach: apiScenario('pending'),
  play: async ({ canvasElement }) => {
    const body = await openDialog(canvasElement);
    await userEvent.click(await body.findByRole('button', { name: 'Take down note' }));
    await expect(await body.findByRole('button', { name: 'Taking down…' })).toBeDisabled();
    await expect(body.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  },
};

export const FailureKeepsTheDialogOpen: Story = {
  beforeEach: apiScenario('serverError'),
  play: async ({ canvasElement }) => {
    const body = await openDialog(canvasElement);
    await userEvent.click(await body.findByRole('button', { name: 'Take down note' }));
    await expect(await body.findByRole('alert')).toHaveTextContent('The note could not be taken down. Something went wrong on our side.');
    await expect(body.getByRole('alertdialog')).toBeVisible();
    await expect(body.getByRole('button', { name: 'Take down note' })).toBeEnabled();
  },
};

export const NoNetworkKeepsTheDialogOpen: Story = {
  beforeEach: apiScenario('offline'),
  play: async ({ canvasElement }) => {
    const body = await openDialog(canvasElement);
    await userEvent.click(await body.findByRole('button', { name: 'Take down note' }));
    await expect(await body.findByRole('alert')).toHaveTextContent('The server could not be reached.');
    await expect(body.getByRole('alertdialog')).toBeVisible();
  },
};

export const ClosesOnlyAfterTheServerConfirmed: Story = {
  beforeEach: apiScenario('success'),
  play: async ({ canvasElement }) => {
    const body = await openDialog(canvasElement);
    await userEvent.click(await body.findByRole('button', { name: 'Take down note' }));
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
    await expect(within(canvasElement).getByText('The note was taken down.')).toBeVisible();
  },
};

export const LongTitleNarrow: Story = {
  args: { title: 'Why does my ingress upgrade fail after the admission webhook starts on a staging cluster with custom certificates' },
};
