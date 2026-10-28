import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  it('lets the user type', async () => {
    render(<Input aria-label="Email" />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    await userEvent.type(input, 'ada@devmentor.local');
    expect(input).toHaveValue('ada@devmentor.local');
  });

  it('is 40 px high by default and 32 px high when compact', () => {
    render(
      <>
        <Input aria-label="Default" />
        <Input aria-label="Compact" density="compact" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Default' })).toHaveClass('h-control');
    expect(screen.getByRole('textbox', { name: 'Compact' })).toHaveClass('h-control-compact');
    expect(screen.getByRole('textbox', { name: 'Compact' })).not.toHaveClass('h-control');
  });

  it('passes aria-invalid through so the invalid outline applies', () => {
    render(<Input aria-label="Email" aria-invalid="true" />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInvalid();
  });

  it('does not accept typing when disabled', async () => {
    render(<Input aria-label="Email" disabled />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    await userEvent.type(input, 'x');
    expect(input).toHaveValue('');
    expect(input).toBeDisabled();
  });

  it('merges a custom className without losing the size role', () => {
    render(<Input aria-label="Email" className="text-meta" />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveClass('text-meta', 'text-foreground');
  });
});
