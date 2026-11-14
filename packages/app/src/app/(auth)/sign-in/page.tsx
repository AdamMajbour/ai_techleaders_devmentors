import { LoginView } from "../login/login-view";
import { Suspense } from "react";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return <Suspense fallback={<main className="mx-auto max-w-md p-8">Loading sign-in…</main>}><LoginView /></Suspense>;
}
