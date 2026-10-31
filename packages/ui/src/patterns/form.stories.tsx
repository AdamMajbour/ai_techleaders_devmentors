import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { z } from 'zod';
import { apiScenario } from '../../.storybook/blocks/mockApi';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { apiCall } from '../backend/api';
import { CrudForm } from '../backend/forms';

// The pattern: a mentor edits their profile. Every answer the API can give has its own story.
const schema = z.object({
  headline: z.string().trim().min(3, 'Write at least 3 characters.').max(80, 'Use at most 80 characters.'),
  technologies: z.string().trim().min(1, 'Add at least one technology.'),
  bio: z.string().trim().max(500, 'Use at most 500 characters.'),
});

const fields = [
  { name: 'headline', label: 'Headline', requirement: 'required' as const, hint: 'Seekers see this on your card in the list.' },
  { name: 'technologies', label: 'Technologies', requirement: 'required' as const, hint: 'Separate with spaces, for example: python postgresql', placeholder: 'python postgresql' },
  { name: 'bio', label: 'About you', type: 'textarea' as const, requirement: 'optional' as const },
];

function ProfileForm({ initial }: { initial?: Record<string, string> }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex max-w-md flex-col gap-between-groups">
      {saved ? (
        <Alert>
          <AlertTitle>Profile saved</AlertTitle>
          <AlertDescription>Seekers see the new headline now.</AlertDescription>
        </Alert>
      ) : null}
      <CrudForm
        schema={schema}
        fields={fields}
        initialValues={initial}
        submitLabel="Save profile"
        onSubmit={(values) => apiCall('/api/mentors/me', { method: 'PUT', json: values })}
        onSuccess={() => setSaved(true)}
      />
    </div>
  );
}

const meta = {
  title: 'Patterns/Form',
  component: ProfileForm,
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const FILLED = { headline: 'Senior Python engineer', technologies: 'python postgresql', bio: '' };

export const Initial: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Headline (required)')).toHaveAccessibleDescription('Seekers see this on your card in the list.');
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const ValidationOnLeavingAField: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Headline (required)'), 'ab');
    await expect(canvas.getByLabelText('Headline (required)')).not.toHaveAttribute('aria-invalid');
    await userEvent.tab();
    await expect(canvas.getByLabelText('Headline (required)')).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('alert')).toHaveTextContent('Write at least 3 characters.');
    await expect(canvas.getByLabelText('Technologies (required)')).not.toHaveAttribute('aria-invalid');
  },
};

export const FailedSubmitMovesFocusToTheFirstError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('About you (optional)'), 'I answer questions about ingress controllers.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(canvas.getByLabelText('Headline (required)')).toHaveFocus());
    await expect(canvas.getAllByRole('alert')).toHaveLength(2);
    await expect(canvas.getByLabelText('About you (optional)')).toHaveValue('I answer questions about ingress controllers.');
  },
};

export const Submitting: Story = {
  args: { initial: FILLED },
  beforeEach: apiScenario('pending'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save profile' }));
    const button = await canvas.findByRole('button', { name: 'Saving…' });
    await expect(button).toBeDisabled();
    await expect(canvas.getByLabelText('Headline (required)')).toBeDisabled();
  },
};

export const SuccessAfterServerConfirms: Story = {
  args: { initial: FILLED },
  beforeEach: apiScenario('success'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Profile saved')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Save profile' }));
    await expect(await canvas.findByText('Profile saved')).toBeVisible();
  },
};

export const ServerFieldError: Story = {
  args: { initial: FILLED },
  beforeEach: apiScenario('fieldError'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save profile' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('This headline is already used by another mentor.');
    await waitFor(() => expect(canvas.getByLabelText('Headline (required)')).toHaveFocus());
    await expect(canvas.getByLabelText('Headline (required)')).toHaveValue('Senior Python engineer');
  },
};

export const ServerError: Story = {
  args: { initial: FILLED },
  beforeEach: apiScenario('serverError'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save profile' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Something went wrong on our side. Try again in a minute.');
    await expect(canvas.getByLabelText('Technologies (required)')).toHaveValue('python postgresql');
    await expect(canvas.getByRole('button', { name: 'Save profile' })).toBeEnabled();
  },
};

export const NoNetwork: Story = {
  args: { initial: FILLED },
  beforeEach: apiScenario('offline'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Save profile' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The server could not be reached.');
    await expect(canvas.getByLabelText('Headline (required)')).toHaveValue('Senior Python engineer');
  },
};

export const LongTextNarrow: Story = {
  args: { initial: { headline: 'Senior platform engineer who has upgraded ingress controllers on bare metal clusters', technologies: 'kubernetes python postgresql terraform', bio: 'I answer the same few questions about ingress, certificates and rollouts every month. '.repeat(3) } },
  render: (args) => (
    <div className="w-80">
      <ProfileForm {...args} />
    </div>
  ),
};
