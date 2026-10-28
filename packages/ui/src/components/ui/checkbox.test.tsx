import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('toggles by click and reports its state', async () => {
    const onCheckedChange = jest.fn();
    render(<Checkbox aria-label="I agree" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'I agree' });
    expect(box).not.toBeChecked();

    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    await userEvent.click(box);
    expect(box).not.toBeChecked();
  });

  it('toggles with the space key after tabbing to it', async () => {
    render(<Checkbox aria-label="I agree" />);
    await userEvent.tab();
    expect(screen.getByRole('checkbox', { name: 'I agree' })).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('checkbox', { name: 'I agree' })).toBeChecked();
  });

  it('shows a check mark only when checked, so state is not colour alone', async () => {
    const { container } = render(<Checkbox aria-label="I agree" />);
    expect(container.querySelector('svg')).toBeNull();
    await userEvent.click(screen.getByRole('checkbox', { name: 'I agree' }));
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('cannot be toggled when disabled', async () => {
    render(<Checkbox aria-label="I agree" disabled />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'I agree' }));
    expect(screen.getByRole('checkbox', { name: 'I agree' })).not.toBeChecked();
  });

  it('can be marked invalid', () => {
    render(<Checkbox aria-label="I agree" aria-invalid="true" />);
    expect(screen.getByRole('checkbox', { name: 'I agree' })).toBeInvalid();
  });
});
