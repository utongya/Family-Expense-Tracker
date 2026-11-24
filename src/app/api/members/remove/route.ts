import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    memberId?: string;
  } | null;
  const memberId = body?.memberId?.trim();
  if (!memberId) {
    return NextResponse.json({ error: "ไม่พบรหัสสมาชิก" }, { status: 400 });
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
      { error: "เฉพาะผู้ดูแลครอบครัวเท่านั้นที่จัดการสมาชิกได้" },
      { status: 403 },
    );
  }
  if (memberId === user.id) {
    return NextResponse.json(
      { error: "ผู้ดูแลไม่สามารถลบตัวเองได้" },
      { status: 400 },
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: member, error: memberError } = await admin
    .from("users")
    .select("id, family_id, removed_at")
    .eq("id", memberId)
    .maybeSingle();
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }
  if (!member || member.family_id !== profile.family_id) {
    return NextResponse.json(
      { error: "ไม่พบสมาชิกในครอบครัวนี้" },
      { status: 404 },
    );
  }
  if (member.removed_at) {
    return NextResponse.json(
      { error: "สมาชิกคนนี้ถูกนำออกแล้ว" },
      { status: 409 },
    );
  }

  const removedAt = new Date().toISOString();
  const { error: removalError } = await admin
    .from("users")
    .update({ removed_at: removedAt, removed_by: user.id })
    .eq("id", memberId)
    .eq("family_id", profile.family_id);
  if (removalError) {
    return NextResponse.json({ error: removalError.message }, { status: 500 });
  }

  const { error: banError } = await admin.auth.admin.updateUserById(memberId, {
    ban_duration: "876000h",
  });
  if (banError) {
    const { error: rollbackError } = await admin
      .from("users")
      .update({ removed_at: null, removed_by: null })
      .eq("id", memberId);
    if (rollbackError) {
      console.error(
        "Failed to roll back member removal:",
        rollbackError.message,
      );
    }
    return NextResponse.json(
      { error: `ปิดการเข้าถึงบัญชีไม่สำเร็จ: ${banError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ memberId, removedAt });
}
