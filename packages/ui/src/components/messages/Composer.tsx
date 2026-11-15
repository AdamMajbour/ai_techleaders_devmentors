'use client';

import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';

import type { ApiResult } from '../../backend/api/types';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

export interface ComposerProps {
  /** Sends the message. Resolves to the `apiCall` result. */
  onSend: (text: string) => Promise<ApiResult<unknown>>;
  /** Why writing is not possible right now. Setting it blocks the box and writes the reason under it. */
  blockedReason?: string;
  maxLength?: number;
}

// The message box of the session. Quick to write in (R02.2): Ctrl or Cmd plus Enter sends. The text is kept when
// sending fails, and it is cleared only after the server stored the message.
export function Composer({ onSend, blockedReason, maxLength = 2000 }: ComposerProps) {
  const id = useId();
  const reasonId = `${id}-reason`;
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const blocked = Boolean(blockedReason);
  const empty = text.trim().length === 0;

  async function send() {
    if (pending || blocked || empty) return;
    setError(undefined);
    setPending(true);
    const result = await onSend(text.trim());
    setPending(false);
    if (result.ok) setText('');
    else setError(`Message not sent. ${result.error.message}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send();
    }
  }

  const remaining = maxLength - text.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-group">
      <label htmlFor={id} className="sr-only">
        Message
      </label>
      <Textarea
        id={id}
        value={text}
        maxLength={maxLength}
        disabled={blocked || pending}
        aria-describedby={blocked ? reasonId : undefined}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-control border-composer-border"
      />
      {blocked ? (
        <p id={reasonId} className="m-0 text-meta text-muted-foreground">
          {blockedReason}
        </p>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-group">
        <Button type="submit" size="sm" disabled={blocked || pending || empty}>
          {pending ? 'Sending…' : 'Send'}
        </Button>
        {remaining <= maxLength * 0.1 && !blocked ? (
          <span className="text-meta text-muted-foreground">{remaining} characters left</span>
        ) : null}
        {!blocked ? <span className="text-meta text-muted-foreground">Ctrl or Cmd plus Enter sends</span> : null}
      </div>
    </form>
  );
}
