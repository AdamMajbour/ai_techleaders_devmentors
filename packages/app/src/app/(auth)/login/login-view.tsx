"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { loginSchema, magicLinkRequestSchema, type UserDto } from "@devmentor/core";
import { Alert, AlertDescription, apiCall, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from "@devmentor/ui";

const PERSONAS = ["mentee", "mentor", "operator"] as const;

function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://devmentor.invalid");
    return url.origin === "https://devmentor.invalid" ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

const GITHUB_ERRORS: Record<string, string> = {
  github_unavailable: "GitHub sign-in is not configured for this environment.",
  github_failed: "GitHub sign-in could not be completed. Check your GitHub account and try again.",
  github_email_required: "GitHub must provide a verified e-mail address to sign in.",
  github_invitation_required: "No eligible account was found for this GitHub account.",
  github_persona_not_configured: "This demo role has no GitHub e-mail configured.",
  github_persona_email_mismatch: "Your verified GitHub e-mail does not match this demo role.",
  github_demo_account_missing: "The demo account is missing. Run the local database seed first.",
  github_operator_not_enabled: "The demo operator is not enabled in this environment.",
};

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const githubError = searchParams.get("error");
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setFieldError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter your e-mail and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await apiCall<{ user: UserDto; destination: string }>("/api/auth/login", { method: "POST", json: parsed.data });
    setIsSubmitting(false);
    if (result.ok) {
      router.push(returnTo ?? result.data.destination);
      router.refresh();
      return;
    }
    setError("The e-mail or password is incorrect. Check your details and try again.");
  }

  async function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setFieldError(null);
    const parsed = magicLinkRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError("Enter a valid e-mail address.");
      return;
    }
    setIsSubmitting(true);
    const result = await apiCall<{ sent: boolean }>("/api/auth/magic-link/request", { method: "POST", json: parsed.data });
    setIsSubmitting(false);
    if (result.ok) setSent(true);
    else setError(result.error.message || "We couldn't request a sign-in link. Please try again.");
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Sign in with your account, GitHub, or an e-mail sign-in link.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-between-groups">
          {githubError && <Alert variant="destructive"><AlertDescription>{GITHUB_ERRORS[githubError] ?? "GitHub sign-in could not be completed."}</AlertDescription></Alert>}
          <a href={`/api/auth/github?mode=login${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`} className="flex h-control w-full items-center justify-center rounded-md border border-input text-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Continue with GitHub
          </a>
          {process.env.NODE_ENV !== "production" && (
            <section className="flex flex-col gap-group" aria-label="Sign in with GitHub mock">
              <p className="m-0 text-label text-muted-foreground">Local GitHub sign-in mocks</p>
              {PERSONAS.map((persona) => (
                <a key={persona} href={`/api/auth/github/mock?persona=${persona}`} className="flex h-control w-full items-center justify-center rounded-md border border-input text-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Continue as {persona} with GitHub mock
                </a>
              ))}
            </section>
          )}
          <form onSubmit={submitPassword} noValidate className="flex flex-col gap-between-groups">
            <Field id="login-email" label="E-mail" error={fieldError ?? undefined}>
              <Input type="email" name="email" autoComplete="email" value={email} disabled={isSubmitting} onChange={(event) => { setEmail(event.target.value); setFieldError(null); }} aria-invalid={fieldError ? true : undefined} />
            </Field>
            <Field id="login-password" label="Password">
              <Input type="password" name="password" autoComplete="current-password" value={password} disabled={isSubmitting} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in with password"}</Button>
          </form>
          <div className="flex items-center gap-group text-body text-muted-foreground"><span aria-hidden="true" className="h-px flex-1 bg-border" />or<span aria-hidden="true" className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submitMagicLink} noValidate className="flex flex-col gap-between-groups">
            {sent ? (
              <Alert><AlertDescription>If an invitation exists for this address, a sign-in link has been sent. Check your e-mail.</AlertDescription></Alert>
            ) : (
              <Button type="submit" variant="outline" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send e-mail sign-in link"}</Button>
            )}
          </form>
          <p className="m-0 text-body">New here? <Link href="/register" className="text-primary underline">Create an account</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
