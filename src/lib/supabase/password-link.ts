import type { SupabaseClient } from "@supabase/supabase-js";

type LinkTokens = {
  access_token: string;
  refresh_token: string;
};

export function parsePasswordLink(hash: string, search: string):
  | { tokens: LinkTokens; error?: never }
  | { tokens?: never; error: string } {
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search);
  if (fragment.has("error") || fragment.has("error_code") || query.has("error")) {
    return { error: "ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว กรุณาขอลิงก์ตั้งรหัสผ่านใหม่" };
  }
  const type = fragment.get("type");
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if ((type !== "invite" && type !== "recovery") || !accessToken || !refreshToken) {
    return { error: "ไม่พบลิงก์เชิญหรือลิงก์ตั้งรหัสผ่านที่ถูกต้อง กรุณาขอลิงก์ใหม่" };
  }
  return { tokens: { access_token: accessToken, refresh_token: refreshToken } };
}

export async function verifyPasswordLink(
  auth: Pick<SupabaseClient["auth"], "setSession">,
  tokens: LinkTokens,
) {
  const { data, error } = await auth.setSession(tokens);
  if (error) throw error;
  if (!data.session?.user.email) {
    throw new Error("ไม่สามารถยืนยันบัญชีจากลิงก์นี้ได้ กรุณาขอลิงก์ใหม่");
  }
  return { session: data.session, email: data.session.user.email };
}
