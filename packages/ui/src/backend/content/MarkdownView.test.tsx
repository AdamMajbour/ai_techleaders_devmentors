import { render, screen } from '@testing-library/react';
import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  it('renders paragraphs, emphasis and lists', () => {
    render(<MarkdownView source={'A **strong** note.\n\n- first\n- second'} />);
    expect(screen.getByText('strong').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps code as code: fenced blocks use the code font, in a scrollable block', () => {
    const { container } = render(<MarkdownView source={'```yaml\nreplicas: 3\n```'} />);
    const pre = container.querySelector('pre');
    expect(pre).toHaveClass('font-code', 'bg-muted', 'overflow-x-auto');
    expect(pre).toHaveTextContent('replicas: 3');
  });

  it('marks inline code with the code font', () => {
    render(<MarkdownView source={'Run `kubectl get pods` first.'} />);
    expect(screen.getByText('kubectl get pods')).toHaveClass('font-code');
  });

  it('does not render raw HTML: a script and its text are dropped', () => {
    const { container } = render(<MarkdownView source={'Hello <script>alert(1)</script> <b onclick="x()">bold</b>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.innerHTML).not.toContain('onclick');
  });

  it('renders an https link with a safe rel', () => {
    render(<MarkdownView source={'[GitHub](https://github.com/devmentor)'} />);
    const link = screen.getByRole('link', { name: 'GitHub' });
    expect(link).toHaveAttribute('href', 'https://github.com/devmentor');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  });

  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['data:text/html;base64,PHNjcmlwdD4='],
    ['vbscript:x'],
    ['/relative/path'],
  ])('renders a link to %s as plain text, never a link', (href) => {
    const { container } = render(<MarkdownView source={`[click me](${href})`} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('click me');
  });

  it('drops images so nothing is fetched from a third party', () => {
    const { container } = render(<MarkdownView source={'![beacon](https://tracker.example/pixel.png) after'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('after');
  });

  it('renders every link as text with linkPolicy none, for AI-generated answers', () => {
    const { container } = render(<MarkdownView linkPolicy="none" source={'See [the docs](https://example.com/docs).'} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('See the docs.');
  });

  it('pushes headings down two levels so an author cannot break the page outline', () => {
    render(<MarkdownView source={'# One\n\n## Two\n\n### Three'} />);
    expect(screen.getByRole('heading', { level: 3, name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Two' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Three' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('does not leak the syntax-tree node into the DOM', () => {
    const { container } = render(<MarkdownView source={'Text\n\n- item'} />);
    expect(container.innerHTML).not.toContain('[object Object]');
  });

  it('renders nothing visible for an empty source and does not throw', () => {
    const { container } = render(<MarkdownView source="" />);
    expect(container.textContent).toBe('');
  });

  it('makes a code block focusable so it can be scrolled with the keyboard, and does not style code inside it twice', () => {
    const { container } = render(<MarkdownView source={'```\nplain block\n```'} />);
    const pre = container.querySelector('pre');
    expect(pre).toHaveAttribute('tabindex', '0');
    expect(pre).toHaveClass('[&_code]:bg-transparent');
  });
});
