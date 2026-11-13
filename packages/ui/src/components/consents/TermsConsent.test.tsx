import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TermsConsent } from './TermsConsent';

describe('TermsConsent', () => {
  it('is an unticked checkbox with a visible sentence and a link to the full terms', () => {
    render(<TermsConsent checked={false} onCheckedChange={jest.fn()} termsHref="/terms" />);
    expect(screen.getByRole('checkbox', { name: 'I accept the pilot terms' })).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'pilot terms' })).toHaveAttribute('href', '/terms');
  });

  it('reports a change as a boolean', async () => {
    const onCheckedChange = jest.fn();
    render(<TermsConsent checked={false} onCheckedChange={onCheckedChange} termsHref="/terms" />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  // fireEvent, not userEvent: browsers do not pass a click on a link inside a label on to the control,
  // jsdom does not either, but user-event emulates it and would report a tick that cannot happen.
  it('opening the terms does not accept them', () => {
    const onCheckedChange = jest.fn();
    render(<TermsConsent checked={false} onCheckedChange={onCheckedChange} termsHref="#terms" />);
    fireEvent.click(screen.getByRole('link', { name: 'pilot terms' }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('shows the owner’s hint and an error that says what to do', () => {
    render(
      <TermsConsent
        checked={false}
        onCheckedChange={jest.fn()}
        termsHref="/terms"
        hint="Your question is kept until 30 days after the pilot ends."
        error="Tick the box to continue."
      />,
    );
    const box = screen.getByRole('checkbox');
    expect(box).toBeInvalid();
    expect(box).toHaveAccessibleDescription('Your question is kept until 30 days after the pilot ends. Tick the box to continue.');
  });
});
