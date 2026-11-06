"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [linkError, setLinkError] = useState("");
  const [saving, setSaving] = useState(false);
  // The URL hash is cleared once Supabase consumes it, so capture it once.
  const linkState = useRef<{ hasToken: boolean; error: string } | null>(null);

  useEffect(() => {
    if (!linkState.current) {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const search = new URLSearchParams(window.location.search);
      linkState.current = {
        hasToken: hash.has("access_token") || search.has("code"),
        error: hash.get("error_description") ?? search.get("error_description") ?? "",
      };
    }
    const { hasToken, error } = linkState.current;
    const supabase = createClient();

    // Only trust a session that came from the invite link, never one already
    // signed in on this browser (e.g. the admin), or we would change that password.
    if (!hasToken) {
      setLinkError(error || "ลิงก์เชิญไม่ถูกต้อง หมดอายุ หรือถูกใช้ไปแล้ว กรุณาให้ผู้ดูแลส่งคำเชิญใหม่");
      return;
    }
    const accept = (session: { user: { email?: string } } | null) => {
      if (!session) return;
      setEmail(session.user.email ?? "");
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => accept(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) =>
      accept(session),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setMessage("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f6ff] px-5">
      <div className="w-full max-w-[390px] rounded-2xl border border-[#e9ece8] bg-white p-7">
        <h1 className="text-[22px] font-bold">ตั้งรหัสผ่านเพื่อเข้าร่วมครอบครัว</h1>
        {ready ? (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <p className="text-[11px] text-[#89938c]">
              บัญชี: <span className="font-semibold text-[#4d5850]">{email}</span>
            </p>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="รหัสผ่านใหม่"
              className="w-full rounded-xl border border-[#e9ece8] px-3 py-2.5 text-[12px] outline-none"
            />
            <button
              disabled={saving}
              className="w-full rounded-xl bg-[#7c3aed] px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "ยืนยันและเข้าร่วม"}
            </button>
          </form>
        ) : linkError ? (
          <p className="mt-4 text-[12px] text-[#bc5c4d]">
            {linkError}{" "}
            <Link href="/auth" className="font-semibold text-[#7c3aed]">กลับไปหน้าเข้าสู่ระบบ</Link>
          </p>
        ) : (
          <p className="mt-4 text-[12px] text-[#89938c]">
            กำลังตรวจสอบลิงก์เชิญ... หากไม่สำเร็จ ลิงก์อาจหมดอายุ{" "}
            <Link href="/auth" className="font-semibold text-[#7c3aed]">กลับไปหน้าเข้าสู่ระบบ</Link>
          </p>
        )}
        {message && <p className="mt-3 text-[11px] text-[#bc5c4d]">{message}</p>}
      </div>
    </main>
  );
}
