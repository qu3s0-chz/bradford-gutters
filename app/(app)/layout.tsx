import { BottomNav, Sidebar } from "@/components/app-nav";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { preview } = await requireUser();

  return (
    <div className="flex min-h-dvh flex-1">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-24 md:pb-8">
        {preview && (
          <p className="bg-brand-soft px-4 py-2 text-center text-sm text-brand print:hidden">
            Preview mode: Supabase isn&apos;t connected yet
          </p>
        )}
        <main className="mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
