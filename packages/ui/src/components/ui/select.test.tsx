import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './select';

function Technologies(props: { density?: 'default' | 'compact'; disabled?: boolean }) {
  return (
    <Select aria-label="Technology" defaultValue="" {...props}>
      <option value="">All technologies</option>
      <option value="python">Python</option>
      <option value="react">React</option>
    </Select>
  );
}

describe('Select', () => {
  it('lets the user pick an option', async () => {
    render(<Technologies />);
    const select = screen.getByRole('combobox', { name: 'Technology' });
    await userEvent.selectOptions(select, 'python');
    expect(select).toHaveValue('python');
  });

  it('is 40 px high by default and 32 px high when compact', () => {
    const { rerender } = render(<Technologies />);
    expect(screen.getByRole('combobox', { name: 'Technology' })).toHaveClass('h-control');
    rerender(<Technologies density="compact" />);
    expect(screen.getByRole('combobox', { name: 'Technology' })).toHaveClass('h-control-compact');
  });

  it('hides the decorative arrow from assistive technology', () => {
    const { container } = render(<Technologies />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('cannot be changed when disabled', async () => {
    render(<Technologies disabled />);
    const select = screen.getByRole('combobox', { name: 'Technology' });
    await userEvent.selectOptions(select, 'react');
    expect(select).toHaveValue('');
  });
});
