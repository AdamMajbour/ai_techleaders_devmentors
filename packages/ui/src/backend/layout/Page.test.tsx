import { render, screen } from '@testing-library/react';
import { Page } from './Page';

describe('Page', () => {
  it('is a main landmark with one h1 and the content width by default', () => {
    render(<Page title="My sessions">body</Page>);
    expect(screen.getByRole('main')).toHaveClass('max-w-content');
    expect(screen.getByRole('heading', { level: 1, name: 'My sessions' })).toBeInTheDocument();
  });

  it('uses the session width when narrow', () => {
    render(<Page title="Your payment" narrow>body</Page>);
    expect(screen.getByRole('main')).toHaveClass('max-w-session');
  });
});
