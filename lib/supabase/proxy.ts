import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPreviewMode, supabaseKey, supabaseUrl } from "./config";

function redirectTo(path: string, request: NextRequest, from?: NextResponse) {
  const response = NextResponse.redirect(new URL(path, request.url));
  from?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export async function updateSession(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/login";

  if (!supabaseUrl || !supabaseKey) {
    if (isPreviewMode || isLogin) return NextResponse.next();
    return redirectTo("/login", request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) return redirectTo("/login", request, response);
  if (user && isLogin) return redirectTo("/", request, response);

  return response;
}
