"use client";

import { useState, type FormEvent } from "react";
import { magicLinkRequestSchema } from "@devmentor/core";
import { Alert, AlertDescription, apiCall, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from "@devmentor/ui";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    setError(null);
    setFieldError(null);

    const parsed = magicLinkRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError("Enter a valid e-mail address.");
      return;
    }

    setIsSending(true);
    const result = await apiCall<{ sent: boolean }>("/api/auth/magic-link/request", {
      method: "POST",
      json: parsed.data,
    });
    setIsSending(false);

    if (result.ok) {
      setSent(true);
      return;
    }
    setError(result.error.message || "We couldn't request a sign-in link. Please try again.");
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Sign in with the e-mail address on your invitation. If an invitation exists, we’ll send a one-time link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert>
              <AlertDescription>
                If an invitation exists for this address, a sign-in link has been sent. Check your e-mail.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-between-groups">
              <Field id="login-email" label="E-mail" error={fieldError ?? undefined}>
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  disabled={isSending}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldError(null);
                  }}
                  aria-invalid={fieldError ? true : undefined}
                />
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={isSending}>
                {isSending ? "Sending…" : "Send sign-in link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
