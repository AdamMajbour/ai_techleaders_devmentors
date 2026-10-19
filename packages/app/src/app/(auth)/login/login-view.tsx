"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema, type UserDto } from "@devmentor/core";
import { apiCall, Card, CardContent, CardDescription, CardHeader, CardTitle, CrudForm } from "@devmentor/ui";

const FIELDS = [
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
] as const;

export function LoginView() {
  const router = useRouter();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            No account yet?{" "}
            <Link href="/register" className="text-primary underline">
              Register
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrudForm
            schema={loginSchema}
            fields={[...FIELDS]}
            submitLabel="Log in"
            onSubmit={(values) => apiCall<UserDto>("/api/auth/login", { method: "POST", json: values })}
            onSuccess={() => router.push("/articles")}
          />
        </CardContent>
      </Card>
    </main>
  );
}
