"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiCall, Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui";

type VerificationState = "loading" | "success" | "error";

export function VerifyView({ token }: { token: string | null }) {
  const [state, setState] = useState<VerificationState>(() => (token ? "loading" : "error"));
  const started = useRef(false);

  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/auth/verify");
    if (started.current) return;
    started.current = true;

    if (!token) return;

    void apiCall("/api/auth/magic-link/consume", {
      method: "POST",
      json: { token },
    }).then((result) => {
      setState(result.ok ? "success" : "error");
    });
  }, [token]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>{state === "success" ? "You’re signed in" : "Verify your sign-in link"}</CardTitle>
          <CardDescription>
            {state === "success"
              ? "Your one-time link has been used. You can close this page."
              : "Sign-in links can only be used once and expire after 15 minutes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state === "loading" && (
            <Alert>
              <AlertDescription>Verifying your sign-in link…</AlertDescription>
            </Alert>
          )}
          {state === "success" && (
            <Alert>
              <AlertDescription>You’re signed in to DevMentor.</AlertDescription>
            </Alert>
          )}
          {state === "error" && (
            <div className="flex flex-col gap-between-groups">
              <Alert variant="destructive">
                <AlertDescription>
                  This link is invalid, expired, or has already been used. Request a new sign-in link.
                </AlertDescription>
              </Alert>
              <Button asChild>
                <Link href="/login">Request a new link</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
