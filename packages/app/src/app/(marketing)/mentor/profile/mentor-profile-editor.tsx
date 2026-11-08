'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { mentorProfileInputSchema, type MentorProfileDto } from '@devmentor/core';
import {
  Alert,
  AlertDescription,
  apiCall,
  Button,
  Checkbox,
  ErrorMessage,
  Field,
  Input,
  LoadingMessage,
  Skeleton,
  Textarea,
  TextLink,
  useAsync,
} from '@devmentor/ui';

type ProfileFields = {
  slug: string;
  headline: string;
  bio: string;
  technologies: string;
  publicWorkUrl: string;
  isListed: boolean;
};

type FieldErrors = Partial<Record<keyof ProfileFields, string[]>>;

function initialFields(profile: MentorProfileDto | null): ProfileFields {
  return {
    slug: profile?.slug ?? '',
    headline: profile?.headline ?? '',
    bio: profile?.bio ?? '',
    technologies: profile?.technologies ?? '',
    publicWorkUrl: profile?.publicWorkUrl ?? '',
    isListed: profile?.isListed ?? false,
  };
}

function MentorProfileForm({
  profile,
  onSaved,
  onDirty,
}: {
  profile: MentorProfileDto | null;
  onSaved: () => void;
  onDirty: () => void;
}) {
  const [values, setValues] = useState(() => initialFields(profile));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Key extends keyof ProfileFields>(key: Key, value: ProfileFields[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError(null);
    onDirty();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const parsed = mentorProfileInputSchema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const name = issue.path[0];
        if (typeof name !== 'string' || !(name in values)) continue;
        const key = name as keyof ProfileFields;
        errors[key] = [...(errors[key] ?? []), issue.message];
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);
    const result = profile
      ? await apiCall<MentorProfileDto>(`/api/mentors/${encodeURIComponent(profile.id)}`, {
          method: 'PUT',
          json: parsed.data,
        })
      : await apiCall<MentorProfileDto>('/api/mentors', { method: 'POST', json: parsed.data });
    setIsSubmitting(false);

    if (result.ok) {
      onSaved();
      return;
    }

    const serverErrors = result.error.fieldErrors as FieldErrors | undefined;
    setFieldErrors(serverErrors ?? {});
    if (!serverErrors) setFormError(result.error.message);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-between-groups">
      <Field label="Profile link" hint="Use a short name; your page will be at /m/your-name." requirement="required" error={fieldErrors.slug?.join(' ')}>
        <Input
          name="slug"
          value={values.slug}
          autoComplete="off"
          disabled={isSubmitting}
          onChange={(event) => updateField('slug', event.currentTarget.value)}
        />
      </Field>
      <Field label="Headline" requirement="required" error={fieldErrors.headline?.join(' ')}>
        <Input
          name="headline"
          value={values.headline}
          disabled={isSubmitting}
          onChange={(event) => updateField('headline', event.currentTarget.value)}
        />
      </Field>
      <Field label="Bio" requirement="required" error={fieldErrors.bio?.join(' ')}>
        <Textarea
          name="bio"
          value={values.bio}
          disabled={isSubmitting}
          onChange={(event) => updateField('bio', event.currentTarget.value)}
        />
      </Field>
      <Field
        label="Technologies"
        hint="Separate technologies with spaces or commas."
        requirement="required"
        error={fieldErrors.technologies?.join(' ')}
      >
        <Input
          name="technologies"
          value={values.technologies}
          disabled={isSubmitting}
          onChange={(event) => updateField('technologies', event.currentTarget.value)}
        />
      </Field>
      <Field label="Public work URL" requirement="required" error={fieldErrors.publicWorkUrl?.join(' ')}>
        <Input
          name="publicWorkUrl"
          type="url"
          value={values.publicWorkUrl}
          disabled={isSubmitting}
          onChange={(event) => updateField('publicWorkUrl', event.currentTarget.value)}
        />
      </Field>
      <Field
        label="List this profile"
        hint="When selected, pilot members can find your profile at /mentors."
        orientation="inline"
        error={fieldErrors.isListed?.join(' ')}
      >
        <Checkbox
          checked={values.isListed}
          disabled={isSubmitting}
          onCheckedChange={(checked) => updateField('isListed', checked === true)}
        />
      </Field>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : profile ? 'Save profile' : 'Create profile'}
      </Button>
    </form>
  );
}

export function MentorProfileEditor() {
  const [reloads, setReloads] = useState(0);
  const [saved, setSaved] = useState(false);
  const profileRequest = useAsync(
    () => apiCall<MentorProfileDto | null>('/api/mentors/me'),
    [reloads],
  );
  const result = profileRequest.data;
  const profile = result?.ok ? result.data : undefined;
  const error = result && !result.ok ? result.error.message : profileRequest.error?.message;

  if (profileRequest.status === 'idle' || profileRequest.status === 'pending') {
    return (
      <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact" aria-busy="true">
        <LoadingMessage />
        {saved && (
          <p role="status" className="m-0 text-body text-status-success">
            Profile saved.
          </p>
        )}
        <Skeleton className="h-control w-2/3" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  if (profile === undefined) {
    return (
      <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
        <div className="flex items-start justify-between gap-group">
          <ErrorMessage
            message={error ?? 'Your mentor profile could not be loaded. Try again.'}
            onRetry={() => setReloads((count) => count + 1)}
          />
        </div>
        <TextLink asChild>
          <Link href="/mentors">Back to mentors</Link>
        </TextLink>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <div className="flex flex-wrap items-center justify-between gap-group">
        <TextLink asChild>
          <Link href="/mentors">Back to mentors</Link>
        </TextLink>
      </div>
      <header className="flex flex-col gap-group">
        <h1 className="m-0 text-page-title font-strong text-headline">
          {profile ? 'Edit mentor profile' : 'Create mentor profile'}
        </h1>
        <p className="m-0 text-body text-muted-foreground">
          Keep your experience and public work details up to date.
        </p>
      </header>
      {saved && (
        <p role="status" className="m-0 text-body text-status-success">
          Profile saved.
        </p>
      )}
      <MentorProfileForm
        key={profile?.id ?? 'new'}
        profile={profile}
        onSaved={() => {
          setSaved(true);
          setReloads((count) => count + 1);
        }}
        onDirty={() => setSaved(false)}
      />
    </main>
  );
}
