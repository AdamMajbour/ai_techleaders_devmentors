import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { CREDIT_ENTRIES, NOTES, REVIEW_ITEMS, REVIEW_NOW, VAULT_ANSWER, VAULT_CITATIONS, VAULT_QUESTION } from '../../.storybook/blocks/sampleData';
import type { ApiResult } from '../backend/api/types';
import { NoteDetailView, NotesListView, PreviewsView, VaultAnswerPage, VaultAskView } from './e02-views';

// Full-page examples of the E02 epic: notes and publishing, the review of generated answers, and the vault answer
// of the seeker. Each story is one state of one screen; the epic page "Epics > E02 Notes and vault" lists them.
const meta = { title: 'Product/Screens/E02 Notes and vault', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ok: ApiResult<unknown> = { ok: true, status: 201, data: { checkoutUrl: '#checkout' } };
const credits = { balanceMinor: 667, currency: 'EUR', entries: CREDIT_ENTRIES.filter((entry) => entry.livemode), timeZone: 'UTC' };
const noCredits = { balanceMinor: 0, currency: 'EUR', entries: [], timeZone: 'UTC' };

// 1. Notes list with credits
export const NotesLoading: Story = { render: () => <NotesListView state="loading" notes={[]} credits={{ ...noCredits, status: 'loading' }} /> };
export const NotesReady: Story = { render: () => <NotesListView state="ready" notes={NOTES} credits={credits} /> };
export const NotesEmpty: Story = { render: () => <NotesListView state="empty" notes={[]} credits={noCredits} /> };
export const NotesError: Story = { render: () => <NotesListView state="error" notes={[]} credits={{ ...noCredits, status: 'error' }} /> };

// 2. One note
export const NoteNew: Story = { render: () => <NoteDetailView status="new" /> };
export const NoteDraftWithNotice: Story = {
  render: () => <NoteDetailView status="draft" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(6);
    await expect(canvas.getByRole('button', { name: 'Publish note' })).toHaveAccessibleDescription('Read and accept both items to publish');
  },
};
export const NoteDraftPublishingNotOpen: Story = {
  render: () => <NoteDetailView status="draft" publishBlockedReason="Publishing opens when the notice has been reviewed." />,
};
export const NotePublished: Story = {
  render: () => <NoteDetailView status="published" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Take down note' }));
    await expect(await within(document.body).findByRole('alertdialog')).toBeVisible();
  },
};
export const NoteTakenDown: Story = { render: () => <NoteDetailView status="taken_down" /> };

// 3. Answers to review
export const PreviewsLoading: Story = { render: () => <PreviewsView state="loading" items={[]} now={REVIEW_NOW} /> };
export const PreviewsReady: Story = { render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now={REVIEW_NOW} /> };
export const PreviewsApproveRunning: Story = { render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now={REVIEW_NOW} pendingId="a1" /> };
export const PreviewsActionRefused: Story = {
  render: () => (
    <PreviewsView
      state="ready"
      items={REVIEW_ITEMS}
      now={REVIEW_NOW}
      errorId="a1"
      actionError="This answer was already rejected by another mentor. Nothing is needed from you."
    />
  ),
};
export const PreviewsDecided: Story = { render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now={REVIEW_NOW} decisions={{ a1: 'approved', a2: 'rejected' }} /> };
export const PreviewsTimeRanOut: Story = { render: () => <PreviewsView state="ready" items={REVIEW_ITEMS} now="2026-11-03T15:10:00Z" /> };
export const PreviewsEmpty: Story = { render: () => <PreviewsView state="empty" items={[]} now={REVIEW_NOW} /> };
export const PreviewsError: Story = { render: () => <PreviewsView state="error" items={[]} now={REVIEW_NOW} /> };

// 4. Ask the vault
export const AskForm: Story = {
  render: () => <VaultAskView corpus="has_notes" onSubmit={async () => ok} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Test mode')).toBeVisible();
    await expect(canvas.getByRole('region', { name: 'Price' })).toHaveTextContent('10 EUR for one answer written by AI from mentors\' notes');
    await expect(canvas.getByLabelText(/Your question/)).toHaveAccessibleDescription(/read your question before you get the answer/);
  },
};
export const AskNoNotesYet: Story = { render: () => <VaultAskView corpus="no_notes" onSubmit={async () => ok} /> };
export const AskConfigurationRefused: Story = {
  render: () => (
    <VaultAskView
      corpus="has_notes"
      onSubmit={async () => ({ ok: false, status: 503, error: { code: 'ai_unavailable', message: 'The vault is not available right now. Nothing was charged. Try again later.' } })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Your question/), VAULT_QUESTION);
    await userEvent.click(canvas.getByRole('checkbox', { name: /pilot terms/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 10 EUR and send' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Nothing was charged');
  },
};

// 5. The vault answer of the seeker
const answer = { question: VAULT_QUESTION };
export const AnswerLoading: Story = { render: () => <VaultAnswerPage {...answer} status="generating" page="loading" /> };
export const AnswerLoadFailed: Story = { render: () => <VaultAnswerPage {...answer} status="generating" page="loadFailed" /> };
export const AnswerNotFound: Story = { render: () => <VaultAnswerPage {...answer} status="generating" page="notFound" /> };
export const AnswerGenerating: Story = { render: () => <VaultAnswerPage {...answer} status="generating" /> };
export const AnswerWaitingForMentors: Story = { render: () => <VaultAnswerPage {...answer} status="pending_preview" previewMinutes={120} /> };
export const AnswerReleased: Story = { render: () => <VaultAnswerPage {...answer} status="released" answerText={VAULT_ANSWER} citations={VAULT_CITATIONS} /> };
export const AnswerRejected: Story = { render: () => <VaultAnswerPage {...answer} status="rejected" refund="pending_approval" /> };
export const AnswerExpired: Story = { render: () => <VaultAnswerPage {...answer} status="expired" refund="processing" /> };
export const AnswerNotesDidNotCover: Story = { render: () => <VaultAnswerPage {...answer} status="generation_failed" failureReason="unanswerable" refund="refunded" /> };
export const AnswerWritingFailed: Story = { render: () => <VaultAnswerPage {...answer} status="generation_failed" failureReason="unavailable" refund="pending_approval" /> };
