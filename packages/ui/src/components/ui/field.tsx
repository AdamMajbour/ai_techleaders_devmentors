import { Slot } from '@radix-ui/react-slot';
import { CircleAlert } from 'lucide-react';
import { useId, type ReactElement, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface FieldProps {
  /** The visible name of the field. Required: a placeholder is an example, never the name. */
  label: ReactNode;
  /** What helps the user fill the field in. Shown under the label, before the control. */
  hint?: ReactNode;
  /** What is wrong and what to do. Setting it marks the control invalid and announces the message. */
  error?: ReactNode;
  /** Writes "(required)" or "(optional)" next to the label and sets `aria-required` for required. Mark the minority. */
  requirement?: 'required' | 'optional';
  /** `inline` puts the control before the label (a checkbox). `stacked` puts the label above the control. */
  orientation?: 'stacked' | 'inline';
  /** Overrides the generated id that links the label, hint and error to the control. */
  id?: string;
  className?: string;
  /** Exactly one control: Input, Textarea, Select or Checkbox. Field passes it id and the aria attributes. */
  children: ReactElement;
}

// Wires label, hint and error to the control, so nobody has to remember aria-describedby.
// Colour is never the only cue: an error is a sentence with an icon (WCAG 1.4.1, 3.3.1),
// and it is announced when it appears (role="alert", WCAG 4.1.3).
export function Field({ label, hint, error, requirement, orientation = 'stacked', id, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  const inline = orientation === 'inline';

  const control = (
    <Slot
      id={controlId}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={requirement === 'required' ? true : undefined}
    >
      {children}
    </Slot>
  );
  const labelElement = (
    <label htmlFor={controlId} className={inline ? 'text-body text-foreground' : 'text-label font-strong text-headline'}>
      {label}
      {requirement ? <span className="font-normal text-muted-foreground"> ({requirement})</span> : null}
    </label>
  );
  const hintElement = hint ? (
    <p id={hintId} className="m-0 text-meta text-muted-foreground">
      {hint}
    </p>
  ) : null;
  const errorElement = error ? (
    <p id={errorId} role="alert" className="m-0 flex items-start gap-group text-label text-destructive">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </p>
  ) : null;

  if (inline) {
    return (
      <div className={cn('flex items-start gap-group', className)}>
        {control}
        <div className="flex flex-col gap-group">
          {labelElement}
          {hintElement}
          {errorElement}
        </div>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-col gap-group', className)}>
      {labelElement}
      {hintElement}
      {control}
      {errorElement}
    </div>
  );
}
