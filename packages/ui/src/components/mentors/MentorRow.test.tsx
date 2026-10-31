import { render, screen } from '@testing-library/react';
import { MentorRow, type MentorRowData } from './MentorRow';

const mentor: MentorRowData = {
  id: 'm1',
  name: 'Ada',
  headline: 'Upgraded ingress-nginx on bare metal clusters',
  technologies: ['Kubernetes', 'Python'],
  publicWork: { label: 'Technical articles', href: '#articles' },
  activity: 'today',
};

function renderRow(props: Partial<React.ComponentProps<typeof MentorRow>> = {}) {
  return render(
    <ul>
      <MentorRow mentor={mentor} priceMinor={2500} currency="EUR" href="/m/ada" {...props} />
    </ul>,
  );
}

describe('MentorRow', () => {
  it('shows what the mentor did, their technologies and public work, not a rating (N02)', () => {
    const { container } = renderRow();
    expect(screen.getByRole('heading', { level: 3, name: 'Ada' })).toBeVisible();
    expect(screen.getByText('Upgraded ingress-nginx on bare metal clusters')).toBeVisible();
    expect(screen.getByText('Kubernetes · Python')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Technical articles' })).toHaveAttribute('href', '#articles');
    expect(container.textContent).not.toMatch(/★|rating|stars|score|top mentor/i);
  });

  it('shows the price and the session length', () => {
    renderRow({ sessionMinutes: 25 });
    expect(screen.getByText('25 EUR')).toHaveClass('tabular-nums');
    expect(screen.getByText('for 25 minutes of text')).toBeVisible();
  });

  it('links to the mentor’s page with the mentor’s name in the accessible name', () => {
    renderRow();
    const link = screen.getByRole('link', { name: 'Ask a question to Ada' });
    expect(link).toHaveAttribute('href', '/m/ada');
  });

  it.each([
    ['within_hour', 'Active within the hour'],
    ['today', 'Active today'],
    ['earlier', 'Active earlier'],
    ['never', 'Not active yet'],
  ] as const)('words the activity %s and says it is not a promise', (activity, text) => {
    renderRow({ mentor: { ...mentor, activity } });
    expect(screen.getByText(`${text}. Not a promise of reply time.`)).toBeVisible();
  });

  it('leaves out the public work and the activity when there are none', () => {
    renderRow({ mentor: { ...mentor, publicWork: undefined, activity: undefined } });
    expect(screen.queryByText(/Public work/)).not.toBeInTheDocument();
    expect(screen.queryByText(/promise of reply time/)).not.toBeInTheDocument();
  });

  it('has a heading level that fits under the heading of the list', () => {
    renderRow({ headingLevel: 2 });
    expect(screen.getByRole('heading', { level: 2, name: 'Ada' })).toBeVisible();
  });
});
