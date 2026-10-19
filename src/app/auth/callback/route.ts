import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = () =>
    NextResponse.redirect(
      new URL("/passwort-vergessen?error=link", url.origin),
    );
  const code = url.searchParams.get("code");
  if (!code || code.length > 2048) return fail();
  try {
    const db = await createServerSupabase();
    if (!db) return fail();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (error || !data.user || data.user.is_anonymous) return fail();
    const response = NextResponse.redirect(
      new URL("/passwort-neu", url.origin),
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return fail();
  }
}
