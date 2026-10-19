import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from './button';

describe('buttonVariants', () => {
  it('applies the default variant and size', () => {
    const classes = buttonVariants();
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('h-10');
  });

  it('applies the requested variant and size', () => {
    const classes = buttonVariants({ variant: 'destructive', size: 'lg' });
    expect(classes).toContain('bg-destructive');
    expect(classes).toContain('h-11');
    expect(classes).not.toContain('bg-primary ');
  });
});

describe('Button', () => {
  it('renders its children as a button', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  it('applies variant classes and merges a custom className', () => {
    render(
      <Button variant="outline" className="w-full">
        Wide
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Wide' });
    expect(button).toHaveClass('border', 'w-full');
    expect(button).not.toHaveClass('bg-primary');
  });

  it('renders the child element instead of a button with asChild', () => {
    render(
      <Button asChild>
        <a href="/docs">Docs</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveClass('bg-primary');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
