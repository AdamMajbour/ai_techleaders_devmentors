'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@devmentor/ui/backend';
import type { SessionNoteDto } from '@devmentor/core';

export function SessionNotesView() {
  const [notes, setNotes] = useState<SessionNoteDto[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('Loading notes…');

  async function refresh() {
    const result = await apiCall<SessionNoteDto[]>('/api/session-notes');
    if (result.ok) { setNotes(result.data); setMessage(result.data.length ? '' : 'No session notes yet.'); }
    else setMessage(result.error.message);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await apiCall<SessionNoteDto>('/api/session-notes', { method: 'POST', json: { sessionId, title, content } });
    if (!result.ok) { setMessage(result.error.message); return; }
    setTitle(''); setContent(''); setSessionId(''); setMessage('Note saved privately.'); await refresh();
  }
  async function remove(id: string) {
    const result = await apiCall(`/api/session-notes/${id}`, { method: 'DELETE' });
    setMessage(result.ok ? 'Note deleted.' : result.error.message);
    if (result.ok) await refresh();
  }
  return <main className="mx-auto max-w-3xl space-y-6 p-6">
    <h1 className="text-2xl font-semibold">Session notes</h1>
    <p>Notes are private by default. This page currently shows only notes you authored. Seeker access requires the session booking flow.</p>
    <form className="space-y-3" onSubmit={create}>
      <label className="block">Session ID<input className="block w-full rounded border p-2" required type="text" value={sessionId} onChange={(e) => setSessionId(e.target.value)} /></label>
      <label className="block">Title<input className="block w-full rounded border p-2" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block">Notes<textarea className="block w-full rounded border p-2" required maxLength={20000} value={content} onChange={(e) => setContent(e.target.value)} /></label>
      <button className="rounded border px-4 py-2" type="submit">Save private note</button>
    </form>
    <p role="status">{message}</p>
    <ul className="space-y-4">{notes.map((note) => <li className="rounded border p-4" key={note.id}>
      <h2 className="font-medium">{note.title}</h2><p className="whitespace-pre-wrap">{note.content}</p><p className="text-sm">Session {note.sessionId}</p>
      <button className="mt-2 rounded border px-3 py-1" onClick={() => void remove(note.id)} type="button">Delete</button>
    </li>)}</ul>
  </main>;
}
