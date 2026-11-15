import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MentorProfileDto } from '@devmentor/core';
import * as ui from '@devmentor/ui';
import type { ApiResult } from '@devmentor/ui';
import { MentorProfileEditor } from './mentor-profile-editor';

jest.mock('@devmentor/ui', () => {
  const actual = jest.requireActual<typeof import('@devmentor/ui')>('@devmentor/ui');
  return { ...actual, apiCall: jest.fn() };
});

const apiCall = ui.apiCall as jest.MockedFunction<typeof ui.apiCall>;

const profile: MentorProfileDto = {
  id: '0c0b2f5a-6f6e-4b53-9f0e-6b1f3b0a7a11',
  slug: 'ada-lovelace',
  headline: 'Built reliable backend systems',
  bio: 'A practical mentor.',
  technologies: 'node-js typescript',
  publicWorkUrl: 'https://example.com/work',
  githubUrl: null,
  isListed: true,
  activity: 'today',
};

function success<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

beforeEach(() => {
  apiCall.mockReset();
});

describe('MentorProfileEditor', () => {
  it('creates a profile when an accepted mentor has not made one yet', async () => {
    const created: MentorProfileDto = {
      ...profile,
      slug: 'grace-hopper',
      headline: 'Debugged systems',
      bio: 'I help with practical issues.',
      technologies: 'typescript',
      publicWorkUrl: 'https://example.com/grace',
      githubUrl: null,
      isListed: false,
    };
    apiCall
      .mockResolvedValueOnce(success(null))
      .mockResolvedValueOnce(success(created))
      .mockResolvedValueOnce(success(created));
    render(<MentorProfileEditor />);

    await userEvent.type(await screen.findByLabelText('Profile link (required)'), 'grace-hopper');
    await userEvent.type(screen.getByLabelText('Headline (required)'), 'Debugged systems');
    await userEvent.type(screen.getByLabelText('Bio (required)'), 'I help with practical issues.');
    await userEvent.click(screen.getByRole('checkbox', { name: 'TypeScript' }));
    await userEvent.type(screen.getByLabelText('Public work URL (required)'), 'https://example.com/grace');
    await userEvent.click(screen.getByRole('button', { name: 'Create profile' }));

    await waitFor(() => {
      expect(apiCall).toHaveBeenCalledWith(
        '/api/mentors',
        expect.objectContaining({
          method: 'POST',
          json: {
            slug: 'grace-hopper',
            headline: 'Debugged systems',
            bio: 'I help with practical issues.',
            technologies: 'typescript',
            publicWorkUrl: 'https://example.com/grace',
            githubUrl: null,
            isListed: false,
          },
        }),
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Profile saved.');
  }, 15000);

  it('updates the signed-in mentor profile through the owner-checked API route', async () => {
    const updated = { ...profile, headline: 'Updated backend mentor' };
    apiCall
      .mockResolvedValueOnce(success(profile))
      .mockResolvedValueOnce(success(updated))
      .mockResolvedValue(success(updated));
    render(<MentorProfileEditor />);

    const headline = await screen.findByLabelText('Headline (required)');
    await userEvent.clear(headline);
    await userEvent.type(headline, 'Updated backend mentor');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(apiCall).toHaveBeenCalledWith(
        `/api/mentors/${profile.id}`,
        expect.objectContaining({
          method: 'PUT',
          json: {
            slug: profile.slug,
            headline: 'Updated backend mentor',
            bio: profile.bio,
            technologies: profile.technologies,
            publicWorkUrl: profile.publicWorkUrl,
            githubUrl: profile.githubUrl,
            isListed: true,
          },
        }),
      );
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Profile saved.');
    expect(apiCall).toHaveBeenCalledWith('/api/mentors/me');
  }, 15000);
});
