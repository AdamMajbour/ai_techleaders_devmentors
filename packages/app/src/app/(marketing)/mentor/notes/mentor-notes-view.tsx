'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NoteDto, NoteSummaryDto, Page } from '@devmentor/core';
import {
  apiCall,
  ActionButton,
  Button,
  DataTable,
  MarkdownView,
  NoteEditor,
  noteStatusLabel,
  Page as PageShell,
  PublishNoticePanel,
  StatusBadgePrimitive,
  useAsync,
  type ApiResult,
  type DataTableColumn,
  CreditsPanel,
} from '@devmentor/ui';
import {
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
  VAULT_NOTICE_DRAFT_LABEL,
  VAULT_NOTICE_ITEMS,
  VAULT_NOTICE_VERSION,
  noteDtoSchema,
  noteInputSchema,
} from '@devmentor/core';

function noteHref(id: string) {
  return `/mentor/notes/${encodeURIComponent(id)}`;
}

export function MentorNotesList({ credits }: { credits?: { balanceMinor: number; testBalanceMinor: number; currency: string; entries: Array<{ id: string; date: string; amountMinor: number; livemode: boolean }> } }) {
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  const request = useAsync(() => apiCall<Page<NoteSummaryDto>>(`/api/notes?page=${page}`), [page, reloads]);
  const result = request.data;
  const loading = request.status === 'idle' || request.status === 'pending';
  const error = request.error?.message ?? (result && !result.ok ? result.error.message : null);

  const columns = useMemo<DataTableColumn<NoteSummaryDto>[]>(() => [
    { key: 'title', header: 'Title', cell: (note) => <Link className="text-link underline" href={noteHref(note.id)}>{note.title}</Link> },
    { key: 'status', header: 'Status', cell: (note) => {
      const status = noteStatusLabel(note.status);
      return <StatusBadgePrimitive tone={status.tone}>{status.text}</StatusBadgePrimitive>;
    } },
    { key: 'updated', header: 'Last updated', cell: (note) => new Date(note.updatedAt).toLocaleDateString() },
  ], []);

  return (
    <PageShell title="Your notes" headerAction={<Button asChild><Link href="/mentor/notes/new">New note</Link></Button>}>
      <p className="m-0 text-body text-muted-foreground">Only notes you publish after agreeing to the notice can be used for AI answers.</p>
      <DataTable
        columns={columns}
        rows={result?.ok ? result.data.items : undefined}
        getRowId={(note) => note.id}
        isLoading={loading}
        error={error}
        onRetry={() => setReloads((value) => value + 1)}
        emptyTitle="No notes yet"
        emptyDescription="Write down what you explain again and again. A note feeds AI answers only after you publish it."
        emptyAction={<Button asChild><Link href="/mentor/notes/new">Write your first note</Link></Button>}
        caption="Your mentor notes"
        pagination={result?.ok ? { page: result.data.page, pageCount: result.data.pageCount, onPageChange: setPage } : undefined}
      />
      {credits ? <CreditsPanel {...credits} /> : null}
    </PageShell>
  );
}

export function MentorNoteDetail({ noteId }: { noteId?: string }) {
  const router = useRouter();
  const [reloads, setReloads] = useState(0);
  const [savedNote, setSavedNote] = useState<NoteDto | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const termsRequest = useAsync(() => apiCall<{ id: string; sha256: string } | null>('/api/terms/current?kind=mentor'), []);
  const currentTerms = termsRequest.data?.ok ? termsRequest.data.data : null;
  const request = useAsync(
    () => noteId ? apiCall<NoteDto>(`/api/notes/${encodeURIComponent(noteId)}`) : Promise.resolve(null),
    [noteId, reloads],
  );
  const fetchedNote = request.data?.ok ? request.data.data : null;
  const note = savedNote ?? fetchedNote;
  const loading = Boolean(noteId) && (request.status === 'idle' || request.status === 'pending');
  const loadError = request.error?.message ?? (request.data && !request.data.ok ? request.data.error.message : null);

  function retryLoad() {
    setSavedNote(null);
    setReloads((value) => value + 1);
  }

  async function save(values: { title: string; body: string }): Promise<ApiResult<unknown>> {
    const response = await apiCall<NoteDto>(noteId ? `/api/notes/${encodeURIComponent(noteId)}` : '/api/notes', {
      method: noteId ? 'PUT' : 'POST',
      json: values,
    });
    if (response.ok) {
      setSavedNote(response.data);
      setSaved(true);
      setShowPreview(false);
      if (!noteId) router.replace(noteHref(response.data.id));
    }
    return response;
  }

  if (loading) return <PageShell title="Loading note" narrow><p aria-busy="true" className="m-0 text-body">Loading note…</p></PageShell>;
  if (loadError) return <PageShell title="Note unavailable" narrow><p role="alert" className="m-0 text-body">{loadError}</p><Button variant="secondary" onClick={retryLoad}>Try again</Button></PageShell>;

  const status = note?.status ?? 'new';
  const statusView = note ? noteStatusLabel(note.status) : null;
  const title = note?.title ?? 'New note';
  const body = note?.body ?? '';

  return (
    <PageShell title={title} narrow>
      {saved ? <p role="status" className="m-0 text-body">Draft saved.</p> : null}
      {statusView ? <p className="m-0 text-label text-muted-foreground">Status <StatusBadgePrimitive tone={statusView.tone}>{statusView.text}</StatusBadgePrimitive></p> : null}
      {status === 'published' ? (
        <>
          <p className="m-0 text-body">This note feeds AI answers. Seekers see your name and the note title, not the note itself.</p>
          <MarkdownView source={body} />
          <ActionButton
            label="Take down note"
            confirm={`Take down “${title}”? This prevents new answers from using the note.`}
            run={() => apiCall<NoteDto>(`/api/notes/${encodeURIComponent(note!.id)}/take-down`, { method: 'POST', json: {} })}
            onDone={() => { setSaved(false); retryLoad(); }}
          />
        </>
      ) : (
        <>
          <div role="tablist" aria-label="Note editor views" className="flex gap-group">
            <Button variant={showPreview ? 'secondary' : 'default'} role="tab" aria-selected={!showPreview} onClick={() => setShowPreview(false)}>Edit</Button>
            <Button variant={showPreview ? 'default' : 'secondary'} role="tab" aria-selected={showPreview} disabled={!note} onClick={() => setShowPreview(true)}>Preview saved note</Button>
          </div>
          {showPreview ? <MarkdownView source={body} /> : (
            <NoteEditor
              status={note?.status}
              initialValues={note ? { title: note.title, body: note.body } : undefined}
              schema={noteInputSchema}
              onSave={save}
              onSuccess={() => setSaved(true)}
              onCancel={note ? () => router.push('/mentor/notes') : undefined}
            />
          )}
          {status === 'new' ? <p className="m-0 text-body text-muted-foreground">Title up to {NOTE_TITLE_MAX} characters; note up to {NOTE_BODY_MAX}. Saving keeps it private as a draft.</p> : null}
          {status === 'draft' || status === 'taken_down' ? (
            <>
              <p className="m-0 text-label text-muted-foreground">{VAULT_NOTICE_DRAFT_LABEL}</p>
              {currentTerms ? <PublishNoticePanel
                noticeItems={[...VAULT_NOTICE_ITEMS]}
                noticeVersion={VAULT_NOTICE_VERSION}
                termsVersionId={currentTerms.id}
                termsSha256={currentTerms.sha256}
                blockedReason={note?.canPublish === false ? 'Publishing opens when the notice has been reviewed.' : undefined}
                onPublish={(input) => apiCall<NoteDto>(`/api/notes/${encodeURIComponent(note!.id)}/publish`, { method: 'POST', json: input })}
                onSuccess={(data) => {
                  const parsed = noteDtoSchema.safeParse(data);
                  if (parsed.success) {
                    setSavedNote(parsed.data);
                  } else {
                    retryLoad();
                  }
                }}
              /> : <p role="status" className="m-0 text-body text-muted-foreground">Publishing is unavailable until reviewed mentor terms are published.</p>}
            </>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
