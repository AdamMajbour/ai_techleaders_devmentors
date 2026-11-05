import type { Metadata } from "next";
import { VerifyView } from "./verify-view";

export const metadata: Metadata = {
  title: "Verify sign-in link",
  referrer: "no-referrer",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <VerifyView token={typeof token === "string" ? token : null} />;
}
