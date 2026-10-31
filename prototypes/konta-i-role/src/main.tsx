import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingMessage,
  Page,
  StatusBadge,
  TextLink,
} from '@devmentor/ui';
import './styles.css';
import './review-bridge.css';

type ScreenProps = {
  id: string;
  title: string;
  children: ReactNode;
};

const DEMO_EMAIL = 'maja.mentee@demo.test';

type SignInVariant = 'A' | 'B' | 'C';

function goTo(screenId: string) {
  document.dispatchEvent(new CustomEvent('prototype:navigate', { detail: screenId }));
}

function Screen({ id, title, children }: ScreenProps) {
  return (
    <section className="screen" id={id} aria-label={`${id}: ${title}`}>
      <div className="frame">{children}</div>
      <div className="screen-meta">
        <p className="m-0 text-meta text-muted-foreground">{id}</p>
        <h2 className="m-0 text-section-title font-strong text-headline">{title}</h2>
      </div>
    </section>
  );
}

function SignInIntro() {
  return (
    <p className="m-0 text-body text-foreground">
      We send a one-time sign-in link to invited pilot participants. There is no password.
    </p>
  );
}

function SignInDemoNotice() {
  return (
    <Alert>
      <AlertDescription>
        Prototype only. This fictional demo account is pre-filled; no email is sent and no account is created.
      </AlertDescription>
    </Alert>
  );
}

function SignInForm({ onSubmit, horizontal = false }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; horizontal?: boolean }) {
  return (
    <form
      className={horizontal ? 'grid items-end gap-between-groups sm:grid-cols-[minmax(0,1fr)_auto]' : 'flex flex-col gap-between-groups'}
      onSubmit={onSubmit}
    >
      <Field label="Email" hint="Maja Demo · seeker" requirement="required">
        <Input type="email" autoComplete="off" required value={DEMO_EMAIL} readOnly />
      </Field>
      <Button type="submit" className={horizontal ? 'w-full sm:w-auto' : undefined}>Send sign-in link</Button>
    </form>
  );
}

function SignInSentMessage({ onOpenLink }: { onOpenLink: () => void }) {
  return (
    <div className="flex flex-col items-start gap-between-groups">
      <Alert>
        <AlertDescription>
          Simulated response: if this account were invited, a sign-in link would be sent. Nothing was sent.
        </AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={onOpenLink}>
        Open simulated sign-in link
      </Button>
    </div>
  );
}

function SignInScreen({ variant }: { variant: SignInVariant }) {
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  const sentMessage = sent ? <SignInSentMessage onOpenLink={() => goTo('s04')} /> : null;

  if (variant === 'B') {
    return (
      <Page title="Sign in">
        <div className="grid gap-section lg:grid-cols-2 lg:items-start">
          <div className="flex max-w-session flex-col gap-between-groups">
            <SignInIntro />
          </div>
          <Card className="flex flex-col gap-between-groups p-panel-roomy">
            <SignInDemoNotice />
            <SignInForm onSubmit={submit} />
            {sentMessage}
          </Card>
        </div>
      </Page>
    );
  }

  if (variant === 'C') {
    return (
      <Page title="Sign in">
        <Card className="flex flex-col gap-between-groups p-panel-roomy">
          <div className="grid gap-between-groups sm:grid-cols-2">
            <SignInIntro />
            <SignInDemoNotice />
          </div>
          <SignInForm onSubmit={submit} horizontal />
          {sentMessage}
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Sign in" narrow>
      <Card className="flex flex-col gap-between-groups p-panel-roomy">
        <SignInIntro />
        <SignInDemoNotice />
        <SignInForm onSubmit={submit} />
        {sentMessage}
      </Card>
    </Page>
  );
}

function VerifyScreen({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => goTo('s05'), 600);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <Page title="Signing you in" narrow>
      <LoadingMessage message="Checking the simulated sign-in link…" />
      <Alert>
        <AlertDescription>
          This is a simulated valid link. No email or token is used.
        </AlertDescription>
      </Alert>
    </Page>
  );
}

function MentorsScreen() {
  return (
    <Page title="Mentors">
      <p className="m-0 text-body text-muted-foreground">
        This is the invited-participant list. It is not connected to a live service.
      </p>
      <EmptyState
        title="No sample mentor records in this stage"
        description="This is not a statement about pilot availability. The prototype has no source-backed mentor profile to show here yet."
      />
    </Page>
  );
}

function MentorBookingsScreen() {
  return (
    <Page title="Your bookings">
      <Card className="flex flex-col gap-group p-panel-roomy">
        <h2 className="m-0 text-section-title font-strong text-headline">Mentor home</h2>
        <p className="m-0 text-body text-muted-foreground">
          The page destination is shown here. No sample booking records or live data are loaded in Stage 1.
        </p>
      </Card>
    </Page>
  );
}

function OperatorApprovalsScreen() {
  return (
    <Page title="Approvals">
      <Card className="flex flex-col gap-group p-panel-roomy">
        <h2 className="m-0 text-section-title font-strong text-headline">Operator home</h2>
        <p className="m-0 text-body text-muted-foreground">
          The page destination is shown here. No sample approval records or live data are loaded in Stage 1.
        </p>
      </Card>
    </Page>
  );
}

function AccessDeniedScreen() {
  return (
    <Page title="Access restricted" narrow>
      <Alert variant="destructive">
        <AlertDescription>
          This page needs a different account. No protected resource or account details are shown in this prototype.
        </AlertDescription>
      </Alert>
      <TextLink href="#s01" className="w-fit">
        Go to sign in
      </TextLink>
    </Page>
  );
}

function App() {
  const [lightTheme, setLightTheme] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('s01');
  const [signInVariant, setSignInVariant] = useState<SignInVariant>('A');

  useEffect(() => {
    document.documentElement.dataset.theme = lightTheme ? 'light' : 'dark';
  }, [lightTheme]);

  useEffect(() => {
    function handleScreenChange(event: Event) {
      const screenId = (event as CustomEvent<unknown>).detail;
      if (typeof screenId === 'string') setCurrentScreen(screenId);
    }

    document.addEventListener('prototype:screen-change', handleScreenChange);
    return () => document.removeEventListener('prototype:screen-change', handleScreenChange);
  }, []);

  useEffect(() => {
    window.__PROTOTYPE_START__?.();
  }, []);

  return (
    <div className="doc mx-auto w-full max-w-content">
      <header className="doc-head flex flex-wrap items-center justify-between gap-between-groups px-panel-compact py-panel-compact">
        <div className="flex items-center gap-group">
          <p className="m-0 text-label font-strong text-headline">DevMentor</p>
        </div>
        <p className="m-0 text-meta text-muted-foreground">Accounts and roles · E01</p>
      </header>
      <div className="doc-toolbar sticky top-0 z-(--z-index-sticky) flex flex-wrap items-center gap-group border-b border-border bg-background px-panel-compact py-panel-compact">
        <StatusBadge tone="neutral">Prototype</StatusBadge>
        <nav className="screen-nav flex flex-wrap items-center gap-group" aria-label="Choose screen">
          <TextLink href="#s01">s01 Sign in</TextLink>
          <TextLink href="#s04">s04 Verify link</TextLink>
          <TextLink href="#s05">s05 Seeker home</TextLink>
          <TextLink href="#s06">s06 Mentor home</TextLink>
          <TextLink href="#s07">s07 Operator home</TextLink>
          <TextLink href="#s08">s08 Access denied</TextLink>
        </nav>
        <div className="flex items-center gap-group" role="group" aria-label="Sign-in layout version">
          <span className="text-meta text-muted-foreground">Layout</span>
          {(['A', 'B', 'C'] as const).map((variant) => (
            <Button
              key={variant}
              type="button"
              variant={signInVariant === variant ? 'default' : 'outline'}
              size="sm"
              aria-label={`Sign-in layout ${variant}`}
              aria-pressed={signInVariant === variant}
              onClick={() => setSignInVariant(variant)}
            >
              {variant}
            </Button>
          ))}
        </div>
        <Button
          id="theme-toggle"
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={lightTheme}
          onClick={() => setLightTheme((current) => !current)}
        >
          {lightTheme ? 'Switch to dark theme' : 'Switch to light theme'}
        </Button>
      </div>
      <div className="flex flex-col gap-section px-panel-compact py-section">
        <Screen id="s01" title="Entry / sign in with an email link">
          <SignInScreen variant={signInVariant} />
        </Screen>
        <Screen id="s04" title="Verify magic link">
          <VerifyScreen active={currentScreen === 's04'} />
        </Screen>
        <Screen id="s05" title="Mentor list — seeker home">
          <MentorsScreen />
        </Screen>
        <Screen id="s06" title="Mentor bookings — mentor home">
          <MentorBookingsScreen />
        </Screen>
        <Screen id="s07" title="Approvals — operator home">
          <OperatorApprovalsScreen />
        </Screen>
        <Screen id="s08" title="Access denied">
          <AccessDeniedScreen />
        </Screen>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __PROTOTYPE_START__?: () => boolean;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Prototype root element was not found.');

createRoot(root).render(<App />);
