'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { UserDto } from '@devmentor/core';
import { Alert, AlertDescription, apiCall, Button, Field, Input, TextLink } from '@devmentor/ui';

export function ProfileEditor({ user, isMentor }: { user: UserDto; isMentor: boolean }) {
  const [name, setName] = useState(user.name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await apiCall<UserDto>('/api/auth/me', { method: 'PUT', json: { name } });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setName(result.data.name);
    setSaved(true);
  }

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-col gap-group"><h1 className="m-0 text-page-title font-strong text-headline">My profile</h1><p className="m-0 text-body text-muted-foreground">Update the name shown to other people in DevMentor.</p></header>
      {saved ? <p role="status" className="m-0 text-body text-status-success">Profile saved.</p> : null}
      <form onSubmit={submit} className="flex max-w-prose flex-col gap-between-groups">
        <Field label="Name" requirement="required"><Input name="name" autoComplete="name" value={name} disabled={saving} onChange={(event) => { setName(event.currentTarget.value); setSaved(false); }} /></Field>
        <Field label="E-mail" hint="Contact support if you need to change the address used to sign in."><Input value={user.email} disabled readOnly /></Field>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save profile'}</Button>
      </form>
      {isMentor ? <section className="flex flex-col items-start gap-group border-t border-border pt-section"><h2 className="m-0 text-section-title font-strong text-headline">Mentor profile</h2><p className="m-0 text-body text-muted-foreground">Set the public details seekers use to find and choose you.</p><TextLink asChild><Link href="/mentor/profile">Edit mentor profile</Link></TextLink></section> : null}
    </main>
  );
}
