'use client';

import { useState } from 'react';
import type { ApiResult } from '../api/types';
import { Button } from '../../components/ui/button';

export interface ActionButtonProps {
  label: string;
  run: () => Promise<ApiResult<unknown>>;
  confirm?: string;
  onDone: () => void;
}

export function ActionButton({ label, run, confirm, onDone }: ActionButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isRunning || (confirm && !window.confirm(confirm))) return;

    setError(null);
    setIsRunning(true);
    try {
      const result = await run();
      if (result.ok) onDone();
      else setError(result.error.message);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-group">
      <Button type="button" disabled={isRunning} aria-busy={isRunning} onClick={() => void handleClick()}>
        {isRunning ? 'Working…' : label}
      </Button>
      {error && (
        <span role="alert" className="text-meta text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
