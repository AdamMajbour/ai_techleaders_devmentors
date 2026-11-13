'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@devmentor/ui/backend';
import type { SessionNoteDto, UserDto } from '@devmentor/core';

export function SessionNotesView() {
  const [userId, setUserId] = useState('');
  const [notes, setNotes] = useState<SessionNoteDto[]>([]);
  const [bookingId, setBookingId] = useState('');
  const [bookings, setBookings] = useState<Array<{id:string; status:string}>>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('Loading notes…');

  async function refresh() {
    const me = await apiCall<UserDto>('/api/auth/me');
    if (me.ok) setUserId(me.data.id);
    const bookingResult = await apiCall<{items:Array<{id:string; status:string}>}>('/api/bookings?role=mentor&page=1');
    if (bookingResult.ok) setBookings(bookingResult.data.items);
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
    const result = await apiCall<SessionNoteDto>('/api/session-notes', { method: 'POST', json: { bookingId, title, content } });
    if (!result.ok) { setMessage(result.error.message); return; }
    setTitle(''); setContent(''); setBookingId(''); setMessage('Note saved privately.'); await refresh();
  }
  async function decide(id: string, approved: boolean) {
    const result = await apiCall<SessionNoteDto>(`/api/session-notes/${id}`, { method: 'POST', json: { approved } });
    setMessage(result.ok ? (approved ? 'Note approved.' : 'Approval withdrawn.') : result.error.message);
    if (result.ok) await refresh();
  }
  async function remove(id: string) {
    const result = await apiCall(`/api/session-notes/${id}`, { method: 'DELETE' });
    setMessage(result.ok ? 'Note deleted.' : result.error.message);
    if (result.ok) await refresh();
  }
  return <main className="mx-auto max-w-3xl space-y-6 p-6">
    <h1 className="text-2xl font-semibold">Session notes</h1>
    <p>Notes are private by default. Choose an accepted or completed booking. The seeker can approve or withdraw sharing.</p>
    <form className="space-y-3" onSubmit={create}>
      <label className="block">Booking<select className="block w-full rounded border p-2" required value={bookingId} onChange={(e) => setBookingId(e.target.value)}><option value="">Select a booking</option>{bookings.filter((b) => ["accepted", "completed"].includes(b.status)).map((b) => <option key={b.id} value={b.id}>{b.id} · {b.status}</option>)}</select></label>
      <label className="block">Title<input className="block w-full rounded border p-2" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block">Notes<textarea className="block w-full rounded border p-2" required maxLength={20000} value={content} onChange={(e) => setContent(e.target.value)} /></label>
      <button className="rounded border px-4 py-2" type="submit">Save private note</button>
    </form>
    <p role="status">{message}</p>
    <ul className="space-y-4">{notes.map((note) => <li className="rounded border p-4" key={note.id}>
      <h2 className="font-medium">{note.title}</h2><p className="whitespace-pre-wrap">{note.content}</p><p className="text-sm">Booking {note.bookingId}</p>{note.mentorId !== note.seekerId && note.seekerApprovedAt && <p>Approved for sharing</p>}
      {note.mentorId === userId && <button className="mt-2 rounded border px-3 py-1" onClick={() => void remove(note.id)} type="button">Delete</button>}
      {note.seekerId === userId && <button className="mt-2 rounded border px-3 py-1" onClick={() => void decide(note.id, !note.seekerApprovedAt)} type="button">{note.seekerApprovedAt ? 'Withdraw approval' : 'Approve note'}</button>}
    </li>)}</ul>
  </main>;
}
