'use client';

import { useId, useState } from 'react';
import { EmptyState, ErrorMessage, LoadingMessage } from '../../backend/feedback';
import { FilterBar } from '../../backend/filters';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { TextLink } from '../ui/text-link';

export interface FavoriteMentor {
  id: string;
  name: string;
  headline: string;
  technologies: string[];
  href: string;
}

export interface FavoriteMentorsProps {
  /** Current page only; the caller owns pagination and passes at most 25 mentors. */
  mentors: FavoriteMentor[];
  technologies: string[];
  /** Destination is supplied by the containing app; stories may use a placeholder. */
  findMentorsHref: string;
  initialTechnology?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRemove: (mentorId: string) => void;
}

export function FavoriteMentors({
  mentors,
  technologies,
  findMentorsHref,
  initialTechnology = '',
  isLoading = false,
  error,
  onRetry,
  onRemove,
}: FavoriteMentorsProps) {
  const headingId = useId();
  const [technology, setTechnology] = useState(initialTechnology);
  const options = [...new Set(technologies)]
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({ value: name, label: name }));
  const filteredMentors = technology
    ? mentors.filter((mentor) => mentor.technologies.includes(technology))
    : mentors;

  return (
    <section aria-labelledby={headingId} className="mx-auto flex w-full max-w-content flex-col gap-between-groups">
      <h1 id={headingId} className="m-0 text-page-title font-strong text-headline">
        Favorite mentors
      </h1>

      {error !== undefined && error !== null ? (
        <ErrorMessage message={error} onRetry={onRetry} />
      ) : isLoading ? (
        <div aria-busy="true" className="flex flex-col">
          <LoadingMessage message="Loading favorite mentors…" />
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-group border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-group">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <EmptyState
          title="No favorite mentors yet"
          description="Browse mentors and save the ones you want to find again."
          action={
            <Button asChild>
              <a href={findMentorsHref}>Find mentors</a>
            </Button>
          }
        />
      ) : (
        <>
          <FilterBar
            label="Technology"
            allLabel="All technologies"
            options={options}
            value={technology}
            onChange={setTechnology}
            count={filteredMentors.length}
            noun={{ one: 'mentor', many: 'mentors' }}
            phrase={(name) => `for ${name}`}
          />

          {filteredMentors.length === 0 ? (
            <EmptyState
              title={`No favorite mentors match ${technology}`}
              description="Choose another technology or clear the filter."
              action={
                <Button variant="outline" size="sm" onClick={() => setTechnology('')}>
                  Clear filter
                </Button>
              }
            />
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {filteredMentors.map((mentor) => (
                <li
                  key={mentor.id}
                  className="flex flex-col gap-between-groups border-b border-border py-panel-compact last:border-b-0 md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-group break-words">
                    <h2 className="m-0 text-body font-strong text-headline">{mentor.name}</h2>
                    <p className="m-0 text-body text-foreground">{mentor.headline}</p>
                    <p className="m-0 text-label text-muted-foreground">{mentor.technologies.join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-group">
                    <TextLink href={mentor.href}>View profile</TextLink>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove from favorites: ${mentor.name}`}
                      onClick={() => onRemove(mentor.id)}
                    >
                      Remove from favorites
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
