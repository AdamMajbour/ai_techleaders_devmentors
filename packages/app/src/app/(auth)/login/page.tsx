import { LoginView } from "./login-view";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  return <LoginView githubErrorCode={typeof error === 'string' ? error : null} />;
}
