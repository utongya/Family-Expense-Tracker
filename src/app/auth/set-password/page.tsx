"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createPasswordClient } from "@/lib/supabase/password-client";
import { parsePasswordLink, verifyPasswordLink } from "@/lib/supabase/password-link";

type VerifiedLink = { client: SupabaseClient; email: string };

export default function SetPasswordPage() {
  const router = useRouter();
  const verification = useRef<Promise<VerifiedLink> | null>(null);
  const [verified, setVerified] = useState<VerifiedLink | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [linkError, setLinkError] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (!verification.current) {
      const link = parsePasswordLink(window.location.hash, window.location.search);
      window.history.replaceState(window.history.state, "", window.location.pathname);
      verification.current = (async () => {
        if (!link.tokens) throw new Error(link.error);
        const client = createPasswordClient();
        const { email } = await verifyPasswordLink(client.auth, link.tokens);
        return { client, email };
      })();
    }

    let active = true;
    verification.current.then(
      (result) => { if (active) setVerified(result); },
      (error: unknown) => {
        if (active) {
          setLinkError(error instanceof Error ? error.message : "ตรวจสอบลิงก์ไม่สำเร็จ กรุณาขอลิงก์ใหม่");
        }
      },
    );
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verified) return;
    if (password.length < 6 || password !== confirmation) {
      setMessage(password.length < 6 ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : "รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { error } = await verified.client.auth.updateUser({ password });
      if (error) throw error;
      setPasswordSaved(true);

      const { data, error: sessionError } = await verified.client.auth.getSession();
      if (sessionError) throw new Error("บันทึกรหัสผ่านแล้ว แต่เข้าสู่ระบบอัตโนมัติไม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
      if (!data.session) throw new Error("บันทึกรหัสผ่านแล้ว แต่ไม่พบเซสชัน กรุณาเข้าสู่ระบบ");
      const result = await createClient().auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (result.error || !result.data.session) {
        throw new Error("บันทึกรหัสผ่านแล้ว แต่เข้าสู่ระบบอัตโนมัติไม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง");
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f6ff] px-5">
      <div className="w-full max-w-[390px] rounded-2xl border border-[#e9ece8] bg-white p-7">
        <h1 className="text-[22px] font-bold">ตั้งรหัสผ่าน</h1>
        {passwordSaved && !saving ? (
          <p className="mt-4 text-[12px] text-[#89938c]">
            บันทึกรหัสผ่านแล้ว <Link href="/auth" className="font-semibold text-[#7c3aed]">ไปหน้าเข้าสู่ระบบ</Link>
          </p>
        ) : verified ? (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <p className="text-[11px] text-[#89938c]">
              ตั้งรหัสผ่านสำหรับ <span className="font-semibold text-[#4d5850]">{verified.email}</span>
            </p>
            <label className="block text-[11px] font-medium">
              รหัสผ่านใหม่
              <input type="password" autoComplete="new-password" required value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e9ece8] px-3 py-2.5 text-[12px] outline-none" />
            </label>
            <label className="block text-[11px] font-medium">
              ยืนยันรหัสผ่าน
              <input type="password" autoComplete="new-password" required value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e9ece8] px-3 py-2.5 text-[12px] outline-none" />
            </label>
            <button disabled={saving} className="w-full rounded-xl bg-[#7c3aed] px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60">
              {saving ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
            </button>
          </form>
        ) : linkError ? (
          <p role="alert" className="mt-4 text-[12px] text-[#bc5c4d]">
            {linkError} <Link href="/auth" className="font-semibold text-[#7c3aed]">กลับไปหน้าเข้าสู่ระบบเพื่อขอลิงก์ใหม่</Link>
          </p>
        ) : (
          <p className="mt-4 text-[12px] text-[#89938c]">กำลังตรวจสอบลิงก์...</p>
        )}
        {message && <p role="alert" className="mt-3 text-[11px] text-[#bc5c4d]">{message}</p>}
      </div>
    </main>
  );
}
