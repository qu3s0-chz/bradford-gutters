import { redirect } from "next/navigation";
import { isPreviewMode, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  if (!isSupabaseConfigured) {
    if (isPreviewMode) return { email: null, preview: true };
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return { email: user.email ?? null, preview: false };
}
