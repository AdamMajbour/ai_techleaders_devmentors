'use client';

import type { ReactNode } from 'react';

import { Alert, AlertDescription } from './alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { buttonVariants } from './button';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The question. Name the object: `Take down "Ingress upgrade notes"?`, never "Are you sure?". */
  title: string;
  /** What happens and whether it can be undone. */
  description?: ReactNode;
  /** The action as a verb and an object: "Take down note". Never "OK" or "Yes". */
  confirmLabel: string;
  /** The way out. Defaults to "Cancel". */
  cancelLabel?: string;
  /** `destructive` for an action that deletes or cannot be undone. */
  tone?: 'default' | 'destructive';
  /** Runs when the user confirms. The dialog stays open: close it from `onOpenChange` once it has worked. */
  onConfirm: () => void | Promise<void>;
  /** The action is running. Blocks both buttons so it cannot be sent twice. */
  pending?: boolean;
  /** Replaces the confirm label while pending ("Taking down…"). */
  pendingLabel?: string;
  /** Why the action failed and what to do. Shown inside the dialog, which stays open. */
  error?: string;
}

// One shape for every "are you sure" in the product, so the destructive pattern is the same everywhere:
// the object is named in the question, the way out is easy to find, the confirm button names the action.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  pending = false,
  pendingLabel,
  error,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={cn(buttonVariants({ variant: tone === 'destructive' ? 'destructive' : 'default' }))}
            onClick={(event) => {
              // Radix closes an alert dialog on Action. The caller decides when, after the work succeeded.
              event.preventDefault();
              void onConfirm();
            }}
          >
            {pending && pendingLabel ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
