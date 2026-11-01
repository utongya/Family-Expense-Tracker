import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  let reason = providerError ?? "missing_code";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
    reason = error.message;
    console.error("OAuth code exchange failed:", error.message);
  }

  return NextResponse.redirect(
    `${origin}/auth?error=oauth&reason=${encodeURIComponent(reason)}`,
  );
}
