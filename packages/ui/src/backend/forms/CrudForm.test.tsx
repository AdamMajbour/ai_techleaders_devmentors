import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import type { ApiResult } from '../api/types';
import { CrudForm } from './CrudForm';

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  note: z.string().trim().min(3),
});
const fields = [
  { name: 'email', label: 'E-mail', type: 'email' as const },
  { name: 'note', label: 'Note', type: 'textarea' as const },
];
const ok: ApiResult<unknown> = { ok: true, status: 200, data: { saved: true } };

async function fill(email: string, note: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Note'), note);
  return user;
}

describe('CrudForm', () => {
  it('validates with the shared schema and does not submit invalid input', async () => {
    const onSubmit = jest.fn(async () => ok);
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);

    const user = await fill('not-an-email', 'ab');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true');
    // One error sentence per invalid field, each announced (role=alert) by Field.
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('submits the parsed values (normalized by the schema) and reports success', async () => {
    const onSubmit = jest.fn(async () => ok);
    const onSuccess = jest.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onSuccess={onSuccess} submitLabel="Send" />);

    const user = await fill('  Ada@Example.COM ', '  hello  ');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ saved: true }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', note: 'hello' });
  });

  it('shows server field errors next to the right field and keeps the values', async () => {
    const onSubmit = jest.fn(async (): Promise<ApiResult<unknown>> => ({
      ok: false,
      status: 400,
      error: { code: 'validation_failed', message: 'bad', fieldErrors: { note: ['Already taken'] } },
    }));
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);

    const user = await fill('a@b.co', 'hello');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const note = await screen.findByLabelText('Note');
    expect(note).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Already taken')).toBeInTheDocument();
    expect(note).toHaveValue('hello');
    expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
  });

  it('shows a server message without field errors once, for the whole form', async () => {
    const onSubmit = jest.fn(async (): Promise<ApiResult<unknown>> => ({
      ok: false,
      status: 401,
      error: { code: 'unauthorized', message: 'Invalid credentials.' },
    }));
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);

    const user = await fill('a@b.co', 'hello');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.');
  });

  it('disables the form while submitting and ignores a second submit', async () => {
    let finish: (result: ApiResult<unknown>) => void = () => undefined;
    const onSubmit = jest.fn(() => new Promise<ApiResult<unknown>>((resolve) => (finish = resolve)));
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);

    const user = await fill('a@b.co', 'hello');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByLabelText('Note')).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    finish(ok);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  });

  it('submits with Ctrl+Enter and cancels with Escape', async () => {
    const onSubmit = jest.fn(async () => ok);
    const onCancel = jest.fn();
    render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onCancel={onCancel} />);

    const user = await fill('a@b.co', 'hello');
    await user.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('starts from the initial values and has a Cancel button only when asked', () => {
    const { rerender } = render(<CrudForm schema={schema} fields={fields} initialValues={{ note: 'draft' }} onSubmit={async () => ok} />);
    expect(screen.getByLabelText('Note')).toHaveValue('draft');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    rerender(<CrudForm schema={schema} fields={fields} onSubmit={async () => ok} onCancel={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  describe('the Form pattern', () => {
    it('shows the hint under the label and the requirement next to it', () => {
      render(
        <CrudForm
          schema={schema}
          onSubmit={jest.fn(async () => ok)}
          fields={[{ name: 'note', label: 'Note', type: 'textarea', hint: 'At least three characters', requirement: 'required' }]}
        />,
      );
      const note = screen.getByLabelText('Note (required)');
      expect(note).toHaveAccessibleDescription('At least three characters');
    });

    it('validates a field when the user leaves a field they edited', async () => {
      render(<CrudForm schema={schema} fields={fields} onSubmit={jest.fn(async () => ok)} />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Note'), 'ab');
      expect(screen.getByLabelText('Note')).not.toHaveAttribute('aria-invalid');
      await user.tab();
      expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('aria-invalid');
    });

    it('does not show an error just because the user tabbed past an untouched field', async () => {
      render(<CrudForm schema={schema} fields={fields} onSubmit={jest.fn(async () => ok)} />);
      const user = userEvent.setup();
      await user.click(screen.getByLabelText('E-mail'));
      await user.tab();
      await user.tab();
      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('clears the error as soon as the user fixes the field', async () => {
      render(<CrudForm schema={schema} fields={fields} onSubmit={jest.fn(async () => ok)} />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Note'), 'ab');
      await user.tab();
      expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true');
      await user.type(screen.getByLabelText('Note'), 'c');
      expect(screen.getByLabelText('Note')).not.toHaveAttribute('aria-invalid');
    });

    it('moves focus to the first invalid field after a failed submit, and keeps what was typed', async () => {
      render(<CrudForm schema={schema} fields={fields} onSubmit={jest.fn(async () => ok)} />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Note'), 'ab');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(screen.getByLabelText('E-mail')).toHaveFocus());
      expect(screen.getByLabelText('Note')).toHaveValue('ab');
    });

    it('moves focus to the first field with a server error', async () => {
      const onSubmit = jest.fn(async (): Promise<ApiResult<unknown>> => ({
        ok: false,
        status: 400,
        error: { code: 'validation_failed', message: 'bad', fieldErrors: { note: ['Already taken'] } },
      }));
      render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
      const user = await fill('a@b.co', 'hello');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(screen.getByLabelText('Note')).toHaveFocus());
    });

    it('shows a form-level error as an alert and keeps the values after a server failure', async () => {
      const onSubmit = jest.fn(async (): Promise<ApiResult<unknown>> => ({
        ok: false,
        status: 500,
        error: { code: 'internal_error', message: 'Something went wrong on our side.' },
      }));
      render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} />);
      const user = await fill('a@b.co', 'hello');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.');
      expect(screen.getByLabelText('Note')).toHaveValue('hello');
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('reports success only after the server confirmed it', async () => {
      let resolve: (value: ApiResult<unknown>) => void = () => {};
      const onSubmit = jest.fn(() => new Promise<ApiResult<unknown>>((r) => (resolve = r)));
      const onSuccess = jest.fn();
      render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} onSuccess={onSuccess} />);
      const user = await fill('a@b.co', 'hello');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSuccess).not.toHaveBeenCalled();
      resolve(ok);
      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    });
  });
});

