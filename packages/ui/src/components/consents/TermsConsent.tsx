'use client';

import type { ReactNode } from 'react';

import { Checkbox } from '../ui/checkbox';
import { Field } from '../ui/field';
import { TextLink } from '../ui/text-link';

export interface TermsConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Where the full terms are. The link opens the terms, it never accepts them. */
  termsHref: string;
  /** Why the user must accept, or what is kept. Written by the owner of the terms, not by the component. */
  hint?: ReactNode;
  /** Shown when the user tries to continue without accepting. Say what to do. */
  error?: string;
  /** Lets the form move focus to the checkbox when the server refuses the consent. */
  id?: string;
}

// Consent is never pre-ticked and never hidden: an inline checkbox with a visible sentence and a link to the
// full text (E03-S01). The wording of the terms themselves is owed by the legal review (E03-T01, E03-T02).
export function TermsConsent({ checked, onCheckedChange, termsHref, hint, error, id }: TermsConsentProps) {
  return (
    <Field
      id={id}
      orientation="inline"
      hint={hint}
      error={error}
      label={
        <>
          I accept the <TextLink href={termsHref}>pilot terms</TextLink>
        </>
      }
    >
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
    </Field>
  );
}
