'use client';

// Example compositions of the E03 screens (pilot terms and pilot counts), built only from the design system.
// Like the E01 and E02 views they document the state map of each screen and are not exported from the package.
import { ErrorMessage } from '../backend/feedback/ErrorMessage';
import { TextLink } from '../components/ui/text-link';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { PilotCountsTable, type PilotCountsTableProps } from '../components/pilot/PilotCountsTable';
import { NOTICE_DRAFT_LABEL, TERMS_SECTIONS } from '../../.storybook/blocks/sampleData';
import { Page } from '../backend/layout/Page';

export function TermsPageView() {
  return (
    <Page title="Pilot terms" narrow>
      <Alert>
        <AlertTitle>Working text</AlertTitle>
        <AlertDescription>{NOTICE_DRAFT_LABEL.replace('E03-T02', 'E03-T01, E03-T02')} It is not the final wording.</AlertDescription>
      </Alert>
      {TERMS_SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-group">
          <h2 className="m-0 text-section-title font-strong text-headline">{section.title}</h2>
          <p className="m-0 text-body text-foreground">{section.text}</p>
        </section>
      ))}
      <TextLink href="#back" className="w-fit">
        Back to the question
      </TextLink>
    </Page>
  );
}

export function PilotCountsPage({ page = 'ready', ...table }: Partial<PilotCountsTableProps> & { page?: 'ready' | 'notFound' }) {
  return (
    <Page title="Pilot counts">
      {page === 'notFound' ? (
        <div className="flex flex-col items-start gap-group">
          <ErrorMessage message="This page does not exist or you do not have access to it." />
          <TextLink href="#home">Back to the start</TextLink>
        </div>
      ) : (
        <>
          <Alert>
            <AlertTitle>Example numbers</AlertTitle>
            <AlertDescription>The numbers on this page are examples for the documentation. They are not pilot results.</AlertDescription>
          </Alert>
          <PilotCountsTable rows={[]} {...table} />
        </>
      )}
    </Page>
  );
}
