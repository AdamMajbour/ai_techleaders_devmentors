"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerSchema, type UserDto } from "@devmentor/core";
import { apiCall, Card, CardContent, CardDescription, CardHeader, CardTitle, CrudForm } from "@devmentor/ui";

const FIELDS = [
  { name: "name", label: "Name", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "password", label: "Password (10 to 72 characters)", type: "password", autoComplete: "new-password" },
] as const;

export function RegisterView({ publicSignupEnabled }: { publicSignupEnabled: boolean }) {
  const router = useRouter();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>
            Already registered?{" "}
            <Link href="/login" className="text-primary underline">
              Log in
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publicSignupEnabled ? (
            <div className="flex flex-col gap-between-groups">
              <a href="/api/auth/github?mode=register" className="flex h-control w-full items-center justify-center rounded-md border border-input text-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Create account with GitHub
              </a>
              <p className="m-0 text-center text-body text-muted-foreground">or create an account with e-mail and password</p>
              <CrudForm
                schema={registerSchema}
                fields={[...FIELDS]}
                submitLabel="Create account"
                onSubmit={(values) => apiCall<UserDto>("/api/auth/register", { method: "POST", json: values })}
                onSuccess={() => { router.push("/"); router.refresh(); }}
              />
            </div>
          ) : (
            <p className="m-0 text-body">Public registration is currently closed. Sign in with an invitation or contact the person who invited you.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
