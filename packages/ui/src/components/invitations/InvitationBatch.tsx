import { formatInstant } from '../../time';

export type InvitationStatus =
  | 'Revoked'
  | 'Waiting for acceptance'
  | 'Expired, not accepted'
  | 'Published a slot'
  | 'Accepted, no slot yet'
  | 'No slot within two weeks';

export interface InvitationBatchRow {
  id: string;
  email: string;
  displayName: string | null;
  stackTags: string[];
  status: InvitationStatus;
  acceptedAt: string | null;
  publishDueAt: string | null;
}

export interface InvitationBatchSection {
  title: string;
  state?: 'Open' | 'Full' | 'Stopped';
  sent?: number;
  accepted?: number;
  published?: number;
  invitations: InvitationBatchRow[];
}

function mentorName(row: InvitationBatchRow): string {
  return row.acceptedAt ? row.displayName?.trim() || 'Name not provided' : row.email;
}

function stackTags(row: InvitationBatchRow): string {
  return row.stackTags.length ? row.stackTags.join(', ') : 'No stack tags recorded';
}

function publishBy(row: InvitationBatchRow): string {
  return row.acceptedAt ? formatInstant(row.publishDueAt) : 'Not accepted';
}

export function InvitationBatch({ section }: { section: InvitationBatchSection }) {
  const showSummary = section.state !== undefined;
  return (
    <section aria-labelledby={`${section.title.replaceAll(' ', '-').toLowerCase()}-heading`} className="flex min-w-0 flex-col gap-group border-t border-border py-panel-compact">
      <header className="flex min-w-0 flex-col gap-group">
        <div className="flex flex-wrap items-baseline justify-between gap-group">
          <h2 id={`${section.title.replaceAll(' ', '-').toLowerCase()}-heading`} className="m-0 text-section-title font-strong text-headline">{section.title}</h2>
          {section.state ? <span className="text-label font-strong text-muted-foreground">{section.state}</span> : null}
        </div>
        {showSummary ? (
          <p className="m-0 text-body text-muted-foreground">
            {section.sent ?? 0} of 20 sent, {section.accepted ?? 0} accepted, {section.published ?? 0} published within two weeks
          </p>
        ) : null}
      </header>

      {section.invitations.length === 0 ? (
        <p className="m-0 text-body text-muted-foreground">No invitations in this section.</p>
      ) : (
        <>
          <div className="hidden min-w-0 sm:block">
            <table aria-label={`${section.title} invitations`} className="w-full table-fixed border-collapse text-left text-body">
              <thead>
                <tr className="border-b border-border text-label font-strong text-headline">
                  <th scope="col" className="w-[30%] px-panel-compact py-group">Mentor</th>
                  <th scope="col" className="w-[22%] px-panel-compact py-group">Stack tags</th>
                  <th scope="col" className="w-[27%] px-panel-compact py-group">Status</th>
                  <th scope="col" className="w-[21%] px-panel-compact py-group">Publish by</th>
                </tr>
              </thead>
              <tbody>
                {section.invitations.map((row) => (
                  <tr key={row.id} className="border-b border-border align-top">
                    <td className="break-words px-panel-compact py-panel-compact text-foreground">
                      {row.acceptedAt ? <><span className="block">{mentorName(row)}</span><span className="block break-all text-meta text-muted-foreground">{row.email}</span></> : row.email}
                    </td>
                    <td className="break-words px-panel-compact py-panel-compact text-foreground">{stackTags(row)}</td>
                    <td className="break-words px-panel-compact py-panel-compact text-foreground">{row.status}</td>
                    <td className="break-words px-panel-compact py-panel-compact text-foreground">{publishBy(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex min-w-0 flex-col sm:hidden">
            {section.invitations.map((row) => (
              <article key={row.id} className="min-w-0 border-t border-border py-panel-compact">
                <h3 className="m-0 break-all text-label font-strong text-headline">{mentorName(row)}</h3>
                {row.acceptedAt ? <p className="m-0 break-all text-meta text-muted-foreground">{row.email}</p> : null}
                <dl className="m-0 grid min-w-0 grid-cols-[minmax(6rem,auto)_minmax(0,1fr)] gap-x-group gap-y-control py-group text-body">
                  <dt className="text-muted-foreground">Stack tags</dt><dd className="m-0 break-words text-foreground">{stackTags(row)}</dd>
                  <dt className="text-muted-foreground">Status</dt><dd className="m-0 break-words text-foreground">{row.status}</dd>
                  <dt className="text-muted-foreground">Publish by</dt><dd className="m-0 break-words text-foreground">{publishBy(row)}</dd>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
