import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์ จึงส่งอีเมลเชิญไม่ได้" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    role?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  const role = body?.role === "admin" ? "admin" : "member";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("family_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "เฉพาะผู้ดูแลครอบครัวเท่านั้นที่เชิญสมาชิกได้" },
      { status: 403 },
    );
  }

  // Inserted with the caller's session so RLS still applies.
  const { data: invite, error: insertError } = await supabase
    .from("family_invites")
    .insert({
      family_id: profile.family_id,
      email,
      role,
      invited_by: user.id,
    })
    .select("id")
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${request.nextUrl.origin}/auth/set-password`,
  });
  if (mailError) {
    await supabase.from("family_invites").delete().eq("id", invite.id);
    return NextResponse.json({ error: mailError.message }, { status: 400 });
  }

  return NextResponse.json({ id: invite.id });
}
