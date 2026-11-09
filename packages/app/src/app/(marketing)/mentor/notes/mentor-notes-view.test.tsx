import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { NoteDto } from '@devmentor/core';
import * as ui from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';
import { MentorNoteDetail } from './mentor-notes-view';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;
const note: NoteDto = {
  id: '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  title: 'Safe Kubernetes upgrades',
  body: 'Read the events first.',
  status: 'draft',
  canPublish: true,
  aiNoticeVersion: null,
  aiConsentedAt: null,
  publishedAt: null,
  takenDownAt: null,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => {
  apiCall.mockReset();
  apiCall.mockResolvedValue(success(note));
});

describe('MentorNoteDetail', () => {
  it('shows the saved draft and the AI-use notice before the consent control', async () => {
    render(<MentorNoteDetail noteId={note.id} />);

    expect(await screen.findByRole('heading', { name: 'Before you publish this note' })).toBeVisible();
    expect(screen.getByText(/sent to an AI provider every time a seeker asks a question/)).toBeVisible();
    expect(screen.getByLabelText(/I have read this and I agree/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Publish note' })).toHaveAccessibleDescription('Tick the box to publish');
  });
});
