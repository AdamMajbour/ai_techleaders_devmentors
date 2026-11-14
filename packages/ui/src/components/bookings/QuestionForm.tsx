'use client';

import { useEffect, useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';

import type { ApiFieldErrors, ApiResult } from '../../backend/api/types';
import { formatPrice } from '../../lib/format';
import { TermsConsent } from '../consents/TermsConsent';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Textarea } from '../ui/textarea';
import { PriceNotice } from './PriceNotice';

export interface QuestionFormProps {
  /** The mentor who reads the question. Leave out when someone else reads it (a vault answer): then set `priceDescription` and `fieldHint`. */
  mentorName?: string;
  priceMinor: number;
  currency: string;
  /** What the price buys. Defaults to a 25-minute text session with the mentor. */
  priceDescription?: string;
  /** Help under the label of the question field. Defaults to the mentor's line. */
  fieldHint?: string;
  /** Defaults to the refund rule of R04. */
  refundRule?: string;
  /** Hide the standard notice when the parent screen keeps price visible before a prior choice. */
  showPriceNotice?: boolean;
  /** Custom text for the final action, for example when booking a specific session. */
  submitLabel?: string;
  /** Additional booking requirement controlled by the parent form. */
  actionBlockedReason?: string;
  termsHref: string;
  termsVersionId: string;
  termsSha256: string;
  /** The owner's wording about data and retention. Not written by the component. */
  termsHint?: ReactNode;
  /** Use only when the action is not consenting to published terms, such as a mock checkout. */
  consentLabel?: ReactNode;
  /** Sends the question and starts the payment. Resolves to the `apiCall` result. */
  onSubmit: (input: { question: string; acceptedTerms: true; termsVersionId: string; termsSha256: string }) => Promise<ApiResult<unknown>>;
  /** Called only after the server confirmed. The caller sends the user to the payment. */
  onSuccess?: (data: unknown) => void;
  /** Shortest question that is accepted. A proposal, not a decision. */
  minLength?: number;
  maxLength?: number;
}

const DEFAULT_REFUND_RULE = 'You pay now, before you write. If the mentor does not accept or does not show up, you are refunded.';

// The paid form of E01-S02. The price comes first (R04), then the question, then the terms, then the button that
// says what it will charge. The button explains itself while it is blocked, and what the user wrote is kept
// after every failure. Follows the Form and Paid action flow patterns.
export function QuestionForm({
  mentorName,
  priceMinor,
  currency,
  priceDescription,
  fieldHint,
  refundRule = DEFAULT_REFUND_RULE,
  showPriceNotice = true,
  submitLabel,
  actionBlockedReason,
  termsHref,
  termsVersionId,
  termsSha256,
  termsHint,
  consentLabel,
  onSubmit,
  onSuccess,
  minLength = 10,
  maxLength = 4000,
}: QuestionFormProps) {
  const formId = useId();
  const [question, setQuestion] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [edited, setEdited] = useState(false);
  const [questionError, setQuestionError] = useState<string | undefined>();
  const [termsError, setTermsError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ field: 'question' | 'terms'; n: number } | null>(null);

  useEffect(() => {
    if (focusTarget) document.getElementById(`${formId}-${focusTarget.field}`)?.focus();
  }, [focusTarget, formId]);

  const trimmed = question.trim();
  const lengthProblem =
    trimmed.length === 0 ? 'Write your question to continue' : trimmed.length < minLength ? `Add a little more detail: at least ${minLength} characters` : undefined;
  const blockedReason = actionBlockedReason ?? lengthProblem ?? (accepted ? undefined : 'Accept the pilot terms to continue');

  function checkQuestion(value: string): string | undefined {
    const text = value.trim();
    if (text.length < minLength) return `Write at least ${minLength} characters so a mentor can answer.`;
    return undefined;
  }

  async function submit() {
    if (pending || blockedReason) return;
    setFormError(undefined);
    setPending(true);
    const result = await onSubmit({ question: trimmed, acceptedTerms: true, termsVersionId, termsSha256 });
    setPending(false);
    if (result.ok) {
      onSuccess?.(result.data);
      return;
    }
    const fields: ApiFieldErrors = result.error.fieldErrors ?? {};
    setQuestionError(fields.question?.join(' '));
    setTermsError(fields.acceptedTerms?.join(' '));
    if (fields.question) setFocusTarget({ field: 'question', n: Date.now() });
    else if (fields.acceptedTerms) setFocusTarget({ field: 'terms', n: Date.now() });
    if (!result.error.fieldErrors) setFormError(result.error.message);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  }

  const remaining = maxLength - question.length;

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="flex flex-col gap-between-groups">
      {showPriceNotice ? <PriceNotice
        amountMinor={priceMinor}
        currency={currency}
        description={priceDescription ?? (mentorName ? `for a 25-minute text session with ${mentorName}` : 'for one answer')}
        refundRule={refundRule}
      /> : null}
      <Field
        id={`${formId}-question`}
        label="Your question"
        requirement="required"
        hint={
          fieldHint ??
          `${mentorName ? `${mentorName} reads it before accepting. ` : ''}Paste the error and what you already tried. Do not paste secrets.`
        }
        error={questionError}
      >
        <Textarea
          name="question"
          value={question}
          maxLength={maxLength}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value;
            setQuestion(next);
            setEdited(true);
            if (questionError) setQuestionError(checkQuestion(next));
          }}
          onBlur={() => {
            if (edited) setQuestionError(checkQuestion(question));
          }}
        />
      </Field>
      {remaining <= maxLength * 0.1 ? (
        <p className="m-0 text-meta text-muted-foreground">{remaining} characters left</p>
      ) : null}
      <TermsConsent
        id={`${formId}-terms`}
        checked={accepted}
        onCheckedChange={(value) => {
          setAccepted(value);
          if (value) setTermsError(undefined);
        }}
        termsHref={termsHref}
        hint={termsHint}
        label={consentLabel}
        error={termsError}
      />
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        {pending ? (
          <Button type="submit" disabled>
            Sending…
          </Button>
        ) : (
          <Button type="submit" disabledReason={blockedReason}>
            {submitLabel ?? `Pay ${formatPrice(priceMinor, currency)} and send`}
          </Button>
        )}
      </div>
    </form>
  );
}
