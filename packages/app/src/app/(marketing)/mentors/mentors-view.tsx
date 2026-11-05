'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MentorProfileDto, Page } from '@devmentor/core';
import {
  apiCall,
  Button,
  DataTable,
  Field,
  Select,
  TextLink,
  useAsync,
  type DataTableColumn,
} from '@devmentor/ui';

const ACTIVITY_LABELS: Record<MentorProfileDto['activity'], string> = {
  within_hour: 'Active within the last hour',
  today: 'Active today',
  earlier: 'Active earlier',
  never: 'No activity recorded',
};

function labelTechnology(value: string): string {
  return value.replaceAll('-', ' ');
}

export function MentorsView() {
  const [technology, setTechnology] = useState('');
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  const reload = () => setReloads((count) => count + 1);
  const list = useAsync(
    async () => {
      const query = new URLSearchParams({ page: String(page) });
      if (technology) query.set('technology', technology);
      const response = await apiCall<Page<MentorProfileDto>>(`/api/mentors?${query.toString()}`);
      if (response.ok && !technology) {
        const choices = response.data.items.flatMap((mentor) =>
          mentor.technologies.split(/\s+/).filter(Boolean),
        );
        setTechnologies((current) => [...new Set([...current, ...choices])].sort());
      }
      return response;
    },
    [page, technology, reloads],
  );

  const result = list.data;
  const mentors = result?.ok ? result.data : undefined;
  const error = result && !result.ok ? result.error.message : list.error?.message ?? null;

  const columns: DataTableColumn<MentorProfileDto>[] = [
    {
      key: 'mentor',
      header: 'Mentor',
      cell: (mentor) => (
        <div className="flex flex-col gap-group">
          <TextLink asChild>
            <Link href={`/m/${encodeURIComponent(mentor.slug)}?source=list`}>{mentor.slug}</Link>
          </TextLink>
          <span className="text-muted-foreground">{mentor.headline}</span>
        </div>
      ),
    },
    {
      key: 'technologies',
      header: 'Technologies',
      cell: (mentor) => mentor.technologies.split(/\s+/).filter(Boolean).map(labelTechnology).join(', '),
    },
    {
      key: 'activity',
      header: 'Activity',
      cell: (mentor) => (
        <div className="flex flex-col gap-group">
          <span>{ACTIVITY_LABELS[mentor.activity]}</span>
          <span className="text-meta text-muted-foreground">Not a promise of reply time.</span>
        </div>
      ),
    },
  ];

  return (
    <main className="mx-auto flex max-w-content flex-col gap-between-groups p-panel-compact">
      <header className="flex flex-wrap items-start justify-between gap-group">
        <div className="flex flex-col gap-group">
          <h1 className="m-0 text-page-title font-strong text-headline">Mentors</h1>
          <p className="m-0 text-body text-muted-foreground">Browse mentors invited to the pilot.</p>
        </div>
        <TextLink asChild>
          <Link href="/mentor/profile">Edit mentor profile</Link>
        </TextLink>
      </header>

      <Field label="Technology">
        <Select
          aria-label="Technology"
          value={technology}
          onChange={(event) => {
            setTechnology(event.currentTarget.value);
            setPage(1);
          }}
        >
          <option value="">All technologies</option>
          {technologies.map((choice) => (
            <option key={choice} value={choice}>
              {labelTechnology(choice)}
            </option>
          ))}
        </Select>
      </Field>

      <DataTable
        caption="Mentor profiles"
        columns={columns}
        rows={mentors?.items}
        getRowId={(mentor) => mentor.id}
        isLoading={list.status === 'idle' || list.status === 'pending'}
        error={error}
        onRetry={reload}
        emptyTitle={technology ? 'No mentors match this technology' : 'No listed mentors yet'}
        emptyDescription={
          technology
            ? 'Choose another technology to see more mentors.'
            : 'There are no listed mentor profiles to show yet.'
        }
        emptyAction={
          technology ? (
            <Button variant="outline" onClick={() => setTechnology('')}>
              Clear technology filter
            </Button>
          ) : undefined
        }
        pagination={
          mentors
            ? { page: mentors.page, pageCount: mentors.pageCount, onPageChange: setPage }
            : undefined
        }
      />
    </main>
  );
}
