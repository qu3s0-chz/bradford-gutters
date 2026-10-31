import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // q/ is the public customer quote page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|q/).*)"],
};
