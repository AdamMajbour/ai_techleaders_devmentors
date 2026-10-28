import { render, screen } from '@testing-library/react';
import { TextLink } from './text-link';

describe('TextLink', () => {
  it('renders an underlined link, so colour is not the only sign', () => {
    render(<TextLink href="/terms">Terms</TextLink>);
    const link = screen.getByRole('link', { name: 'Terms' });
    expect(link).toHaveAttribute('href', '/terms');
    expect(link).toHaveClass('underline', 'text-link');
  });

  it('passes the styles to the child element with asChild', () => {
    render(
      <TextLink asChild>
        <a href="/docs">Docs</a>
      </TextLink>,
    );
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveClass('underline');
  });

  it('merges a custom className', () => {
    render(
      <TextLink href="/x" className="font-strong">
        X
      </TextLink>,
    );
    expect(screen.getByRole('link', { name: 'X' })).toHaveClass('underline', 'font-strong');
  });
});
