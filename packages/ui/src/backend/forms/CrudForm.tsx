'use client';

import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { z } from 'zod';
import type { ApiFieldErrors, ApiResult } from '../api/types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

export type CrudFormField = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'textarea';
  autoComplete?: string;
  placeholder?: string;
};

export interface CrudFormProps<TSchema extends z.ZodType> {
  /** The same Zod schema the API route validates with: one schema, two call sites. */
  schema: TSchema;
  fields: CrudFormField[];
  initialValues?: Record<string, string>;
  /** Receives the parsed (trimmed, normalized) values; resolves to the `apiCall` result. */
  onSubmit: (values: z.output<TSchema>) => Promise<ApiResult<unknown>>;
  onSuccess?: (data: unknown) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

/**
 * Schema-driven form: validates on the client with the shared schema, shows server `fieldErrors`
 * next to the right field, handles submit/cancel/loading, and maps Cmd/Ctrl+Enter to submit
 * and Escape to cancel. Use it for every create/edit form.
 */
export function CrudForm<TSchema extends z.ZodType>({
  schema,
  fields,
  initialValues = {},
  onSubmit,
  onSuccess,
  onCancel,
  submitLabel = 'Save',
}: CrudFormProps<TSchema>) {
  const formId = useId();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, initialValues[field.name] ?? ''])),
  );
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) return;
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as ApiFieldErrors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    const result = await onSubmit(parsed.data);
    setIsSubmitting(false);

    if (result.ok) {
      onSuccess?.(result.data);
      return;
    }
    setFieldErrors(result.error.fieldErrors ?? {});
    // Field errors explain themselves; otherwise show the server's message once, for the whole form.
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
    } else if (event.key === 'Escape' && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="flex flex-col gap-4">
      {fields.map((field) => {
        const inputId = `${formId}-${field.name}`;
        const errorId = `${inputId}-error`;
        const errors = fieldErrors[field.name];
        const shared = {
          id: inputId,
          name: field.name,
          value: values[field.name],
          placeholder: field.placeholder,
          disabled: isSubmitting,
          'aria-invalid': errors ? true : undefined,
          'aria-describedby': errors ? errorId : undefined,
          onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [field.name]: event.target.value })),
        };

        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <Textarea {...shared} rows={5} />
            ) : (
              <Input {...shared} type={field.type ?? 'text'} autoComplete={field.autoComplete} />
            )}
            {errors && (
              <p id={errorId} className="m-0 text-sm text-destructive">
                {errors.join(' ')}
              </p>
            )}
          </div>
        );
      })}

      {formError && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
