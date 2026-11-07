import type { Metadata } from "next";
import { VerifyView } from "./verify-view";

export const metadata: Metadata = {
  title: "Verify sign-in link",
  referrer: "no-referrer",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; mode?: string | string[] }>;
}) {
  const { token, mode } = await searchParams;
  return <VerifyView token={typeof token === "string" ? token : null} mode={mode === "account" ? "account" : "magic"} />;
}
