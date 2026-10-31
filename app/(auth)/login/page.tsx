import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold">Bradford Seamless Gutters</h1>
      <p className="mt-1 text-muted">Sign in to continue.</p>
      <LoginForm />
    </main>
  );
}
