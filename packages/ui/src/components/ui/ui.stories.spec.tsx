import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { composeStories, composeStory, setProjectAnnotations } from '@storybook/react-vite';
import { describe, expect, it } from 'vitest';
import * as MarkdownViewStories from '../../backend/content/MarkdownView.stories';
import * as EmptyStateStories from '../../backend/feedback/EmptyState.stories';
import * as ErrorMessageStories from '../../backend/feedback/ErrorMessage.stories';
import * as ConfirmDestructiveStories from '../../patterns/confirm-destructive.stories';
import * as DetailViewStories from '../../patterns/detail-view.stories';
import * as FormStories from '../../patterns/form.stories';
import * as ListWithFiltersStories from '../../patterns/list-with-filters.stories';
import * as BookingRowStories from '../bookings/BookingRow.stories';
import * as BookingStatusStories from '../bookings/BookingStatus.stories';
import * as PriceNoticeStories from '../bookings/PriceNotice.stories';
import * as QuestionFormStories from '../bookings/QuestionForm.stories';
import * as TermsConsentStories from '../consents/TermsConsent.stories';
import * as MentorRowStories from '../mentors/MentorRow.stories';
import * as ComposerStories from '../messages/Composer.stories';
import * as MessageItemStories from '../messages/MessageItem.stories';
import * as SessionThreadStories from '../messages/SessionThread.stories';
import * as PaidActionFlowStories from '../../patterns/paid-action-flow.stories';
import * as SessionThreadPatternStories from '../../patterns/session-thread.stories';
import * as E01Stories from '../../screens/e01.stories';
import * as NoteEditorStories from '../notes/NoteEditor.stories';
import * as PublishNoticePanelStories from '../notes/PublishNoticePanel.stories';
import * as CreditsPanelStories from '../vault/CreditsPanel.stories';
import * as ReviewItemStories from '../vault/ReviewItem.stories';
import * as VaultAnswerViewStories from '../vault/VaultAnswerView.stories';
import * as ReviewQueueStories from '../../patterns/review-queue.stories';
import * as ApprovalQueueStories from '../../backend/queues/ApprovalQueue.stories';
import * as E02Stories from '../../screens/e02.stories';
import * as PilotCountsTableStories from '../pilot/PilotCountsTable.stories';
import * as E03Stories from '../../screens/e03.stories';
import { ComponentGrid, ComponentTable } from '../../../.storybook/blocks/catalogue';
import * as AlertStories from './alert.stories';
import * as ButtonStories from './button.stories';
import * as CardStories from './card.stories';
import * as CheckboxStories from './checkbox.stories';
import * as ConfirmDialogStories from './confirm-dialog.stories';
import * as DialogStories from './dialog.stories';
import * as FieldStories from './field.stories';
import * as InputStories from './input.stories';
import * as SelectStories from './select.stories';
import * as SkeletonStories from './skeleton.stories';
import * as StatusBadgeStories from './status-badge.stories';
import * as TableStories from './table.stories';
import * as TextareaStories from './textarea.stories';
import * as TextLinkStories from './text-link.stories';

// jsdom has no ResizeObserver, and Radix measures a checkbox that sits inside a <form>. Browsers have it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Same accessibility setting as .storybook/preview.tsx.
// color-contrast is off here only because jsdom has no canvas; contrast is measured from the tokens
// (npm run tokens:contrast) and in the browser run (npm run test:stories).
setProjectAnnotations([
  a11yAddonAnnotations,
  { parameters: { a11y: { test: 'error', config: { rules: [{ id: 'color-contrast', enabled: false }] } } } },
]);

type A11yReport = { type: string; status?: string; result?: { violations?: Array<{ id: string }> } };
type Runnable = { run: () => Promise<void>; reporting: { reports: A11yReport[] } };

// Portable stories do not throw on an accessibility violation, they only record it in
// `reporting`. Failing here is what the browser test runner does for `a11y.test: 'error'`.
async function runAndCheck(story: Runnable) {
  await story.run();
  const violations = story.reporting.reports
    .filter((report) => report.type === 'a11y' && report.status === 'failed')
    .flatMap((report) => report.result?.violations?.map((v) => v.id) ?? []);
  expect(violations, `accessibility violations: ${violations.join(', ')}`).toEqual([]);
}

describe('the accessibility gate itself', () => {
  it('fails a story that has an unlabelled input', async () => {
    const Bad = composeStory({ render: () => <input /> }, { title: 'Probe/Bad', component: () => null } as never);
    await expect(runAndCheck(Bad as unknown as Runnable)).rejects.toThrow(/label/);
  });

  it('passes a labelled input', async () => {
    const Good = composeStory({ render: () => <input aria-label="Name" /> }, { title: 'Probe/Good', component: () => null } as never);
    await runAndCheck(Good as unknown as Runnable);
  });
});

const files = {
  Alert: AlertStories,
  MarkdownView: MarkdownViewStories,
  Button: ButtonStories,
  Card: CardStories,
  Checkbox: CheckboxStories,
  ConfirmDialog: ConfirmDialogStories,
  Dialog: DialogStories,
  EmptyState: EmptyStateStories,
  ErrorMessage: ErrorMessageStories,
  Field: FieldStories,
  Input: InputStories,
  Select: SelectStories,
  Skeleton: SkeletonStories,
  StatusBadge: StatusBadgeStories,
  Table: TableStories,
  Textarea: TextareaStories,
  TextLink: TextLinkStories,
};

const product = {
  'Bookings/BookingRow': BookingRowStories,
  'Bookings/BookingStatus': BookingStatusStories,
  'Bookings/PriceNotice': PriceNoticeStories,
  'Bookings/QuestionForm': QuestionFormStories,
  'Consents/TermsConsent': TermsConsentStories,
  'Mentors/MentorRow': MentorRowStories,
  'Messages/Composer': ComposerStories,
  'Messages/MessageItem': MessageItemStories,
  'Messages/SessionThread': SessionThreadStories,
  'Notes/NoteEditor': NoteEditorStories,
  'Notes/PublishNoticePanel': PublishNoticePanelStories,
  'Vault/CreditsPanel': CreditsPanelStories,
  'Vault/ReviewItem': ReviewItemStories,
  'Vault/VaultAnswerView': VaultAnswerViewStories,
  'Pilot/PilotCountsTable': PilotCountsTableStories,
  'Screens/E01 Booking flow': E01Stories,
  'Screens/E02 Notes and vault': E02Stories,
  'Screens/E03 Terms and pilot counts': E03Stories,
};

const patterns = {
  'Paid action flow': PaidActionFlowStories,
  'Review queue': ReviewQueueStories,
  'Approval queue primitive': ApprovalQueueStories,
  'Session thread': SessionThreadPatternStories,
  'Confirm destructive action': ConfirmDestructiveStories,
  'Detail view': DetailViewStories,
  Form: FormStories,
  'List with filters': ListWithFiltersStories,
};

for (const [pattern, stories] of Object.entries(patterns)) {
  describe(`Patterns/${pattern}`, () => {
    for (const [name, Story] of Object.entries(composeStories(stories as Parameters<typeof composeStories>[0]))) {
      it(name, async () => {
        await runAndCheck(Story as unknown as Runnable);
      });
    }
  });
}

for (const [component, stories] of Object.entries(files)) {
  describe(`Primitives/${component}`, () => {
    for (const [name, Story] of Object.entries(composeStories(stories as Parameters<typeof composeStories>[0]))) {
      it(name, async () => {
        await runAndCheck(Story as unknown as Runnable);
      });
    }
  });
}

for (const [component, stories] of Object.entries(product)) {
  describe(`Product/${component}`, () => {
    for (const [name, Story] of Object.entries(composeStories(stories as Parameters<typeof composeStories>[0]))) {
      it(name, async () => {
        await runAndCheck(Story as unknown as Runnable);
      });
    }
  });
}

// The Components page and the table of Start here are built from the real components. Their previews must pass the same gate.
describe('Design system pages', () => {
  const meta = { title: 'Docs/Catalogue', component: () => null } as never;
  for (const group of ['Primitives', 'Feedback and content', 'Forms and tables', 'Product'] as const) {
    it(`Components: ${group}`, async () => {
      const Story = composeStory({ render: () => <ComponentGrid group={group} /> }, meta);
      await runAndCheck(Story as unknown as Runnable);
    });
  }
  it('Start here: the table of all components', async () => {
    const Story = composeStory({ render: () => <ComponentTable /> }, meta);
    await runAndCheck(Story as unknown as Runnable);
  });
});
