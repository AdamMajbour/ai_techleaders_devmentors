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

export function RegisterView() {
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
          <CrudForm
            schema={registerSchema}
            fields={[...FIELDS]}
            submitLabel="Create account"
            onSubmit={(values) => apiCall<UserDto>("/api/auth/register", { method: "POST", json: values })}
            onSuccess={() => router.push("/articles")}
          />
        </CardContent>
      </Card>
    </main>
  );
}
