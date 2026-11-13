'use client';

import { useId, useState, type FormEvent } from 'react';

import type { ApiResult } from '../../backend/api/types';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Field } from '../ui/field';

export interface PublishNoticePanelProps {
  /** The points of the notice, one sentence each. The text is owned by the product and reviewed by the verifier (E03-T02), not by this component. */
  noticeItems: string[];
  /** The version the server expects. Sent back with the consent so a changed notice is never accepted unread. */
  noticeVersion: string;
  termsVersionId: string;
  termsSha256: string;
  /** Publishes the note. Resolves to the `apiCall` result. */
  onPublish: (input: { consent: true; noticeVersion: string; acceptedTerms: true; termsVersionId: string; termsSha256: string }) => Promise<ApiResult<unknown>>;
  /** Called only after the server confirmed. */
  onSuccess?: (data: unknown) => void;
  /** Why publishing is not possible now (for example the notice is not yet reviewed). Blocks the button and says why. */
  blockedReason?: string;
}

// The main trust moment of the vault (D09): the mentor reads what happens to the note and agrees to it, every time
// they publish. Consent is never pre-ticked and is not kept from an earlier publication.
export function PublishNoticePanel({ noticeItems, noticeVersion, termsVersionId, termsSha256, onPublish, onSuccess, blockedReason }: PublishNoticePanelProps) {
  const headingId = useId();
  const [consent, setConsent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const reason = blockedReason ?? (consent && acceptedTerms ? undefined : 'Read and accept both items to publish');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || reason) return;
    setError(undefined);
    setPending(true);
    const result = await onPublish({ consent: true, noticeVersion, acceptedTerms: true, termsVersionId, termsSha256 });
    setPending(false);
    if (result.ok) onSuccess?.(result.data);
    else setError(result.error.message);
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-between-groups">
      <h2 id={headingId} className="m-0 text-section-title font-strong text-headline">
        Before you publish this note
      </h2>
      <p className="m-0 text-body text-foreground">Read how the note is used. You agree again every time you publish.</p>
      <ol className="m-0 flex list-decimal flex-col gap-group pl-panel-roomy text-body text-foreground">
        {noticeItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <form onSubmit={submit} noValidate className="flex flex-col gap-between-groups">
        <Field orientation="inline" label="I have read this and I agree that this note is used this way.">
          <Checkbox checked={consent} disabled={pending} onCheckedChange={(value) => setConsent(value === true)} />
        </Field>
        <Field orientation="inline" label={<span>I accept the current <a href="/terms" className="underline">mentor pilot terms</a>.</span>}>
          <Checkbox checked={acceptedTerms} disabled={pending} onCheckedChange={(value) => setAcceptedTerms(value === true)} />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div>
          {pending ? (
            <Button type="submit" disabled>
              Publishing…
            </Button>
          ) : (
            <Button type="submit" disabledReason={reason}>
              Publish note
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
