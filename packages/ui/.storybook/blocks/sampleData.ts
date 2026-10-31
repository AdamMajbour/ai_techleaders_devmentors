// Documentation helper: realistic example data for stories and screens. Names, questions and messages are
// invented for illustration; they carry no ratings, counts or client numbers (N02). Prices are the 25 EUR text
// session of E01 (R04).
import type { BookingRowData } from '../../src/components/bookings/BookingRow';
import type { MentorRowData } from '../../src/components/mentors/MentorRow';
import type { SessionMessage } from '../../src/components/messages/SessionThread';
import type { PilotCountRow, PilotTrigger } from '../../src/components/pilot/PilotCountsTable';
import type { CreditEntry } from '../../src/components/vault/CreditsPanel';
import type { ReviewItemData } from '../../src/components/vault/ReviewItem';
import type { VaultCitation } from '../../src/components/vault/VaultAnswerView';

export const SESSION = { startsAt: '2026-11-03T13:00:00Z', endsAt: '2026-11-03T13:25:00Z', timeZone: 'UTC' } as const;
export const PRICE = { priceMinor: 2500, currency: 'EUR' } as const;

export const MENTORS: MentorRowData[] = [
  {
    id: 'ada',
    name: 'Ada Kowalska',
    headline: 'Upgraded ingress-nginx on bare metal clusters and wrote down what broke',
    technologies: ['Kubernetes', 'Go', 'Linux networking'],
    publicWork: { label: 'Technical articles', href: '#articles' },
    activity: 'within_hour',
  },
  {
    id: 'jan',
    name: 'Jan Nowak',
    headline: 'Moved a monolith from cron jobs to a queue without losing a single order',
    technologies: ['PostgreSQL', 'Node.js', 'Queues'],
    publicWork: { label: 'Open-source repositories', href: '#repositories' },
    activity: 'today',
  },
  {
    id: 'maria',
    name: 'Maria Wiśniewska',
    headline: 'Found the N+1 query that made a dashboard load for nine seconds',
    technologies: ['Python', 'Django', 'PostgreSQL'],
    activity: 'earlier',
  },
  {
    id: 'piotr',
    name: 'Piotr Zieliński',
    headline: 'Set up reproducible builds for a team of twelve',
    technologies: ['Docker', 'GitHub Actions', 'Bazel'],
    publicWork: { label: 'Conference talk', href: '#talk' },
    activity: 'never',
  },
];

export const QUESTION =
  'Ingress upgrade from 1.9 to 1.28 fails on staging after the admission webhook starts. The pods restart in a loop and the deployment never becomes ready.';

export const LONG_QUESTION = `${QUESTION}\n\nWhat I tried:\n- rolled back the webhook configuration, same result\n- checked the certificate expiry, it is valid until March\n- increased the progress deadline to 10 minutes\n\nI would like to know where to look first.`;

export const BOOKINGS: BookingRowData[] = [
  { id: 'b1', question: QUESTION, counterpartName: 'Sam', status: 'paid', priceMinor: 2500, currency: 'EUR' },
  {
    id: 'b2',
    question: 'How do I find out which migration is holding a lock on the orders table?',
    counterpartName: 'Ewa',
    status: 'accepted',
    priceMinor: 2500,
    currency: 'EUR',
  },
  {
    id: 'b3',
    question: 'Is it safe to run two replicas of a consumer that writes to the same partition key?',
    counterpartName: 'Tomasz',
    status: 'declined',
    priceMinor: 2500,
    currency: 'EUR',
    refund: 'processing',
  },
  {
    id: 'b4',
    question: 'Why does my build cache miss on every commit although the lock file did not change?',
    counterpartName: 'Ola',
    status: 'expired',
    priceMinor: 2500,
    currency: 'EUR',
    refund: 'refunded',
  },
];

// What the server sends to the mentor: the question is left out once the booking is declined or expired (Grill 8).
export const MENTOR_BOOKINGS: BookingRowData[] = BOOKINGS.map((booking) =>
  booking.status === 'declined' || booking.status === 'expired' ? { ...booking, question: undefined } : booking,
);

export const MESSAGES: SessionMessage[] = [
  { id: 'm1', authorId: 'seeker', authorName: 'Sam', sentAt: '2026-11-03T13:01:00Z', text: QUESTION },
  {
    id: 'm2',
    authorId: 'mentor',
    authorName: 'Ada Kowalska',
    sentAt: '2026-11-03T13:04:00Z',
    text: 'Start with the webhook logs, the restart loop usually has one line that says why:\n```\nkubectl -n ingress-nginx logs deploy/ingress-nginx-controller --previous\n```\nWhat does the last line say?',
  },
  {
    id: 'm3',
    authorId: 'seeker',
    authorName: 'Sam',
    sentAt: '2026-11-03T13:06:00Z',
    text: 'x509: certificate signed by unknown authority',
  },
];

// ---- E02: notes and the vault ----

// WORKING DRAFT of the notice (vault spec, UI/UX). The wording is reviewed by the verifier (E03-T02); until then it is only
// an example of the six points the notice must make.
export const NOTICE_DRAFT_LABEL = 'Working text, waiting for legal review (E03-T02).';
export const NOTICE_ITEMS = [
  'This note is sent to an AI provider every time a seeker asks a question that the AI answers from the vault, not only questions about this note.',
  'The AI writes the answer. You do not.',
  'Until 14 December 2026 you see every answer that cites your note before the seeker does.',
  'The seeker sees your name and the title of the note.',
  'You earn 80% of 10 EUR, split equally among the mentors whose notes are cited. Payout is not available yet.',
  'You can take the note down at any time. That rejects answers waiting for review. It does not withdraw answers that were already released.',
];
export const NOTICE_VERSION = 'working-draft-1';

export const NOTES = [
  { id: 'n1', title: 'Ingress upgrades on bare metal', status: 'published' as const },
  { id: 'n2', title: 'Reading admission webhook logs', status: 'draft' as const },
  { id: 'n3', title: 'Cert-manager renewals that silently fail', status: 'taken_down' as const },
];

export const NOTE_BODY = 'When an ingress upgrade fails, read the logs of the previous container first:\n\n```\nkubectl -n ingress-nginx logs deploy/ingress-nginx-controller --previous\n```\n\nThe last line before the restart usually names the webhook that rejected the config.';

export const VAULT_QUESTION = 'Why does the ingress controller restart in a loop after upgrading from 1.9 to 1.28?';

export const VAULT_ANSWER =
  'A restart loop right after an upgrade usually means the admission webhook rejects the configuration or its certificate is not trusted.\n\nRead the logs of the previous container first:\n\n```\nkubectl -n ingress-nginx logs deploy/ingress-nginx-controller --previous\n```\n\nIf the last line says `x509: certificate signed by unknown authority`, regenerate the webhook certificate and restart the controller.';

export const VAULT_CITATIONS: VaultCitation[] = [
  { noteId: 'n1', mentorName: 'Ada Kowalska', noteTitle: 'Ingress upgrades on bare metal' },
  { noteId: 'n9', mentorName: 'Jan Nowak', noteTitle: 'Reading admission webhook logs' },
];

export const REVIEW_ITEMS: ReviewItemData[] = [
  {
    answerId: 'a1',
    question: VAULT_QUESTION,
    answerText: VAULT_ANSWER,
    ownNoteTitle: 'Ingress upgrades on bare metal',
    otherMentors: ['Jan Nowak'],
    expiresAt: '2026-11-03T15:00:00Z',
  },
  {
    answerId: 'a2',
    question: 'How do I find out which migration is holding a lock on the orders table?',
    answerText: 'Query `pg_locks` joined with `pg_stat_activity` and look for the oldest transaction that has not finished.',
    ownNoteTitle: 'Postgres locks in migrations',
    otherMentors: [],
    expiresAt: '2026-11-03T15:30:00Z',
  },
];
export const REVIEW_NOW = '2026-11-03T13:40:00Z';

export const CREDIT_ENTRIES: CreditEntry[] = [
  { id: 'c1', date: '2026-11-03T14:00:00Z', amountMinor: 400, livemode: true },
  { id: 'c2', date: '2026-11-04T09:00:00Z', amountMinor: 267, livemode: true },
  { id: 'c3', date: '2026-11-05T09:00:00Z', amountMinor: 400, livemode: false },
];

// ---- E03: terms and pilot counts ----
// The criteria and thresholds are those of decision D08. The VALUES are examples for the documentation, not pilot results:
// the pilot has not started.

export type PilotScenario = 'start' | 'review' | 'allClear';

const CRITERIA: Omit<PilotCountRow, 'value'>[] = [
  { id: 'prepaid', criterion: 'People who prepaid a 25-minute session', threshold: 'fewer than 5 people within 4 weeks of the start', reviewDate: '2026-11-30' },
  { id: 'reply', criterion: 'Median reply to a paid question', threshold: 'longer than 60 minutes', reviewDate: '2026-11-30' },
  { id: 'vault', criterion: 'People who paid for a released vault answer', threshold: 'fewer than 3 people within 4 weeks of the start', reviewDate: '2026-12-14' },
  { id: 'effort', criterion: 'Median time from landing to a prepaid booking', threshold: 'above 5 minutes', reviewDate: '2026-11-30' },
];

const VALUES: Record<PilotScenario, { value: string; trigger: PilotTrigger }[]> = {
  start: [
    { value: '1 person', trigger: 'open' },
    { value: 'No answer yet', trigger: 'open' },
    { value: '0 people', trigger: 'open' },
    { value: '4 min', trigger: 'open' },
  ],
  review: [
    { value: '3 people', trigger: 'triggered' },
    { value: '74 min', trigger: 'triggered' },
    { value: '4 people', trigger: 'clear' },
    { value: '4 min', trigger: 'clear' },
  ],
  allClear: [
    { value: '7 people', trigger: 'clear' },
    { value: '38 min', trigger: 'clear' },
    { value: '5 people', trigger: 'clear' },
    { value: '3 min', trigger: 'clear' },
  ],
};

export function pilotRows(scenario: PilotScenario): (PilotCountRow & { trigger: PilotTrigger })[] {
  return CRITERIA.map((criterion, index) => ({ ...criterion, ...VALUES[scenario][index] }));
}

// WORKING DRAFT of the pilot terms. It states only facts of the decision records (D15, D16, D17, D18, D19, R04) and is
// waiting for the legal review (E03-T01, E03-T02).
export const TERMS_SECTIONS = [
  { title: 'Who and when', text: 'The pilot runs from 2 November 2026 to 14 December 2026 for invited participants.' },
  { title: 'What you pay', text: 'A 25-minute text session costs 25 EUR. A vault answer costs 10 EUR. Payments go through Stripe.' },
  { title: 'Refunds', text: 'If a mentor does not accept your question or does not show up, you are refunded.' },
  { title: 'Your data', text: 'Your questions and messages are kept until 30 days after the pilot ends, then deleted.' },
  {
    title: 'AI answers',
    text: 'A vault answer is written by AI from notes that mentors chose to publish. The mentors whose notes are used read your question before you get the answer.',
  },
];
