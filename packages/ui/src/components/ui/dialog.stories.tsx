import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from './button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Field } from './field';
import { Input } from './input';

// A dialog covers the page, so its docs previews render in their own frame.
const framed = { docs: { story: { inline: false, height: '420px' } } } as const;

const meta = {
  title: 'Primitives/Dialog',
  component: Dialog,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  parameters: framed,
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish note</DialogTitle>
          <DialogDescription>Your note will feed AI answers. You see every answer that cites it before the seeker does.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Publish note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Publish note' });
    await expect(dialog).toHaveAccessibleDescription(/feed AI answers/);
  },
};

export const OpensFromItsTrigger: Story = {
  parameters: framed,
  render: () => (
    <div className="p-panel-roomy">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Edit headline</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit headline</DialogTitle>
            <DialogDescription>Seekers see the headline on your card in the list.</DialogDescription>
          </DialogHeader>
          <Field label="Headline" requirement="required">
            <Input defaultValue="Senior Python engineer" />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button>Save headline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = within(canvasElement).getByRole('button', { name: 'Edit headline' });
    await userEvent.click(trigger);
    await expect(await body.findByRole('dialog', { name: 'Edit headline' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};

export const LongContentNarrow: Story = {
  parameters: framed,
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilot terms for mentors, payments and the notes that feed AI answers</DialogTitle>
          <DialogDescription>
            {'Read these terms before you publish a note. '.repeat(12)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button>I have read the terms</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
