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
    expect(screen.getAllByText(/./, { selector: 'p' }).length).toBeGreaterThanOrEqual(2);
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
});
