import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Field,
  Input,
  LoadingMessage,
  Page,
  Select,
  Skeleton,
  StatusBadge,
  TextLink,
} from '@devmentor/ui';

type ScreenProps = {
  id: string;
  title: string;
  stories: string;
  simulation: string;
  undecided: string;
  children: ReactNode;
};

type DemoAccountId = 'maja' | 'ada' | 'ola' | 'alex';
type Role = 'seeker' | 'mentor' | 'operator';
type SessionMode = 'signed-out' | 'active' | 'expired';
type EmailScenario = 'invited' | 'not-invited' | 'rate-limit' | 'send-error';
type EmailValidity = 'valid' | 'invalid';
type LinkOutcome = 'valid' | 'expired' | 'used' | 'server-error';
type PageState = 'ready' | 'loading' | 'empty' | 'error';
type EmailRequestState = 'idle' | 'sending' | 'sent' | 'rate-limit' | 'send-error';
type VerificationState = 'idle' | 'checking' | 'expired' | 'used' | 'server-error';
type SignInVariant = 'A' | 'B' | 'C';

const DEMO_ACCOUNTS: Record<DemoAccountId, { name: string; email: string; roles: Role[] }> = {
  maja: { name: 'Maja Demo', email: 'maja.mentee@demo.test', roles: ['seeker'] },
  ada: { name: 'Ada Kowalska', email: 'ada.mentor@demo.test', roles: ['mentor'] },
  ola: { name: 'Ola Operator', email: 'ola.operator@demo.test', roles: ['operator'] },
  alex: { name: 'Alex Demo', email: 'alex.dual@demo.test', roles: ['seeker', 'mentor'] },
};

const HOME_SCREEN: Record<Role, string> = {
  seeker: 's05',
  mentor: 's06',
  operator: 's07',
};

const REQUIRED_ROLE: Record<string, Role> = {
  s05: 'seeker',
  s06: 'mentor',
  s07: 'operator',
};

const SAFE_RETURN_SCREENS = new Set(Object.keys(REQUIRED_ROLE));

function goTo(screenId: string) {
  document.dispatchEvent(new CustomEvent('prototype:navigate', { detail: screenId }));
}

function Screen({ id, title, stories, simulation, undecided, children }: ScreenProps) {
  return (
    <section className="screen" id={id} aria-label={`${id}: ${title}`}>
      <div className="frame">{children}</div>
      <div className="screen-meta grid gap-group">
        <p className="m-0 text-meta text-muted-foreground">{id}</p>
        <h2 className="m-0 text-section-title font-strong text-headline">{title}</h2>
        <div className="grid gap-group text-meta text-muted-foreground" aria-label={`${id} prototype notes`}>
          <p className="m-0"><span className="font-strong text-foreground">Stories:</span> {stories}</p>
          <p className="m-0"><span className="font-strong text-foreground">Simulation:</span> {simulation}</p>
          <p className="m-0"><span className="font-strong text-foreground">Not decided:</span> {undecided}</p>
        </div>
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
        Prototype only. The selected fictional demo account is shown here. No email is sent and no account is created.
      </AlertDescription>
    </Alert>
  );
}

function SignInForm({
  account,
  validity,
  attempted,
  onSubmit,
  horizontal = false,
}: {
  account: (typeof DEMO_ACCOUNTS)[DemoAccountId];
  validity: EmailValidity;
  attempted: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  horizontal?: boolean;
}) {
  const invalid = validity === 'invalid' && attempted;
  return (
    <form
      className={horizontal ? 'grid items-end gap-between-groups sm:grid-cols-[minmax(0,1fr)_auto]' : 'flex flex-col gap-between-groups'}
      onSubmit={onSubmit}
    >
      <Field
        label="Email"
        hint={`${account.name} · ${account.roles.join(' + ')}`}
        requirement="required"
        error={invalid ? 'Enter a valid email address. This is a fixed example for the prototype.' : undefined}
      >
        <Input
          type={validity === 'invalid' ? 'text' : 'email'}
          autoComplete="off"
          required
          value={validity === 'invalid' ? 'not-an-email' : account.email}
          readOnly
        />
      </Field>
      <Button type="submit" className={horizontal ? 'w-full sm:w-auto' : undefined}>
        Send sign-in link
      </Button>
    </form>
  );
}

function SignInSentMessage({ onOpenLink }: { onOpenLink: () => void }) {
  return (
    <div className="flex flex-col items-start gap-between-groups">
      <Alert>
        <AlertDescription>
          If this address is invited, we sent a sign-in link. In this prototype, no email was sent.
        </AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={onOpenLink}>
        Open simulated sign-in link
      </Button>
    </div>
  );
}

function SignInScreen({
  variant,
  account,
  validity,
  attempted,
  requestState,
  accessMessage,
  onSubmit,
  onRetry,
  onOpenLink,
}: {
  variant: SignInVariant;
  account: (typeof DEMO_ACCOUNTS)[DemoAccountId];
  validity: EmailValidity;
  attempted: boolean;
  requestState: EmailRequestState;
  accessMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  onOpenLink: () => void;
}) {
  const form = (
    <SignInForm account={account} validity={validity} attempted={attempted} onSubmit={onSubmit} horizontal={variant === 'C'} />
  );
  const outcome = requestState === 'sent' ? (
    <SignInSentMessage onOpenLink={onOpenLink} />
  ) : requestState === 'rate-limit' ? (
    <div className="flex flex-col items-start gap-between-groups">
      <Alert variant="destructive">
        <AlertDescription>Too many requests. Wait a few minutes and try again.</AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  ) : requestState === 'send-error' ? (
    <div className="flex flex-col items-start gap-between-groups">
      <Alert variant="destructive">
        <AlertDescription>The link could not be sent. Check your connection and try again.</AlertDescription>
      </Alert>
      <Button type="button" variant="outline" onClick={onRetry}>Try again</Button>
    </div>
  ) : requestState === 'sending' ? (
    <LoadingMessage message="Sending the simulated sign-in link…" />
  ) : null;

  if (variant === 'B') {
    return (
      <Page title="Sign in">
        {accessMessage ? <Alert variant="destructive"><AlertDescription>{accessMessage}</AlertDescription></Alert> : null}
        <div className="grid gap-section lg:grid-cols-2 lg:items-start">
          <div className="flex max-w-session flex-col gap-between-groups"><SignInIntro /></div>
          <Card className="flex flex-col gap-between-groups p-panel-roomy">
            <SignInDemoNotice />
            {form}
            {outcome}
          </Card>
        </div>
      </Page>
    );
  }

  if (variant === 'C') {
    return (
      <Page title="Sign in">
        {accessMessage ? <Alert variant="destructive"><AlertDescription>{accessMessage}</AlertDescription></Alert> : null}
        <Card className="flex flex-col gap-between-groups p-panel-roomy">
          <div className="grid gap-between-groups sm:grid-cols-2">
            <SignInIntro />
            <SignInDemoNotice />
          </div>
          {form}
          {outcome}
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Sign in" narrow>
      {accessMessage ? <Alert variant="destructive"><AlertDescription>{accessMessage}</AlertDescription></Alert> : null}
      <Card className="flex flex-col gap-between-groups p-panel-roomy">
        <SignInIntro />
        <SignInDemoNotice />
        {form}
        {outcome}
      </Card>
    </Page>
  );
}

function VerifyScreen({
  active,
  outcome,
  onSuccess,
  onStateChange,
  onRetry,
  onRequestNewLink,
  state,
}: {
  active: boolean;
  outcome: LinkOutcome;
  onSuccess: () => void;
  onStateChange: (state: VerificationState) => void;
  onRetry: () => void;
  onRequestNewLink: () => void;
  state: VerificationState;
}) {
  useEffect(() => {
    if (!active) return;
    onStateChange('checking');
    const timer = window.setTimeout(() => {
      if (outcome === 'valid') onSuccess();
      else onStateChange(outcome);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [active, onStateChange, onSuccess, outcome]);

  return (
    <Page title="Signing you in" narrow>
      {state === 'checking' || state === 'idle' ? (
        <LoadingMessage message="Checking the simulated sign-in link…" />
      ) : null}
      <Alert>
        <AlertDescription>
          No email or token is used. This is a local simulation of the selected link outcome.
        </AlertDescription>
      </Alert>
      {state === 'expired' || state === 'used' ? (
        <div className="flex flex-col items-start gap-between-groups">
          <ErrorMessage message={state === 'expired' ? 'This link has expired. Request a new one.' : 'This link was already used. Request a new one.'} />
          <Button type="button" onClick={onRequestNewLink}>Request a new link</Button>
        </div>
      ) : null}
      {state === 'server-error' ? (
        <ErrorMessage message="We could not check this link. Check your connection and try again." onRetry={onRetry} />
      ) : null}
    </Page>
  );
}

function DataLoading({ message }: { message: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-between-groups">
      <LoadingMessage message={message} />
      <Skeleton className="h-control w-1/3" />
      <Skeleton className="h-control-compact w-2/3" />
    </div>
  );
}

function LoadedNotice({ children }: { children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-group p-panel-roomy">
      <StatusBadge tone="neutral">Loaded</StatusBadge>
      <p className="m-0 text-body text-muted-foreground">{children}</p>
    </Card>
  );
}

function MentorsScreen({ state, onRetry }: { state: PageState; onRetry: () => void }) {
  return (
    <Page title="Mentors">
      <p className="m-0 text-body text-muted-foreground">
        This invited-participant list is simulated and is not connected to a live service.
      </p>
      {state === 'loading' ? <DataLoading message="Loading mentors…" /> : null}
      {state === 'error' ? (
        <ErrorMessage message="Mentors could not be loaded. Check your connection and try again." onRetry={onRetry} />
      ) : null}
      {state === 'empty' ? (
        <EmptyState
          title="No mentors in this demo state"
          description="This does not describe real pilot availability. No source-backed mentor profiles are included."
        />
      ) : null}
      {state === 'ready' ? (
        <LoadedNotice>
          The list loaded, but this prototype has no source-backed mentor profile to display.
        </LoadedNotice>
      ) : null}
    </Page>
  );
}

function MentorBookingsScreen({ state, onRetry }: { state: PageState; onRetry: () => void }) {
  return (
    <Page title="Your bookings">
      {state === 'loading' ? <DataLoading message="Loading your bookings…" /> : null}
      {state === 'error' ? (
        <ErrorMessage message="Bookings could not be loaded. Check your connection and try again." onRetry={onRetry} />
      ) : null}
      {state === 'empty' ? (
        <EmptyState
          title="No sample bookings"
          description="This is a demo state only. It does not indicate whether real bookings exist."
        />
      ) : null}
      {state === 'ready' ? (
        <LoadedNotice>
          Bookings loaded. No source-backed booking records are included in this prototype.
        </LoadedNotice>
      ) : null}
    </Page>
  );
}

function OperatorApprovalsScreen({ state, onRetry }: { state: PageState; onRetry: () => void }) {
  return (
    <Page title="Approvals">
      {state === 'loading' ? <DataLoading message="Loading approvals…" /> : null}
      {state === 'error' ? (
        <ErrorMessage message="Approvals could not be loaded. Check your connection and try again." onRetry={onRetry} />
      ) : null}
      {state === 'empty' ? (
        <EmptyState
          title="No sample approvals"
          description="This is a demo state only. It does not indicate whether real approvals are pending."
        />
      ) : null}
      {state === 'ready' ? (
        <LoadedNotice>
          Approvals loaded. No source-backed approval records are included in this prototype.
        </LoadedNotice>
      ) : null}
    </Page>
  );
}

function AccessDeniedScreen({
  reason,
  targetScreen,
  account,
  sessionMode,
  homeScreen,
}: {
  reason: 'wrong-role' | 'signed-out' | 'expired' | null;
  targetScreen: string | null;
  account: (typeof DEMO_ACCOUNTS)[DemoAccountId];
  sessionMode: SessionMode;
  homeScreen: string;
}) {
  if (sessionMode !== 'active') {
    return (
      <Page title="Sign in required" narrow>
        <Alert variant="destructive">
          <AlertDescription>
            {reason === 'expired'
              ? 'Your session expired. Sign in again to continue.'
              : 'Sign in to open this page. The requested page is kept only as a safe local destination.'}
          </AlertDescription>
        </Alert>
        <p className="m-0 text-meta text-muted-foreground">
          Review Back is unavailable at this gate. Use the sign-in link to continue.
        </p>
        <TextLink href="#s01" className="w-fit">Go to sign in</TextLink>
      </Page>
    );
  }

  const requiredRole = targetScreen ? REQUIRED_ROLE[targetScreen] : undefined;
  const requestedScreenIsAvailable = Boolean(
    targetScreen && requiredRole && account.roles.includes(requiredRole),
  );
  return (
    <Page title={requestedScreenIsAvailable ? 'Access available' : 'Access restricted'} narrow>
      <Alert variant="destructive">
        <AlertDescription>
          {requestedScreenIsAvailable
            ? 'The selected demo account can open this page.'
            : requiredRole
            ? `This page requires the ${requiredRole} role. The selected demo account does not have that access.`
            : 'This page needs a different account. No protected resource or account details are shown.'}
        </AlertDescription>
      </Alert>
      <p className="m-0 text-meta text-muted-foreground">
        Review Back is unavailable at this gate. Use the link below to continue.
      </p>
      <TextLink href={`#${requestedScreenIsAvailable ? targetScreen : homeScreen}`} className="w-fit">
        {requestedScreenIsAvailable
          ? 'Continue to requested page'
          : `Go to ${account.roles.includes('seeker') && homeScreen === 's05' ? 'your seeker home' :
            account.roles.includes('mentor') && homeScreen === 's06' ? 'your mentor home' : 'your account home'}`}
      </TextLink>
    </Page>
  );
}

function App() {
  const [lightTheme, setLightTheme] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('s01');
  const [signInVariant, setSignInVariant] = useState<SignInVariant>('A');
  const [accountId, setAccountId] = useState<DemoAccountId>('maja');
  const [sessionMode, setSessionMode] = useState<SessionMode>('signed-out');
  const [emailScenario, setEmailScenario] = useState<EmailScenario>('invited');
  const [emailValidity, setEmailValidity] = useState<EmailValidity>('valid');
  const [emailAttempted, setEmailAttempted] = useState(false);
  const [emailRequest, setEmailRequest] = useState<EmailRequestState>('idle');
  const [linkOutcome, setLinkOutcome] = useState<LinkOutcome>('valid');
  const [activeLinkOutcome, setActiveLinkOutcome] = useState<LinkOutcome>('valid');
  const [verificationState, setVerificationState] = useState<VerificationState>('idle');
  const [pageState, setPageState] = useState<PageState>('ready');
  const [returnScreen, setReturnScreen] = useState<string | null>(null);
  const [accessReason, setAccessReason] = useState<'wrong-role' | 'signed-out' | 'expired' | null>(null);
  const [deniedScreen, setDeniedScreen] = useState<string | null>(null);

  const account = DEMO_ACCOUNTS[accountId];
  const homeRole: Role = account.roles.includes('seeker')
    ? 'seeker'
    : account.roles.includes('mentor')
      ? 'mentor'
      : 'operator';
  const homeScreen = HOME_SCREEN[homeRole];
  const accessMessage = accessReason === 'expired'
    ? 'Your session expired. Sign in again to continue.'
    : accessReason === 'signed-out'
      ? 'Sign in to continue to the page you requested.'
      : null;

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
    if (!SAFE_RETURN_SCREENS.has(currentScreen)) return;
    if (sessionMode !== 'active') {
      setReturnScreen(currentScreen);
      setAccessReason(sessionMode === 'expired' ? 'expired' : 'signed-out');
      goTo('s01');
      return;
    }
    const requiredRole = REQUIRED_ROLE[currentScreen];
    if (requiredRole && !account.roles.includes(requiredRole)) {
      setDeniedScreen(currentScreen);
      setAccessReason('wrong-role');
      goTo('s08');
    }
  }, [account, currentScreen, sessionMode]);

  useEffect(() => {
    if (currentScreen === 's08') {
      const backButton = document.querySelector<HTMLButtonElement>('.proto-back');
      if (backButton) backButton.disabled = true;
    }
  }, [currentScreen]);

  const completeSignIn = useCallback(() => {
    const safeReturn = returnScreen && SAFE_RETURN_SCREENS.has(returnScreen)
      ? returnScreen
      : null;
    const returnRole = safeReturn ? REQUIRED_ROLE[safeReturn] : undefined;
    const destination = returnRole && account.roles.includes(returnRole) && safeReturn
      ? safeReturn
      : homeScreen;
    setSessionMode('active');
    setAccessReason(null);
    setDeniedScreen(null);
    setReturnScreen(null);
    goTo(destination);
  }, [account.roles, homeScreen, returnScreen]);

  useEffect(() => {
    window.__PROTOTYPE_START__?.();
  }, []);

  function sendLink() {
    if (emailValidity === 'invalid') {
      setEmailAttempted(true);
      setEmailRequest('idle');
      return;
    }
    setEmailAttempted(false);
    setEmailRequest('sending');
    window.setTimeout(() => {
      if (emailScenario === 'rate-limit') setEmailRequest('rate-limit');
      else if (emailScenario === 'send-error') setEmailRequest('send-error');
      else setEmailRequest('sent');
    }, 500);
  }

  function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendLink();
  }

  function openSimulatedLink() {
    setActiveLinkOutcome(emailScenario === 'not-invited' ? 'expired' : linkOutcome);
    setVerificationState('idle');
    goTo('s04');
  }

  function changeSessionMode(mode: SessionMode) {
    setSessionMode(mode);
    if (mode === 'active') setAccessReason(null);
  }

  const onRetryPage = () => setPageState('ready');
  const onRetryLink = () => {
    setActiveLinkOutcome('valid');
    setVerificationState('idle');
  };
  const onRequestNewLink = () => {
    setEmailRequest('idle');
    goTo('s01');
  };

  return (
    <div className="doc mx-auto w-full max-w-content">
      <header className="doc-head flex flex-wrap items-center justify-between gap-between-groups px-panel-compact py-panel-compact">
        <div className="flex items-center gap-group">
          <p className="m-0 text-label font-strong text-headline">DevMentor</p>
          <StatusBadge tone="neutral">{sessionMode === 'active' ? account.name : 'Signed out'}</StatusBadge>
        </div>
        <p className="m-0 text-meta text-muted-foreground">Accounts and roles · E01</p>
      </header>
      <div className="doc-toolbar sticky top-0 z-(--z-index-sticky) flex flex-col gap-between-groups border-b border-border bg-background px-panel-compact py-panel-compact">
        <div className="flex flex-wrap items-center gap-group">
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
        <fieldset className="grid gap-between-groups border-t border-border pt-panel-compact">
          <legend className="px-group text-label font-strong text-headline">Scenario controls · review only</legend>
          <div className="grid grid-cols-2 gap-between-groups md:grid-cols-3">
            <Field label="Demo account">
              <Select value={accountId} onChange={(event) => setAccountId(event.target.value as DemoAccountId)}>
                {(Object.entries(DEMO_ACCOUNTS) as [DemoAccountId, (typeof DEMO_ACCOUNTS)[DemoAccountId]][]).map(([id, demo]) => (
                  <option key={id} value={id}>{demo.name} · {demo.roles.join(' + ')}</option>
                ))}
              </Select>
            </Field>
            <Field label="Session">
              <Select value={sessionMode} onChange={(event) => changeSessionMode(event.target.value as SessionMode)}>
                <option value="signed-out">Signed out</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </Select>
            </Field>
            <Field label="Email response">
              <Select value={emailScenario} onChange={(event) => {
                setEmailScenario(event.target.value as EmailScenario);
                setEmailRequest('idle');
              }}>
                <option value="invited">Invited · sent</option>
                <option value="not-invited">Not invited · same response</option>
                <option value="rate-limit">Rate limit</option>
                <option value="send-error">Send failure</option>
              </Select>
            </Field>
            <Field label="Email input">
              <Select value={emailValidity} onChange={(event) => {
                setEmailValidity(event.target.value as EmailValidity);
                setEmailAttempted(false);
                setEmailRequest('idle');
              }}>
                <option value="valid">Valid demo email</option>
                <option value="invalid">Invalid example</option>
              </Select>
            </Field>
            <Field label="Link result">
              <Select value={linkOutcome} onChange={(event) => setLinkOutcome(event.target.value as LinkOutcome)}>
                <option value="valid">Valid link</option>
                <option value="expired">Expired link</option>
                <option value="used">Already used</option>
                <option value="server-error">Verification error</option>
              </Select>
            </Field>
            <Field label="Page data">
              <Select value={pageState} onChange={(event) => setPageState(event.target.value as PageState)}>
                <option value="ready">Loaded</option>
                <option value="loading">Loading</option>
                <option value="empty">Empty</option>
                <option value="error">Load error</option>
              </Select>
            </Field>
          </div>
        </fieldset>
      </div>
      <div className="flex flex-col gap-section px-panel-compact py-section">
        <Screen
          id="s01"
          title="Entry / sign in with an email link"
          stories="E01-T01 / #10."
          simulation="Email validation, invited and uninvited responses, rate limit, and send failure; no email is sent."
          undecided="The missing accounts-and-roles spec and production mail delivery details."
        >
          <SignInScreen
            variant={signInVariant}
            account={account}
            validity={emailValidity}
            attempted={emailAttempted}
            requestState={emailRequest}
            accessMessage={accessMessage}
            onSubmit={submitSignIn}
            onRetry={sendLink}
            onOpenLink={openSimulatedLink}
          />
        </Screen>
        <Screen
          id="s04"
          title="Verify magic link"
          stories="E01-T01 / #10; map decisions L8–L9."
          simulation="Link checking, success redirect, expiry, reuse, and verification failure; no token is used."
          undecided="The map's 15-minute TTL and redirect details are assumptions, not production decisions."
        >
          <VerifyScreen
            active={currentScreen === 's04'}
            outcome={activeLinkOutcome}
            state={verificationState}
            onSuccess={completeSignIn}
            onStateChange={setVerificationState}
            onRetry={onRetryLink}
            onRequestNewLink={onRequestNewLink}
          />
        </Screen>
        <Screen
          id="s05"
          title="Mentor list — seeker home"
          stories="E01-S01 / #11; map decisions L4–L6."
          simulation="Role access and loaded, empty, loading, and error states; no mentor records are included."
          undecided="The list's real contents and any filter behavior; no source-backed profiles are available."
        >
          <MentorsScreen state={pageState} onRetry={onRetryPage} />
        </Screen>
        <Screen
          id="s06"
          title="Mentor bookings — mentor home"
          stories="E01-S03 / #13 covers booking lifecycle, not this start-page design; map decision L5."
          simulation="Role access and booking-list loading, empty, and error states; no booking records are included."
          undecided="The page's final layout and real booking data."
        >
          <MentorBookingsScreen state={pageState} onRetry={onRetryPage} />
        </Screen>
        <Screen
          id="s07"
          title="Approvals — operator home"
          stories="No story defines the operator start page; map decisions L4–L5."
          simulation="Operator allowlist as a demo role plus loading, empty, and error states; no approval records are included."
          undecided="Operator access policy: the pilot spec describes a separate allowlist, while AGENTS.md says the product has no RBAC."
        >
          <OperatorApprovalsScreen state={pageState} onRetry={onRetryPage} />
        </Screen>
        <Screen
          id="s08"
          title="Access denied"
          stories="E01-S01 / #11 and E01-S04 / #14 access criteria; map decisions L6 and L9."
          simulation="Signed-out, expired-session, and wrong-role gates with a safe local return screen."
          undecided="Production authorization rules and hidden-resource behavior beyond the cited acceptance criteria."
        >
          <AccessDeniedScreen
            reason={accessReason}
            targetScreen={deniedScreen}
            account={account}
            sessionMode={sessionMode}
            homeScreen={homeScreen}
          />
        </Screen>
      </div>
    </div>
  );
}

export default App;
