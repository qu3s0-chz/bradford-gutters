"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = {};
const fieldClass =
  "mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3 text-base";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </label>
      <label className="text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-brand font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
