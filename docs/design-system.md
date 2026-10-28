# DevMentor design system: a short guide for agents

Read this file **first** when you build or change a screen. The full documentation is the Storybook in `packages/ui` (`npm run storybook` in that directory). The components live in `packages/ui` and are imported from `@devmentor/ui`.

## Character of the product

A calm, dense tool for a developer with a concrete blocker and a mentor who has done the same thing. Screens show facts in plain words (what the mentor did, the price, where the money stands). One warm-grey look, one lime accent, no selling, no scores, no decoration.

- Words (a proposal, not confirmed by the owner): factual, dense, warm, calm, concrete.
- Not: generic, loud, school-like, social, decorative.
- Sources: `lekcja-06/referencje.md` (R01, R02, A01), `lekcja-06/tokeny.md`, the product brief.

## Build a screen in five steps

1. Find the pattern: Form, List with filters, Detail view, Confirm destructive action, Paid action flow, Session thread, Review queue (Storybook > Patterns).
2. Choose components with "How to choose" (Storybook > Design system). If none exists, read "What is missing" before you write one.
3. Use semantic tokens. Never a colour value, a Tailwind palette class or an arbitrary value.
4. Design the data states: loading, empty, error, many items, long text.
5. Check "What to avoid", then run the commands at the end of this file.

## Components

| Component (`import { … } from '@devmentor/ui'`) | Use it when | Do not use it when |
|---|---|---|
| `Alert` | A form-level error, a failed payment, test mode. | An error about one field (Field), a one-word status (StatusBadge). |
| `Button` | The user does something: send, pay, accept. | The user goes somewhere (TextLink). |
| `Card` | A panel that holds one task and must stand out, such as the sign-in form. | Rows of a list or table: they are divided by a line, not boxed (R01.1). |
| `Checkbox` | Accepting the pilot terms, a setting. | One choice from several (Select). |
| `ConfirmDialog` | Taking a note down, cancelling a booking. | An action that can be undone, or an error message. |
| `Dialog` | Editing one small thing without leaving the page. | A question that needs a yes or no (ConfirmDialog), a long form (its own page). |
| `Field` | Around every Input, Textarea, Select and Checkbox. | A control with no label: there is none. |
| `Input` | A title, an email, a short answer. | Several lines (Textarea), a choice from a list (Select). |
| `Select` | A technology filter. | A list long enough to need search (no component yet). |
| `Skeleton` | The layout is known and the data is loading. | The layout is not known, or the wait is a single action (LoadingMessage). |
| `StatusBadge` | Where a record stands: Draft, Published. | A sentence (Alert), a count. |
| `Table` | Several attributes to compare (R01.3). | One column of text (a list), long paginated data (DataTable). |
| `Textarea` | A question, a note, a message. | One line (Input). |
| `TextLink` | The user goes to another page. | The user does something (Button). |
| `EmptyState` | No records yet, or no results for the filters. | A load that failed (ErrorMessage). |
| `ErrorMessage` | A list or a page could not be loaded. | A form error (Alert, Field). |
| `LoadingMessage` | Together with Skeleton blocks while a region loads. | On its own where the layout is known (add Skeleton). |
| `MarkdownView` | A note, a seeker's question, a generated answer. | Text the product writes itself (plain elements). |
| `CrudForm` | Creating or editing a record with text fields. | A form with a checkbox or a price (compose Field and controls). |
| `DataTable` | A list of records with columns, pagination or row actions. | A handful of fixed rows (Table). |
| `BookingRow` | The mentor's and the seeker's list of bookings. | One booking in full (Detail view). |
| `BookingStatus` | Next to a booking. | A status that is not a booking's (StatusBadge). |
| `PriceNotice` | Above any field that leads to a payment (R04). | A price inside a row or a table. |
| `QuestionForm` | Asking a mentor or the vault a question for a price. | A form without a price (CrudForm), a message in a session (Composer). |
| `TermsConsent` | Before a payment. | Any other yes or no (Checkbox in a Field). |
| `MentorRow` | The list a seeker chooses from. | A rating or ranking: there is none (N02). |
| `MessageItem` | Inside a session thread. | A long written answer (MarkdownView). |
| `Composer` | Under the conversation. | A form with several fields. |
| `SessionThread` | The page of an accepted session. | A chat without a time window. |
| `NoteEditor` | Writing and editing a note. | Publishing it (PublishNoticePanel). |
| `PublishNoticePanel` | Beside the editor of a draft or a taken-down note. | A seeker's terms (TermsConsent). |
| `VaultAnswerView` | The page of one vault answer. | The answer a mentor reviews (ReviewItem). |
| `ReviewItem` | The list of answers to review. | The seeker's view of the answer (VaultAnswerView). |
| `CreditsPanel` | The notes page of a mentor. | Counts for the operator (PilotCountsTable). |
| `PilotCountsTable` | The operator's page of pilot counts. | A chart, or a long paginated list. |

Components with a story for every state, a page of 13 sections and a test: see Storybook. Product components are in `packages/ui/src/components/<concept>/`, general ones in `components/ui/` and `backend/`.

## Semantic tokens

Defined in `packages/ui/src/styles/tokens.css` and mapped to Tailwind in `index.css`. Use the utilities, not the values.

| Token | Utility | Purpose |
|---|---|---|
| `--background` | `bg-background` | The page |
| `--card` | `bg-card` | A panel that must stand out. Rows are divided by a line, not by cards |
| `--foreground`, `--headline` | `text-foreground`, `text-headline` | Text, headings, column headers |
| `--muted-foreground` | `text-muted-foreground` | Secondary text, author and time |
| `--muted` | `bg-muted` | Code and file names |
| `--primary`, `--primary-foreground` | `bg-primary`, `text-primary-foreground` | The one accent: one main action per screen |
| `--link` | `text-link` | Links (always underlined) |
| `--status-success` | `text-status-success`, `bg-status-success` | A running or healthy state, with words beside it. Not the accent |
| `--border` | `border-border` | A hairline between rows |
| `--input` | `border-input` | The outline of a control (needs 3:1) |
| `--ring` | `ring-ring` | Keyboard focus |
| `--destructive` | `bg-destructive`, `text-destructive` | Destructive actions and errors |
| `--accent` | `bg-accent` | A hover surface. **Not** the brand accent |
| `--space-group` | `gap-group`, `p-group` | Inside a group: label and field |
| `--space-between-groups` | `gap-between-groups` | Between groups in a panel |
| `--space-panel-compact` | `p-panel-compact` | Inside a dense row (lists, tables) |
| `--space-panel-roomy` | `p-panel-roomy` | Inside a panel of the session view |
| `--space-section` | `py-section` | Between page sections |
| `--control-height`, `--control-height-compact` | `h-control`, `h-control-compact` | 40 px (forms), 32 px (rows) |
| `--font-size-*` | `text-page-title`, `text-section-title`, `text-body`, `text-label`, `text-meta`, `text-code` | Typography roles |
| `--family-code` | `font-code` | Code and file names |
| `--layout-content-max`, `--layout-session-max` | `max-w-content`, `max-w-session` | Lists and tables, the session column |

Themes: dark is the default, light is `[data-theme='light']` on the document root.

## If... then use...

| If | Use |
|---|---|
| The user does something | `Button` (one filled per screen) |
| The user goes somewhere | `TextLink` |
| A yes or no saved with a form | `Checkbox` in a `Field` |
| One choice from a short list | `Select` |
| A message about one field | The `error` of `Field` |
| A message about the form or page, kept until fixed | `Alert` |
| A failed load | `ErrorMessage` with a retry |
| Something that cannot be undone | `ConfirmDialog` naming the object |
| The user has to read before acting | A section or page, not a layer |
| Rows to compare by several attributes | `Table` or `DataTable` |
| Rows of prose with an action | A `ul` divided by a hairline |
| A loading region | `LoadingMessage` and `Skeleton`, in an `aria-busy` region |
| A status | `StatusBadge` or a status component, with words |

No component exists yet for: action menu, radio group, combobox, switch, side panel, popover, tooltip, tabs, toast. Do not add one on the side: see "Contributing".

## What to avoid

- **Of this product:** courses (progress bars, badges, certificates), ratings and rankings ("Top mentor", stars), a registration wall, sales language, video or live indicators, social features (A02 to A07).
- **The generic AI look:** gradients, glass and blur, glow, emoji instead of icons, sparkles as the symbol of AI, three identical cards with an icon, everything in pills, a card in a card, a shadow as the only separator, everything centred (A01).
- **Mistakes in code:** a value outside the tokens, a variant added on the side, a `div` instead of a button, a placeholder instead of a label, a status shown only by colour, a blocked button with no explanation (`disabledReason`), a toast with an error that needs action, a tooltip with information needed to act.

## Content

English. A button is a verb and an object ("Pay 25 EUR and send"). An error says what happened and what to do. An empty state says why it is empty and what to do next. Formats (proposals): date `3 Nov 2026`, time `14:25`, price `25 EUR` in sentences and `25.00 EUR` in tables, duration `1 h 20 min`. Use `lib/format.ts`.

## Commands

Run from `packages/ui`.

| Command | What it does |
|---|---|
| `npm run storybook` | Starts Storybook on port 6006 |
| `npm run build-storybook` | Builds the static Storybook |
| `npm run check:tokens` | Lists every value outside the tokens, with file and line |
| `npm run tokens:contrast` | Measures every colour pair in both themes |
| `npm run check:catalogue` | Checks the catalogue against the package (after a build) |
| `npm run test:stories:jsdom` | Plays every story and checks accessibility, with no browser |
| `npm run type-check` | TypeScript |

From the repository root: `npm test`, `npm run lint`.
