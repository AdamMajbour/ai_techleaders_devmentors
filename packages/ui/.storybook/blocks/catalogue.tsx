import { useState, type ReactNode } from 'react';

import { ActionButton } from '../../src/backend/actions/ActionButton';
import { CrudForm } from '../../src/backend/forms/CrudForm';
import { DataTable } from '../../src/backend/tables/DataTable';
import { MarkdownView } from '../../src/backend/content/MarkdownView';
import { EmptyState } from '../../src/backend/feedback/EmptyState';
import { ErrorMessage } from '../../src/backend/feedback/ErrorMessage';
import { LoadingMessage } from '../../src/backend/feedback/LoadingMessage';
import { StatusBadge } from '../../src/backend/status/StatusBadge';
import { BookingRow } from '../../src/components/bookings/BookingRow';
import { BookingStatus } from '../../src/components/bookings/BookingStatus';
import { PriceNotice } from '../../src/components/bookings/PriceNotice';
import { TermsConsent } from '../../src/components/consents/TermsConsent';
import { MentorRow } from '../../src/components/mentors/MentorRow';
import { Composer } from '../../src/components/messages/Composer';
import { MessageItem } from '../../src/components/messages/MessageItem';
import { NoteEditor, noteInputSchema } from '../../src/components/notes/NoteEditor';
import { PublishNoticePanel } from '../../src/components/notes/PublishNoticePanel';
import { PilotCountsTable } from '../../src/components/pilot/PilotCountsTable';
import { Alert, AlertDescription, AlertTitle } from '../../src/components/ui/alert';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { Checkbox } from '../../src/components/ui/checkbox';
import { ConfirmDialog } from '../../src/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../src/components/ui/dialog';
import { Field } from '../../src/components/ui/field';
import { Input } from '../../src/components/ui/input';
import { Select } from '../../src/components/ui/select';
import { Skeleton } from '../../src/components/ui/skeleton';
import { StatusBadge as StatusBadgePrimitive } from '../../src/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../src/components/ui/table';
import { Textarea } from '../../src/components/ui/textarea';
import { TextLink } from '../../src/components/ui/text-link';
import { CreditsPanel } from '../../src/components/vault/CreditsPanel';
import { ReviewItem } from '../../src/components/vault/ReviewItem';
import { VaultAnswerView } from '../../src/components/vault/VaultAnswerView';
import { DocLink } from './DocLink';
import {
  BOOKINGS,
  CREDIT_ENTRIES,
  MENTORS,
  MESSAGES,
  NOTICE_ITEMS,
  NOTICE_VERSION,
  REVIEW_ITEMS,
  REVIEW_NOW,
  VAULT_ANSWER,
  VAULT_CITATIONS,
  VAULT_QUESTION,
  pilotRows,
} from './sampleData';

// Documentation helper: one row per component with the facts the Start here and Components pages show. `docs` is the id
// of the component's page in Storybook. `check:catalogue` fails when a component exported by the package is missing here
// or when a `docs` id does not exist in the built Storybook.
export type CatalogueGroup = 'Primitives' | 'Feedback and content' | 'Forms and tables' | 'Product';

export interface CatalogueEntry {
  name: string;
  group: CatalogueGroup;
  summary: string;
  when: string;
  whenNot: string;
  docs: string;
  /** Other exports that belong to the same page. */
  alsoExports?: string[];
  preview?: ReactNode;
  /** Said instead of a preview when the component cannot sit beside others on one page. */
  noPreview?: string;
}

const ok = async () => ({ ok: true as const, status: 200, data: {} });
const statusLabels = {
  draft: { text: 'Draft', tone: 'neutral' },
  published: { text: 'Published', tone: 'active' },
  payment_failed: { text: 'Payment failed', tone: 'danger' },
} as const;

function DialogPreview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Open the dialog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit your headline</DialogTitle>
          <DialogDescription>What you did, in one sentence.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Take down note
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={'Take down "Ingress upgrades on bare metal"?'}
        description="Answers waiting for review are rejected and refunded."
        confirmLabel="Take down note"
        tone="destructive"
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

export const CATALOGUE: CatalogueEntry[] = [
  // ---- Primitives ----
  {
    name: 'Alert',
    group: 'Primitives',
    summary: 'A message that stays until its cause is gone.',
    when: 'A form-level error, a failed payment, test mode.',
    whenNot: 'An error about one field (Field), a one-word status (StatusBadge).',
    docs: 'primitives-alert--alert',
    alsoExports: ['AlertTitle', 'AlertDescription'],
    preview: (
      <Alert variant="destructive">
        <AlertTitle>The payment failed</AlertTitle>
        <AlertDescription>Your card was not charged.</AlertDescription>
      </Alert>
    ),
  },
  {
    name: 'Button',
    group: 'Primitives',
    summary: 'An action. One main action per screen.',
    when: 'The user does something: send, pay, accept.',
    whenNot: 'The user goes somewhere (TextLink).',
    docs: 'primitives-button--button',
    alsoExports: ['buttonVariants'],
    preview: (
      <div className="flex flex-wrap items-center gap-group">
        <Button size="sm">Accept</Button>
        <Button size="sm" variant="outline">
          Decline
        </Button>
        <Button size="sm" disabledReason="Write your question to continue">
          Pay 25 EUR and send
        </Button>
      </div>
    ),
  },
  {
    name: 'ActionButton',
    group: 'Primitives',
    summary: 'Runs an allowed action and reports errors without losing the retry.',
    when: 'The user changes a record state or performs an action on it.',
    whenNot: 'The user navigates somewhere (Button or TextLink).',
    docs: 'backend-actionbutton--success',
    preview: <ActionButton label="Approve refund" run={ok} onDone={() => undefined} />,
  },
  {
    name: 'Card',
    group: 'Primitives',
    summary: 'A panel that must stand out from the page.',
    when: 'A panel that holds one task and must stand out, such as the sign-in form.',
    whenNot: 'Rows of a list or table: they are divided by a line, not boxed (R01.1).',
    docs: 'primitives-card--card',
    alsoExports: ['CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter'],
    preview: <Card className="p-panel-compact text-body">One task in one panel.</Card>,
  },
  {
    name: 'Checkbox',
    group: 'Primitives',
    summary: 'A yes or no that the user sets.',
    when: 'Accepting the pilot terms, a setting.',
    whenNot: 'One choice from several (Select).',
    docs: 'primitives-checkbox--checkbox',
    preview: (
      <Field orientation="inline" label="I accept the pilot terms">
        <Checkbox />
      </Field>
    ),
  },
  {
    name: 'ConfirmDialog',
    group: 'Primitives',
    summary: 'A question before an action that cannot be undone.',
    when: 'Taking a note down, cancelling a booking.',
    whenNot: 'An action that can be undone, or an error message.',
    docs: 'primitives-confirmdialog--confirmdialog',
    alsoExports: ['AlertDialog', 'AlertDialogAction', 'AlertDialogCancel', 'AlertDialogContent', 'AlertDialogDescription', 'AlertDialogFooter', 'AlertDialogHeader', 'AlertDialogTitle', 'AlertDialogTrigger', 'AlertDialogPortal', 'AlertDialogOverlay'],
    preview: <ConfirmPreview />,
  },
  {
    name: 'Dialog',
    group: 'Primitives',
    summary: 'A short task in a layer above the page.',
    when: 'Editing one small thing without leaving the page.',
    whenNot: 'A question that needs a yes or no (ConfirmDialog), a long form (its own page).',
    docs: 'primitives-dialog--dialog',
    alsoExports: ['DialogTrigger', 'DialogContent', 'DialogHeader', 'DialogFooter', 'DialogTitle', 'DialogDescription', 'DialogClose', 'DialogPortal', 'DialogOverlay'],
    preview: <DialogPreview />,
  },
  {
    name: 'Field',
    group: 'Primitives',
    summary: 'Wires a label, a hint and an error to one control.',
    when: 'Around every Input, Textarea, Select and Checkbox.',
    whenNot: 'A control with no label: there is none.',
    docs: 'primitives-field--field',
    preview: (
      <Field label="Email" hint="We send a sign-in link to it." requirement="required">
        <Input type="email" defaultValue="ada@example.com" />
      </Field>
    ),
  },
  {
    name: 'Input',
    group: 'Primitives',
    summary: 'One line of text.',
    when: 'A title, an email, a short answer.',
    whenNot: 'Several lines (Textarea), a choice from a list (Select).',
    docs: 'primitives-input--input',
    preview: <Input aria-label="Title" defaultValue="Ingress upgrades on bare metal" />,
  },
  {
    name: 'Select',
    group: 'Primitives',
    summary: 'One choice from a short list.',
    when: 'A technology filter.',
    whenNot: 'A list long enough to need search (no component yet).',
    docs: 'primitives-select--select',
    preview: (
      <Select aria-label="Technology" density="compact" defaultValue="">
        <option value="">All technologies</option>
        <option value="go">Go</option>
        <option value="python">Python</option>
      </Select>
    ),
  },
  {
    name: 'Skeleton',
    group: 'Primitives',
    summary: 'A still block where content will appear.',
    when: 'The layout is known and the data is loading.',
    whenNot: 'The layout is not known, or the wait is a single action (LoadingMessage).',
    docs: 'primitives-skeleton--skeleton',
    preview: (
      <div aria-hidden="true" className="flex flex-col gap-group">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    ),
  },
  {
    name: 'StatusBadge',
    group: 'Primitives',
    summary: 'A status in one to three words.',
    when: 'Where a record stands: Draft, Published.',
    whenNot: 'A sentence (Alert), a count.',
    docs: 'backend-statusbadge--playground',
    alsoExports: ['StatusBadgePrimitive', 'StatusBadgePrimitiveProps'],
    preview: (
      <div className="flex flex-wrap items-center gap-group">
        <StatusBadge status="draft" labels={statusLabels} />
        <StatusBadge status="published" labels={statusLabels} />
        <StatusBadge status="payment_failed" labels={statusLabels} />
        <StatusBadgePrimitive tone="active">Current</StatusBadgePrimitive>
      </div>
    ),
  },
  {
    name: 'Table',
    group: 'Primitives',
    summary: 'Rows and columns with clear column headers.',
    when: 'Several attributes to compare (R01.3).',
    whenNot: 'One column of text (a list), long paginated data (DataTable).',
    docs: 'primitives-table--table',
    alsoExports: ['TableHeader', 'TableBody', 'TableFooter', 'TableHead', 'TableRow', 'TableCell', 'TableCaption'],
    preview: (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>3 Nov 2026</TableCell>
            <TableCell className="text-right tabular-nums">4.00 EUR</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  {
    name: 'Textarea',
    group: 'Primitives',
    summary: 'Several lines of text.',
    when: 'A question, a note, a message.',
    whenNot: 'One line (Input).',
    docs: 'primitives-textarea--textarea',
    preview: <Textarea aria-label="Question" defaultValue="Why does the controller restart after the upgrade?" />,
  },
  {
    name: 'TextLink',
    group: 'Primitives',
    summary: 'A link inside a sentence or on its own.',
    when: 'The user goes to another page.',
    whenNot: 'The user does something (Button).',
    docs: 'primitives-textlink--textlink',
    preview: (
      <p className="m-0 text-body">
        I accept the <TextLink href="#terms">pilot terms</TextLink>.
      </p>
    ),
  },
  // ---- Feedback and content ----
  {
    name: 'EmptyState',
    group: 'Feedback and content',
    summary: 'Says why a list is empty and what to do next.',
    when: 'No records yet, or no results for the filters.',
    whenNot: 'A load that failed (ErrorMessage).',
    docs: 'primitives-emptystate--docs',
    preview: <EmptyState title="No questions yet" description="Pick a mentor and ask your first question." />,
  },
  {
    name: 'ErrorMessage',
    group: 'Feedback and content',
    summary: 'A load that failed, with a way to try again.',
    when: 'A list or a page could not be loaded.',
    whenNot: 'A form error (Alert, Field).',
    docs: 'primitives-errormessage--docs',
    preview: <ErrorMessage message="Mentors could not be loaded. Check your connection and try again." onRetry={() => {}} />,
  },
  {
    name: 'LoadingMessage',
    group: 'Feedback and content',
    summary: 'Announces that something is loading.',
    when: 'Together with Skeleton blocks while a region loads.',
    whenNot: 'On its own where the layout is known (add Skeleton).',
    docs: 'primitives-loadingmessage--docs',
    preview: <LoadingMessage message="Loading mentors…" className="py-0 text-left" />,
  },
  {
    name: 'MarkdownView',
    group: 'Feedback and content',
    summary: 'Shows text written by users or the AI, safely.',
    when: 'A note, a seeker\'s question, a generated answer.',
    whenNot: 'Text the product writes itself (plain elements).',
    docs: 'primitives-markdownview--docs',
    preview: <MarkdownView source={'Read the **previous** logs first:\n\n```\nkubectl logs --previous\n```'} linkPolicy="none" />,
  },
  // ---- Forms and tables ----
  {
    name: 'CrudForm',
    group: 'Forms and tables',
    summary: 'A form driven by the same Zod schema as the server.',
    when: 'Creating or editing a record with text fields.',
    whenNot: 'A form with a checkbox or a price (compose Field and controls).',
    docs: 'primitives-crudform--docs',
    preview: <CrudForm schema={noteInputSchema} fields={[{ name: 'title', label: 'Title' }]} onSubmit={ok} submitLabel="Save" />,
  },
  {
    name: 'DataTable',
    group: 'Forms and tables',
    summary: 'A list with loading, error and empty states built in.',
    when: 'A list of records with columns, pagination or row actions.',
    whenNot: 'A handful of fixed rows (Table).',
    docs: 'primitives-datatable--docs',
    preview: (
      <DataTable
        caption="Notes"
        getRowId={(row: { id: string; title: string }) => row.id}
        columns={[{ key: 'title', header: 'Title', cell: (row: { id: string; title: string }) => row.title }]}
        rows={[{ id: 'n1', title: 'Ingress upgrades on bare metal' }]}
      />
    ),
  },
  // ---- Product ----
  {
    name: 'BookingRow',
    group: 'Product',
    summary: 'One booking in a list, with Accept and Decline for the mentor.',
    when: 'The mentor\'s and the seeker\'s list of bookings.',
    whenNot: 'One booking in full (Detail view).',
    docs: 'product-bookings-bookingrow--docs',
    preview: (
      <ul className="m-0 list-none p-0">
        <BookingRow booking={BOOKINGS[0]} viewer="mentor" onAccept={() => {}} onDecline={() => {}} />
      </ul>
    ),
  },
  {
    name: 'BookingStatus',
    group: 'Product',
    summary: 'Where a booking stands, in words, for the reader.',
    when: 'Next to a booking.',
    whenNot: 'A status that is not a booking\'s (StatusBadge).',
    docs: 'product-bookings-bookingstatus--docs',
    alsoExports: ['RefundStatusLine', 'bookingStatusLabel'],
    preview: <BookingStatus status="declined" viewer="seeker" refund="processing" />,
  },
  {
    name: 'PriceNotice',
    group: 'Product',
    summary: 'The price and the refund rule, before the question.',
    when: 'Above any field that leads to a payment (R04).',
    whenNot: 'A price inside a row or a table.',
    docs: 'product-bookings-pricenotice--docs',
    preview: <PriceNotice amountMinor={2500} currency="EUR" description="for a 25-minute text session" refundRule="If the mentor does not show up, you are refunded." />,
  },
  {
    name: 'QuestionForm',
    group: 'Product',
    summary: 'The paid question: price, question, terms, a button that states the amount.',
    when: 'Asking a mentor or the vault a question for a price.',
    whenNot: 'A form without a price (CrudForm), a message in a session (Composer).',
    docs: 'product-bookings-questionform--docs',
    noPreview: 'Built from PriceNotice, Field, Textarea, TermsConsent and Button. Open its page.',
  },
  {
    name: 'TermsConsent',
    group: 'Product',
    summary: 'The checkbox for the pilot terms, never ticked in advance.',
    when: 'Before a payment.',
    whenNot: 'Any other yes or no (Checkbox in a Field).',
    docs: 'product-consents-termsconsent--docs',
    preview: <TermsConsent checked={false} onCheckedChange={() => {}} termsHref="#terms" />,
  },
  {
    name: 'MentorRow',
    group: 'Product',
    summary: 'One mentor in the list: what they did, price, how to ask.',
    when: 'The list a seeker chooses from.',
    whenNot: 'A rating or ranking: there is none (N02).',
    docs: 'product-mentors-mentorrow--docs',
    preview: (
      <ul className="m-0 list-none p-0">
        <MentorRow mentor={MENTORS[0]} priceMinor={2500} currency="EUR" href="#mentor" headingLevel={3} />
      </ul>
    ),
  },
  {
    name: 'MessageItem',
    group: 'Product',
    summary: 'One message: author, time, text, code as code.',
    when: 'Inside a session thread.',
    whenNot: 'A long written answer (MarkdownView).',
    docs: 'product-messages-messageitem--docs',
    preview: (
      <ol className="m-0 list-none p-0">
        <MessageItem authorName="Ada Kowalska" sentAt={MESSAGES[1].sentAt} text="What does the last line say?" timeZone="UTC" />
      </ol>
    ),
  },
  {
    name: 'Composer',
    group: 'Product',
    summary: 'The message box of a session.',
    when: 'Under the conversation.',
    whenNot: 'A form with several fields.',
    docs: 'product-messages-composer--docs',
    preview: <Composer onSend={ok} />,
  },
  {
    name: 'SessionThread',
    group: 'Product',
    summary: 'The session view: window, conversation, message box.',
    when: 'The page of an accepted session.',
    whenNot: 'A chat without a time window.',
    docs: 'product-messages-sessionthread--docs',
    alsoExports: ['SessionWindow', 'sessionPhase', 'parseMessageText'],
    noPreview: 'It holds the whole session page. See its page and the Session thread pattern.',
  },
  {
    name: 'NoteEditor',
    group: 'Product',
    summary: 'A title and the text of one note, with its status.',
    when: 'Writing and editing a note.',
    whenNot: 'Publishing it (PublishNoticePanel).',
    docs: 'product-notes-noteeditor--docs',
    alsoExports: ['noteInputSchema', 'noteStatusLabel', 'NOTE_TITLE_MAX', 'NOTE_BODY_MAX'],
    preview: <NoteEditor status="draft" initialValues={{ title: 'Reading admission webhook logs', body: 'Read the previous logs first.' }} onSave={ok} />,
  },
  {
    name: 'PublishNoticePanel',
    group: 'Product',
    summary: 'The notice the mentor reads and agrees to before publishing.',
    when: 'Beside the editor of a draft or a taken-down note.',
    whenNot: 'A seeker\'s terms (TermsConsent).',
    docs: 'product-notes-publishnoticepanel--docs',
    preview: <PublishNoticePanel noticeItems={NOTICE_ITEMS.slice(0, 2)} noticeVersion={NOTICE_VERSION} termsVersionId="00000000-0000-4000-8000-000000000001" termsSha256={'a'.repeat(64)} onPublish={ok} />,
  },
  {
    name: 'VaultAnswerView',
    group: 'Product',
    summary: 'A vault answer in every state, with its sources.',
    when: 'The page of one vault answer.',
    whenNot: 'The answer a mentor reviews (ReviewItem).',
    docs: 'product-vault-vaultanswerview--docs',
    preview: <VaultAnswerView question={VAULT_QUESTION} status="released" answerText={VAULT_ANSWER.split('\n')[0]} citations={VAULT_CITATIONS} />,
  },
  {
    name: 'ReviewItem',
    group: 'Product',
    summary: 'A generated answer waiting for the mentor whose note it cites.',
    when: 'The list of answers to review.',
    whenNot: 'The seeker\'s view of the answer (VaultAnswerView).',
    docs: 'product-vault-reviewitem--docs',
    alsoExports: ['REJECT_REASON_MAX'],
    preview: (
      <ul className="m-0 list-none p-0">
        <ReviewItem item={REVIEW_ITEMS[1]} now={REVIEW_NOW} timeZone="UTC" headingLevel={3} onApprove={() => {}} onReject={() => {}} />
      </ul>
    ),
  },
  {
    name: 'CreditsPanel',
    group: 'Product',
    summary: 'What a mentor earned from vault answers. Not a payout.',
    when: 'The notes page of a mentor.',
    whenNot: 'Counts for the operator (PilotCountsTable).',
    docs: 'product-vault-creditspanel--docs',
    preview: <CreditsPanel balanceMinor={667} currency="EUR" entries={CREDIT_ENTRIES.filter((entry) => entry.livemode)} timeZone="UTC" />,
  },
  {
    name: 'PilotCountsTable',
    group: 'Product',
    summary: 'The numbers the founders read at the two reviews.',
    when: 'The operator\'s page of pilot counts.',
    whenNot: 'A chart, or a long paginated list.',
    docs: 'product-pilot-pilotcountstable--docs',
    preview: <PilotCountsTable rows={pilotRows('start').slice(0, 2)} timeZone="UTC" />,
  },
];

export const IMPORT = (name: string) => `import { ${name} } from '@devmentor/ui';`;

// Start here: all components in one table (name, import, when, when not).
export function ComponentTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-body">
        <thead>
          <tr className="border-b border-border text-table-header-foreground">
            <th scope="col" className="py-group pr-between-groups font-strong">Component</th>
            <th scope="col" className="py-group pr-between-groups font-strong">Import</th>
            <th scope="col" className="py-group pr-between-groups font-strong">Use it when</th>
            <th scope="col" className="py-group font-strong">Do not use it when</th>
          </tr>
        </thead>
        <tbody>
          {CATALOGUE.map((entry) => (
            <tr key={entry.name} className="border-b border-border align-top">
              <th scope="row" className="py-group pr-between-groups text-left font-strong">
                <DocLink id={entry.docs}>{entry.name}</DocLink>
              </th>
              <td className="py-group pr-between-groups">
                <code className="font-code text-code">{IMPORT(entry.name)}</code>
              </td>
              <td className="py-group pr-between-groups">{entry.when}</td>
              <td className="py-group">{entry.whenNot}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Components: a catalogue with a small working preview, the group, one sentence and a link to the page.
export function ComponentGrid({ group }: { group: CatalogueGroup }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-between-groups p-0 md:grid-cols-2">
      {CATALOGUE.filter((entry) => entry.group === group).map((entry) => (
        <li key={entry.name} className="flex flex-col gap-group border-t border-border pt-between-groups">
          <h3 className="m-0 text-body font-strong text-headline">
            <DocLink id={entry.docs}>{entry.name}</DocLink>
          </h3>
          <p className="m-0 text-label text-muted-foreground">{entry.summary}</p>
          <div className="min-w-0">{entry.preview ?? <p className="m-0 text-label text-muted-foreground">{entry.noPreview}</p>}</div>
        </li>
      ))}
    </ul>
  );
}
