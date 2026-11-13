import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ErrorMessage } from '../backend/feedback/ErrorMessage';
import { LoadingMessage } from '../backend/feedback/LoadingMessage';
import { MarkdownView } from '../backend/content';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { StatusBadge } from '../components/ui/status-badge';
import { TextLink } from '../components/ui/text-link';

// The pattern: the one most important fact and the one main action sit at the top, where they are seen
// without scrolling. The details follow as labelled values. A record that is missing or private says so.
type DetailState = 'loading' | 'accepted' | 'waiting' | 'declined' | 'notFound' | 'loadFailed';

const QUESTION = 'Ingress upgrade from 1.9 to 1.28 fails on staging after the admission webhook starts.\n\n```\nerror: deployment "ingress-nginx" exceeded its progress deadline\n```';

function QuestionDetail({ state, onOpen, onRetry }: { state: DetailState; onOpen?: () => void; onRetry?: () => void }) {
  if (state === 'loading') {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-between-groups">
        <LoadingMessage message="Loading your question…" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }
  if (state === 'notFound') {
    return (
      <div className="flex max-w-2xl flex-col items-start gap-group">
        <ErrorMessage message="This question does not exist or you do not have access to it." />
        <TextLink href="#questions">Back to your questions</TextLink>
      </div>
    );
  }
  if (state === 'loadFailed') {
    return <ErrorMessage message="The question could not be loaded. Check your connection and try again." onRetry={onRetry} />;
  }

  const status =
    state === 'accepted'
      ? { tone: 'active' as const, text: 'Accepted' }
      : state === 'waiting'
        ? { tone: 'neutral' as const, text: 'Waiting for the mentor' }
        : { tone: 'danger' as const, text: 'Declined' };

  return (
    <article aria-labelledby="question-title" className="flex max-w-2xl flex-col gap-between-groups">
      <header className="flex flex-col gap-group">
        <div className="flex flex-wrap items-center gap-group">
          <h1 id="question-title" className="m-0 text-page-title font-strong text-headline">
            Ingress upgrade fails on staging
          </h1>
          <StatusBadge tone={status.tone}>{status.text}</StatusBadge>
        </div>
        {state === 'accepted' ? <Button onClick={onOpen}>Open the session</Button> : null}
        {state === 'waiting' ? (
          <Button disabledReason="Waiting for the mentor to accept. You are refunded if they do not." onClick={onOpen}>
            Open the session
          </Button>
        ) : null}
      </header>
      {state === 'declined' ? (
        <Alert>
          <AlertDescription>The mentor declined. Your 25.00 EUR is being refunded to your card.</AlertDescription>
        </Alert>
      ) : null}
      <dl className="m-0 grid gap-between-groups md:grid-cols-2">
        <div className="flex flex-col gap-group">
          <dt className="text-label font-strong text-headline">Mentor</dt>
          <dd className="m-0 text-body">Platform engineer</dd>
        </div>
        <div className="flex flex-col gap-group">
          <dt className="text-label font-strong text-headline">Paid</dt>
          <dd className="m-0 text-body tabular-nums">25.00 EUR</dd>
        </div>
      </dl>
      <section aria-labelledby="question-text" className="flex flex-col gap-group">
        <h2 id="question-text" className="m-0 text-label font-strong text-headline">
          Your question
        </h2>
        <MarkdownView source={QUESTION} />
      </section>
    </article>
  );
}

const meta = {
  title: 'Patterns/Detail view',
  component: QuestionDetail,
  args: { state: 'accepted', onOpen: fn(), onRetry: fn() },
} satisfies Meta<typeof QuestionDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Accepted: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Ingress upgrade fails on staging' })).toBeVisible();
    // The status and the main action come before the details in the reading order.
    const heading = canvas.getByRole('heading', { level: 1 });
    const action = canvas.getByRole('button', { name: 'Open the session' });
    await expect(heading.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(action);
    await expect(args.onOpen).toHaveBeenCalledTimes(1);
  },
};

export const WaitingForTheMentor: Story = {
  args: { state: 'waiting' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const action = canvas.getByRole('button', { name: 'Open the session' });
    await expect(action).toHaveAttribute('aria-disabled', 'true');
    await expect(action).toHaveAccessibleDescription('Waiting for the mentor to accept. You are refunded if they do not.');
    await userEvent.click(action);
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
};

export const Declined: Story = { args: { state: 'declined' } };

export const Loading: Story = {
  args: { state: 'loading' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Loading your question…');
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};

export const NotFoundOrNoAccess: Story = {
  args: { state: 'notFound' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('does not exist or you do not have access');
    await expect(canvas.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'Back to your questions' })).toBeVisible();
  },
};

export const LoadFailed: Story = {
  args: { state: 'loadFailed' },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const LongTextNarrow: Story = {
  render: (args) => (
    <div className="w-80">
      <QuestionDetail {...args} />
    </div>
  ),
};
