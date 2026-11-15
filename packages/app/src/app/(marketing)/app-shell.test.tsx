import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
jest.mock('next/navigation', () => ({ usePathname: () => '/admin/invitations' }));
jest.mock('./logout-button', () => ({ LogoutButton: () => null }));

describe('AppShell navigation', () => {
  it('shows invitation management only to operators and marks it active', () => {
    const { rerender } = render(<AppShell userName="Ada" roles={{ mentor: false, seeker: false, operator: true }}>Content</AppShell>);
    expect(screen.getByRole('link', { name: 'Invitations' })).toHaveAttribute('href', '/admin/invitations');
    expect(screen.getByRole('link', { name: 'Invitations' })).toHaveAttribute('aria-current', 'page');

    rerender(<AppShell userName="Ada" roles={{ mentor: false, seeker: true, operator: false }}>Content</AppShell>);
    expect(screen.queryByRole('link', { name: 'Invitations' })).not.toBeInTheDocument();
  });
});
