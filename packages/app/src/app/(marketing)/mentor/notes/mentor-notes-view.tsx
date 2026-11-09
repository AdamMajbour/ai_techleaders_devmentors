'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  type ApiResult,
  type DataTableColumn,
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

export function MentorNotesList() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ApiResult<Page<NoteSummaryDto>> | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await apiCall<Page<NoteSummaryDto>>(`/api/notes?page=${page}`);
    setResult(response);
    setLoading(false);
  }, [page]);

  useEffect(() => { void load(); }, [load]);

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
        error={result && !result.ok ? result.error.message : null}
        onRetry={() => void load()}
        emptyTitle="No notes yet"
        emptyDescription="Write down what you explain again and again. A note feeds AI answers only after you publish it."
        emptyAction={<Button asChild><Link href="/mentor/notes/new">Write your first note</Link></Button>}
        caption="Your mentor notes"
        pagination={result?.ok ? { page: result.data.page, pageCount: result.data.pageCount, onPageChange: setPage } : undefined}
      />
    </PageShell>
  );
}

export function MentorNoteDetail({ noteId }: { noteId?: string }) {
  const router = useRouter();
  const [note, setNote] = useState<NoteDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(noteId));
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    const response = await apiCall<NoteDto>(`/api/notes/${encodeURIComponent(noteId)}`);
    if (response.ok) {
      setNote(response.data);
      setLoadError(null);
    } else {
      setLoadError(response.error.message);
    }
    setLoading(false);
  }, [noteId]);

  useEffect(() => { void load(); }, [load]);

  async function save(values: { title: string; body: string }): Promise<ApiResult<unknown>> {
    const response = await apiCall<NoteDto>(noteId ? `/api/notes/${encodeURIComponent(noteId)}` : '/api/notes', {
      method: noteId ? 'PUT' : 'POST',
      json: values,
    });
    if (response.ok) {
      setNote(response.data);
      setSaved(true);
      setShowPreview(false);
      if (!noteId) router.replace(noteHref(response.data.id));
    }
    return response;
  }

  if (loading) return <PageShell title="Loading note" narrow><p aria-busy="true" className="m-0 text-body">Loading note…</p></PageShell>;
  if (loadError) return <PageShell title="Note unavailable" narrow><p role="alert" className="m-0 text-body">{loadError}</p><Button variant="secondary" onClick={() => void load()}>Try again</Button></PageShell>;

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
            onDone={() => { setSaved(false); void load(); }}
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
              <PublishNoticePanel
                noticeItems={[...VAULT_NOTICE_ITEMS]}
                noticeVersion={VAULT_NOTICE_VERSION}
                blockedReason={process.env.NODE_ENV === 'production' ? 'Publishing opens when the notice has been reviewed.' : undefined}
                onPublish={(input) => apiCall<NoteDto>(`/api/notes/${encodeURIComponent(note!.id)}/publish`, { method: 'POST', json: input })}
                onSuccess={(data) => {
                  const parsed = noteDtoSchema.safeParse(data);
                  if (parsed.success) {
                    setNote(parsed.data);
                  } else {
                    void load();
                  }
                }}
              />
            </>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
