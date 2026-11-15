import { LoginView } from "./login-view";
import { Suspense } from "react";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return <Suspense fallback={<main className="mx-auto max-w-md p-8">Loading sign-in…</main>}><LoginView /></Suspense>;
}
