import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, type ConfirmDialogProps } from './confirm-dialog';

function setup(props: Partial<ConfirmDialogProps> = {}) {
  const onConfirm = jest.fn();
  const onOpenChange = jest.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={'Take down "Ingress upgrade notes"?'}
      description="Pending answers that cite it are cancelled and refunded. Answers already sold stay."
      confirmLabel="Take down note"
      tone="destructive"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe('ConfirmDialog', () => {
  it('is an alert dialog that names the object and describes the consequence', () => {
    setup();
    const dialog = screen.getByRole('alertdialog', { name: 'Take down "Ingress upgrade notes"?' });
    expect(dialog).toHaveAccessibleDescription(/cancelled and refunded/);
  });

  it('starts with focus on the way out, the least destructive action', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('names the action with a verb, not OK', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Take down note' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ok$/i })).not.toBeInTheDocument();
  });

  it('runs onConfirm and stays open until the caller closes it', async () => {
    const { onConfirm, onOpenChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Take down note' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('reports a request to close on Cancel and on Escape', async () => {
    const { onConfirm, onOpenChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('blocks both buttons while pending, so it cannot be sent twice', async () => {
    const { onConfirm } = setup({ pending: true, pendingLabel: 'Taking down…' });
    expect(screen.getByRole('button', { name: 'Taking down…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Taking down…' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows why it failed inside the dialog, which stays open', () => {
    setup({ error: 'The note could not be taken down. Try again.' });
    expect(screen.getByRole('alert')).toHaveTextContent('The note could not be taken down. Try again.');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('uses the destructive style for a destructive action and the default one otherwise', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Take down note' })).toHaveClass('bg-destructive');
  });

  it('renders nothing when closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
