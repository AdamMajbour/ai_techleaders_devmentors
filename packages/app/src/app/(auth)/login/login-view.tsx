"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema } from "@devmentor/core";
import { Alert, AlertDescription, apiCall, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from "@devmentor/ui";

const PERSONAS = ["mentee", "mentor", "operator"] as const;

export function LoginView({ githubErrorCode = null }: { githubErrorCode?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    setError(null);
    setFieldError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter your e-mail and password.");
      return;
    }

    setIsSending(true);
    const result = await apiCall<{ id: string }>("/api/auth/login", { method: "POST", json: parsed.data });
    setIsSending(false);
    if (result.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("The e-mail or password is incorrect. Check your details and try again.");
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Sign in with your password or GitHub. New here?{" "}
            <Link href="/register" className="text-primary underline">Create account</Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {githubErrorCode ? <Alert variant="destructive" className="mb-4"><AlertDescription>{githubErrorCode === "github_invitation_required" ? "No account is available for this verified GitHub e-mail. Create one first if sign-up is enabled." : "GitHub sign-in could not be completed. Check that your GitHub account has a verified e-mail and try again."}</AlertDescription></Alert> : null}
          <a href="/api/auth/github?mode=login" className="mb-4 flex h-control w-full items-center justify-center rounded-md border border-input text-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Continue with GitHub
          </a>
          <section className="mb-4 flex flex-col gap-group" aria-label="Sign in with GitHub mock">
            <p className="m-0 text-label text-muted-foreground">GitHub mock</p>
            {PERSONAS.map((persona) => (
              <a key={persona} href={`/api/auth/github/mock?persona=${persona}`} className="flex h-control w-full items-center justify-center rounded-md border border-input text-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Continue as {persona} with GitHub mock
              </a>
            ))}
          </section>
          <form onSubmit={submit} noValidate className="flex flex-col gap-between-groups">
            <Field id="login-email" label="E-mail" error={fieldError ?? undefined}>
              <Input type="email" name="email" autoComplete="email" value={email} disabled={isSending} onChange={(event) => { setEmail(event.target.value); setFieldError(null); }} aria-invalid={fieldError ? true : undefined} />
            </Field>
            <Field id="login-password" label="Password">
              <Input type="password" name="password" autoComplete="current-password" value={password} disabled={isSending} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="submit" disabled={isSending}>{isSending ? "Signing in…" : "Sign in"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
