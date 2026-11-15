'use client';

import { useCallback, useEffect, useState } from 'react';
import { mentorInvitationCreateSchema, STACK_TAGS } from '@devmentor/core';
import { apiCall, CrudForm, InvitationBatch, type InvitationBatchSection } from '@devmentor/ui';

interface InvitationRow {
  id: string;
  email: string;
  displayName: string | null;
  acceptedAt: string | null;
  publishDueAt: string | null;
  stackTags: string[];
  status: InvitationBatchSection['invitations'][number]['status'];
}

interface BatchData {
  id: string;
  number: number;
  state: 'Open' | 'Full' | 'Stopped';
  openedAt: string;
  sent: number;
  accepted: number;
  published: number;
  invitations: InvitationRow[];
}

interface Overview {
  batches: BatchData[];
  stopped: boolean;
  preBatchInvitations: InvitationRow[];
}

interface CreatedInvitation {
  email: string;
}

const STOPPED_MESSAGE = 'Invitations are stopped: fewer than 5 of the first 20 published a slot within two weeks. Interview the decliners first.';
const invitationFields = [
  { name: 'email', label: 'Email', type: 'email' as const, requirement: 'required' as const, autoComplete: 'email' },
  {
    name: 'stackTags',
    label: 'Stack tags',
    type: 'multiselect' as const,
    requirement: 'required' as const,
    options: [
      { value: 'typescript', label: 'TypeScript' },
      { value: 'nextjs', label: 'Next.js' },
      { value: 'node-js', label: 'Node.js' },
      { value: 'python', label: 'Python' },
    ],
  },
];

function toSection(batch: BatchData): InvitationBatchSection {
  return {
    title: `Batch ${batch.number}`,
    state: batch.state,
    sent: batch.sent,
    accepted: batch.accepted,
    published: batch.published,
    invitations: batch.invitations,
  };
}

export function InvitationsView() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [formRevision, setFormRevision] = useState(0);

  const refresh = useCallback(async () => {
    setLoadError(null);
    const result = await apiCall<Overview>('/api/operator/invitation-batches');
    if (result.ok) setOverview(result.data);
    else setLoadError(result.error.message);
    setIsLoading(false);
    return result.ok;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function openBatch(number: number) {
    if (!window.confirm(`Open batch ${number}? It takes up to 20 invitations.`)) return;
    setIsOpening(true);
    setActionError(null);
    setSuccessMessage(null);
    const result = await apiCall('/api/operator/invitation-batches', { method: 'POST' });
    setIsOpening(false);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    await refresh();
  }

  async function sendInvitation(values: { email: string; stackTags: typeof STACK_TAGS[number][] }) {
    return apiCall<CreatedInvitation>('/api/operator/invitations', { method: 'POST', json: values });
  }

  async function onInvitationSent(data: unknown) {
    const invitation = data as CreatedInvitation;
    setSuccessMessage(`Invitation sent to ${invitation.email}`);
    setActionError(null);
    setFormRevision((revision) => revision + 1);
    await refresh();
  }

  if (isLoading) return <p role="status" className="m-0 text-body text-muted-foreground">Loading invitations…</p>;
  if (loadError && !overview) return <p role="alert" className="m-0 text-body text-destructive">{loadError}</p>;
  if (!overview) return null;

  const latest = overview.batches[0];
  const isOpen = latest?.state === 'Open' && !overview.stopped;
  const nextBatchNumber = (latest?.number ?? 0) + 1;

  return (
    <div className="flex min-w-0 flex-col gap-between-groups">
      {overview.stopped ? <p role="alert" className="m-0 border-l-4 border-destructive bg-muted p-panel-compact text-body text-foreground">{STOPPED_MESSAGE}</p> : null}
      {loadError ? <p role="alert" className="m-0 text-body text-destructive">{loadError}</p> : null}
      {actionError ? <p role="alert" className="m-0 text-body text-destructive">{actionError}</p> : null}
      {successMessage ? <p role="status" className="m-0 text-body text-foreground">{successMessage}</p> : null}

      {!overview.stopped && overview.batches.length === 0 ? (
        <section className="flex min-w-0 flex-col items-start gap-group border-t border-border py-panel-compact">
          <p className="m-0 text-body text-muted-foreground">No batches yet. Open the first batch to start inviting.</p>
          <button type="button" className="min-h-control rounded-sm bg-primary px-panel-compact text-body font-strong text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={isOpening} onClick={() => void openBatch(1)}>
            {isOpening ? 'Opening…' : 'Open batch 1'}
          </button>
        </section>
      ) : null}

      {!overview.stopped && overview.batches.length > 0 && !isOpen ? (
        <section className="flex min-w-0 flex-col items-start gap-group border-t border-border py-panel-compact">
          <p className="m-0 text-body text-muted-foreground">This batch is full. Open a new batch to invite more.</p>
          <button type="button" className="min-h-control rounded-sm bg-primary px-panel-compact text-body font-strong text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={isOpening} onClick={() => void openBatch(nextBatchNumber)}>
            {isOpening ? 'Opening…' : `Open batch ${nextBatchNumber}`}
          </button>
        </section>
      ) : null}

      {isOpen ? (
        <section aria-label="Send an invitation" className="flex min-w-0 flex-col gap-group border-t border-border py-panel-compact">
          <h2 className="m-0 text-section-title font-strong text-headline">Send an invitation</h2>
          <CrudForm
            key={formRevision}
            schema={mentorInvitationCreateSchema}
            fields={invitationFields}
            initialValues={{ email: '', stackTags: [] }}
            submitLabel="Send invitation"
            onSubmit={sendInvitation}
            onSuccess={onInvitationSent}
          />
        </section>
      ) : null}

      {overview.batches.map((batch) => <InvitationBatch key={batch.id} section={toSection(batch)} />)}
      {overview.preBatchInvitations.length ? (
        <InvitationBatch section={{ title: 'Created before batches', invitations: overview.preBatchInvitations }} />
      ) : null}
    </div>
  );
}
