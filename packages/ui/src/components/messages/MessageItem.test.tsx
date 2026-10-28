import { render, screen } from '@testing-library/react';
import { MessageItem } from './MessageItem';

describe('MessageItem', () => {
  it('shows who wrote it and when (R02.3)', () => {
    render(
      <ol>
        <MessageItem authorName="Ada" sentAt="2026-11-03T13:25:00Z" text="Hello" timeZone="Europe/Warsaw" />
      </ol>,
    );
    expect(screen.getByText('Ada')).toBeVisible();
    const time = screen.getByText('14:25');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2026-11-03T13:25:00Z');
  });

  it('marks the viewer’s own message with words, not only position or colour', () => {
    render(
      <ol>
        <MessageItem authorName="Ada" sentAt="2026-11-03T13:25:00Z" text="Hello" own />
      </ol>,
    );
    expect(screen.getByText('(you)')).toBeVisible();
  });

  it('keeps fenced code as code in the code font and scrollable', () => {
    const { container } = render(
      <ol>
        <MessageItem authorName="Ada" sentAt="2026-11-03T13:25:00Z" text={'Try:\n```yaml\nreplicas: 3\n```'} />
      </ol>,
    );
    const pre = container.querySelector('pre');
    expect(pre).toHaveClass('font-code', 'bg-muted', 'overflow-x-auto');
    expect(pre).toHaveTextContent('replicas: 3');
  });

  it('formats nothing else and never renders HTML', () => {
    const { container } = render(
      <ol>
        <MessageItem authorName="Ada" sentAt="2026-11-03T13:25:00Z" text={'**plain** <b>tag</b> <script>x()</script>'} />
      </ol>,
    );
    expect(container.querySelector('strong, b, script')).toBeNull();
    expect(container).toHaveTextContent('**plain** <b>tag</b> <script>x()</script>');
  });

  it('keeps line breaks in plain text', () => {
    render(
      <ol>
        <MessageItem authorName="Ada" sentAt="2026-11-03T13:25:00Z" text={'line one\nline two'} />
      </ol>,
    );
    expect(screen.getByText(/line one/)).toHaveClass('whitespace-pre-wrap');
  });

  it('lets a keyboard user scroll a code block (WCAG 2.1.1)', () => {
    const { container } = render(
      <ol>
        <MessageItem authorName="Ada" sentAt="2026-11-03T13:25:00Z" text={'```\nlong line\n```'} />
      </ol>,
    );
    expect(container.querySelector('pre')).toHaveAttribute('tabindex', '0');
  });
});
