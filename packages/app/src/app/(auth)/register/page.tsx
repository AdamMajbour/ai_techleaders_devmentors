import { RegisterView } from "./register-view";
import { getEnv } from "@devmentor/core/server";

export const metadata = { title: "Register" };
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <RegisterView publicSignupEnabled={getEnv().PUBLIC_SIGNUP} />;
}
