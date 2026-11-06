"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
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
