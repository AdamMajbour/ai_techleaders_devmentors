import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from './button';

describe('buttonVariants', () => {
  it('applies the default variant and size', () => {
    const classes = buttonVariants();
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('min-h-control ');
  });

  it('applies the requested variant and size', () => {
    const classes = buttonVariants({ variant: 'destructive', size: 'lg' });
    expect(classes).toContain('bg-destructive');
    expect(classes).toContain('min-h-control ');
    expect(classes).not.toContain('bg-primary ');
  });
});

describe('buttonVariants sizes', () => {
  it('uses at least the compact control height for sm and the default one otherwise', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('min-h-control-compact');
    expect(buttonVariants({ size: 'default' })).not.toContain('min-h-control-compact');
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

  describe('with disabledReason', () => {
    it('is blocked but stays focusable, and shows the reason as text linked to the button', async () => {
      const onClick = jest.fn();
      render(
        <Button disabledReason="Add a question first" onClick={onClick}>
          Pay
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Pay' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toBeDisabled();
      expect(screen.getByText('Add a question first')).toBeVisible();
      expect(button).toHaveAccessibleDescription('Add a question first');

      await userEvent.tab();
      expect(button).toHaveFocus();
    });

    it('does not call onClick by mouse or by keyboard', async () => {
      const onClick = jest.fn();
      render(
        <Button disabledReason="Add a question first" onClick={onClick}>
          Pay
        </Button>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not submit a form', async () => {
      const onSubmit = jest.fn((event: { preventDefault: () => void }) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" disabledReason="Fill in the form">
            Send
          </Button>
        </form>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Send' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('keeps an existing aria-describedby next to the reason', () => {
      render(
        <>
          <p id="note">Price is fixed</p>
          <Button aria-describedby="note" disabledReason="Not yet">
            Pay
          </Button>
        </>,
      );
      expect(screen.getByRole('button', { name: 'Pay' })).toHaveAccessibleDescription('Price is fixed Not yet');
    });

    it('renders no wrapper or reason when there is no reason', () => {
      const { container } = render(<Button>Pay</Button>);
      expect(container.firstElementChild?.tagName).toBe('BUTTON');
      expect(screen.getByRole('button', { name: 'Pay' })).not.toHaveAttribute('aria-disabled');
    });
  });
});

describe('destructive hover', () => {
  // The fill at 90% has 3.95:1 with its text in the dark theme (axe, WCAG 1.4.3), so hover must not change the fill.
  it('underlines the label and does not change the fill', () => {
    const classes = buttonVariants({ variant: 'destructive' });
    expect(classes).toContain('hover:underline');
    expect(classes).not.toMatch(/hover:bg-/);
  });
});
