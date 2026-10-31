import type { AppProps } from "next/app";
import { RootLayout } from "./layout";

export default function App({ children }: AppProps) {
  return <RootLayout children={children}>
  </RootLayout>;
}