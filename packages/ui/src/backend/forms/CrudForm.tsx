'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { z } from 'zod';
import type { ApiFieldErrors, ApiResult } from '../api/types';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Field } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

export interface CrudFormOption {
  value: string;
  label: string;
}

export type CrudFormField = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'checkbox' | 'multiselect';
  options?: CrudFormOption[];
  autoComplete?: string;
  placeholder?: string;
  /** Help shown under the label, before the control. */
  hint?: string;
  /** Longer explanatory text for consent or a setting; shown with the label. */
  description?: string;
  /** Writes "(required)" or "(optional)" in the label. Mark the minority of fields. */
  requirement?: 'required' | 'optional';
};

export interface CrudFormProps<TSchema extends z.ZodType> {
  /** The same Zod schema the API route validates with: one schema, two call sites. */
  schema: TSchema;
  fields: CrudFormField[];
  initialValues?: Record<string, string | boolean | string[]>;
  /** Receives the parsed (trimmed, normalized) values; resolves to the `apiCall` result. */
  onSubmit: (values: z.output<TSchema>) => Promise<ApiResult<unknown>>;
  onSuccess?: (data: unknown) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

function fieldErrorsOf(schema: z.ZodType, values: Record<string, unknown>): ApiFieldErrors {
  const parsed = schema.safeParse(values);
  return parsed.success ? {} : (z.flattenError(parsed.error).fieldErrors as ApiFieldErrors);
}

/**
 * Schema-driven form: validates on the client with the shared schema, shows server `fieldErrors`
 * next to the right field, handles submit/cancel/loading, and maps Cmd/Ctrl+Enter to submit
 * and Escape to cancel. Use it for every create/edit form. The behaviour is the Form pattern:
 * - a visible label for every field, a hint and an error with an icon (Field);
 * - a field is validated when the user leaves a field they edited, and again as they fix it;
 * - everything is validated on submit, and after a failed submit focus moves to the first error;
 * - what was typed stays after any failure, and a second submit is ignored while one runs;
 * - success is reported only after the server confirmed it.
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
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((field) => [
      field.name,
      initialValues[field.name] ?? (field.type === 'checkbox' ? false : field.type === 'multiselect' ? [] : ''),
    ])),
  );
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ name: string } | null>(null);
  // Fields the user has edited: only these are validated when focus leaves them, so tabbing past an
  // untouched field does not show an error.
  const edited = useRef(new Set<string>());

  useEffect(() => {
    if (focusTarget) document.getElementById(`${formId}-${focusTarget.name}`)?.focus();
  }, [focusTarget, formId]);

  function focusFirstError(errors: ApiFieldErrors) {
    const first = fields.find((field) => errors[field.name]);
    if (first) setFocusTarget({ name: first.name });
  }

  function setErrorsFor(name: string, errors: string[] | undefined) {
    setFieldErrors((current) => {
      const next = { ...current };
      if (errors && errors.length > 0) next[name] = errors;
      else delete next[name];
      return next;
    });
  }

  async function submit() {
    if (isSubmitting) return;
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors as ApiFieldErrors;
      setFieldErrors(errors);
      focusFirstError(errors);
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
    const serverErrors = result.error.fieldErrors ?? {};
    setFieldErrors(serverErrors);
    focusFirstError(serverErrors);
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
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="flex flex-col gap-between-groups">
      {fields.map((field) => {
        const inputId = `${formId}-${field.name}`;
        const errors = fieldErrors[field.name];
        const setValue = (value: unknown) => {
          const next = { ...values, [field.name]: value };
          edited.current.add(field.name);
          setValues(next);
          // Once an error is showing, re-check while the user fixes it so the message goes away at once.
          if (fieldErrors[field.name]) setErrorsFor(field.name, fieldErrorsOf(schema, next)[field.name]);
        };
        const onBlur = () => {
          if (edited.current.has(field.name)) setErrorsFor(field.name, fieldErrorsOf(schema, values)[field.name]);
        };

        return (
          <Field
            key={field.name}
            id={inputId}
            label={field.label}
            hint={field.description ?? field.hint}
            requirement={field.requirement}
            error={errors ? errors.join(' ') : undefined}
            orientation={field.type === 'checkbox' ? 'inline' : 'stacked'}
          >
            {field.type === 'checkbox' ? (
              <Checkbox
                name={field.name}
                checked={values[field.name] === true}
                disabled={isSubmitting}
                onCheckedChange={(checked) => setValue(checked === true)}
                onBlur={onBlur}
              />
            ) : field.type === 'multiselect' ? (
              <fieldset
                id={inputId}
                tabIndex={-1}
                aria-describedby={errors ? `${inputId}-error` : undefined}
                aria-invalid={errors ? true : undefined}
                aria-required={field.requirement === 'required' ? true : undefined}
                className="m-0 flex min-w-0 flex-col gap-group border-0 p-0"
              >
                <legend className="sr-only">{field.label}</legend>
                {(field.options ?? []).map((option) => {
                  const optionId = `${inputId}-${option.value}`;
                  const selected = Array.isArray(values[field.name]) && (values[field.name] as string[]).includes(option.value);
                  return (
                    <label key={option.value} htmlFor={optionId} className="flex min-w-0 items-center gap-group text-body text-foreground">
                      <Checkbox
                        id={optionId}
                        name={field.name}
                        value={option.value}
                        checked={selected}
                        disabled={isSubmitting}
                        onCheckedChange={(checked) => {
                          const current = Array.isArray(values[field.name]) ? values[field.name] as string[] : [];
                          setValue(checked === true
                            ? [...current, option.value]
                            : current.filter((value) => value !== option.value));
                        }}
                        onBlur={onBlur}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </fieldset>
            ) : field.type === 'textarea' ? (
              <Textarea
                name={field.name}
                value={String(values[field.name] ?? '')}
                placeholder={field.placeholder}
                disabled={isSubmitting}
                onChange={(event) => setValue(event.target.value)}
                onBlur={onBlur}
              />
            ) : (
              <Input
                name={field.name}
                value={String(values[field.name] ?? '')}
                placeholder={field.placeholder}
                disabled={isSubmitting}
                type={field.type ?? 'text'}
                autoComplete={field.autoComplete}
                onChange={(event) => setValue(event.target.value)}
                onBlur={onBlur}
              />
            )}
          </Field>
        );
      })}

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-group">
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
