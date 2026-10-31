import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="h-12 w-full rounded-lg border border-line bg-surface font-medium text-muted"
      >
        Sign out
      </button>
    </form>
  );
}
