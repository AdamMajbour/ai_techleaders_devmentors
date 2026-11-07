"use client";

import Link from "next/link";
import { useState } from "react";
import { registerSchema } from "@devmentor/core";
import { Alert, AlertDescription, apiCall, Card, CardContent, CardDescription, CardHeader, CardTitle, CrudForm } from "@devmentor/ui";

const FIELDS = [
  { name: "name", label: "Display name", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "password", label: "Password (12 to 72 characters)", type: "password", autoComplete: "new-password" },
] as const;

export function RegisterView() {
  const [created, setCreated] = useState(false);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>
            Create an account with a display name, e-mail, and password. A reusable sign-in link will be written to the development logs. Already registered?{" "}
            <Link href="/sign-in" className="text-primary underline">
              Sign in
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/auth/github?mode=register" className="mb-4 flex h-control w-full items-center justify-center rounded-md border border-input text-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Continue with GitHub
          </a>
          <p className="mb-4 text-meta text-muted-foreground">Use your verified GitHub e-mail. You can sign in with GitHub again later.</p>
          {created ? (
            <Alert><AlertDescription>Account created. Open the reusable sign-in link in the development logs to sign in.</AlertDescription></Alert>
          ) : <CrudForm
            schema={registerSchema}
            fields={[...FIELDS]}
            submitLabel="Create account"
            onSubmit={(values) => apiCall<{ created: boolean }>("/api/auth/register", { method: "POST", json: values })}
            onSuccess={() => setCreated(true)}
          />
          }
        </CardContent>
      </Card>
    </main>
  );
}
