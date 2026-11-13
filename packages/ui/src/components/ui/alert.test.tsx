import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription, AlertTitle } from './alert';

describe('Alert', () => {
  it('is a polite status by default', () => {
    render(
      <Alert>
        <AlertTitle>Test mode</AlertTitle>
        <AlertDescription>Payments are not real.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Test mode');
    expect(screen.getByRole('status')).toHaveTextContent('Payments are not real.');
  });

  it('is announced at once when destructive', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>Check the card and try again.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Payment failed');
  });

  it('hides its icon from assistive technology', () => {
    const { container } = render(<Alert>Message</Alert>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no shadow and a destructive outline when destructive', () => {
    render(<Alert variant="destructive">x</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-destructive');
    expect(alert.className).not.toMatch(/shadow/);
  });

  it('lets the role be overridden', () => {
    render(<Alert role="alert">x</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
