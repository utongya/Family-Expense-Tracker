"use client";

import { ArrowLeft, House, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [displayName, setDisplayName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      const reason = params.get("reason");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(`เข้าสู่ระบบด้วย Google ไม่สำเร็จ${reason ? `: ${reason}` : ""}`);
    }
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isConfigured) {
      setMessage("ยังไม่ได้ตั้งค่า Supabase กรุณาทำตามขั้นตอนใน README ก่อนสมัครสมาชิก");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              family_name: familyName.trim(),
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage("สมัครสมาชิกสำเร็จแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "ดำเนินการไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setMessage("");
    if (!isConfigured) {
      setMessage("ยังไม่ได้ตั้งค่า Supabase กรุณาทำตามขั้นตอนใน README ก่อนสมัครสมาชิก");
      return;
    }
    try {
      const { data, error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error("ไม่ได้รับลิงก์เข้าสู่ระบบจาก Google");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "ไม่สามารถเข้าสู่ระบบด้วย Google ได้",
      );
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f8f6ff] lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#f1eaff] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-28 -top-24 size-[440px] rounded-full border border-[#e4d8ff]" />
        <div className="absolute -right-12 -top-8 size-[310px] rounded-full border border-[#e4d8ff]" />
        <div className="absolute -bottom-32 -left-28 size-[390px] rounded-full bg-[#e7dcff]" />
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-white text-[#7c3aed] shadow-sm"><House size={21} /></span>
          <span>
            <span className="block text-[16px] font-bold">บ้านอุ่นใจ</span>
            <span className="mt-0.5 block text-[10px] tracking-[0.14em] text-[#97a19a]">FAMILY FINANCE</span>
          </span>
        </Link>
        <div className="relative z-10 max-w-[480px] py-16">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-[#7c3aed]">
            <Sparkles size={13} /> วางแผนการเงินไปด้วยกัน
          </span>
          <h1 className="text-[36px] font-bold leading-[1.35] tracking-tight text-[#2d3e32] xl:text-[42px]">
            ดูแลทุกค่าใช้จ่าย
            <br />
            เพื่อทุกความสุข
            <br />
            <span className="text-[#7c3aed]">ของครอบครัว</span>
          </h1>
          <p className="mt-5 max-w-[370px] text-[13px] leading-7 text-[#738477]">
            บันทึกรายจ่าย วางแผนงบประมาณ และมองเห็นภาพรวมการเงินของทุกคนในบ้านได้ง่าย ๆ
          </p>
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["ส", "น", "ม"].map((letter, index) => (
                <span key={letter} className={`flex size-8 items-center justify-center rounded-full border-2 border-[#f1eaff] text-[10px] font-bold text-white ${["bg-[#8b5cf6]", "bg-[#ec4899]", "bg-[#6366f1]"][index]}`}>{letter}</span>
              ))}
            </div>
            <p className="text-[10px] text-[#87968a]">ช่วยกันดูแลบ้าน ในทุกวัน</p>
          </div>
        </div>
        <p className="relative z-10 text-[10px] text-[#9aa79c]">บ้านอุ่นใจ · จัดการเงินอย่างเข้าใจและเป็นส่วนตัว</p>
      </section>

      <section className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-10 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="flex items-center gap-2 text-[11px] font-medium text-[#7d8981] hover:text-[#3b7654]">
            <ArrowLeft size={15} /> กลับหน้าภาพรวม
          </Link>
          <span className="text-[10px] text-[#98a19a]">{mode === "signup" ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}</span>
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setMessage("");
            }}
            className="ml-2 text-[10px] font-semibold text-[#4b805f] hover:underline"
          >
            {mode === "signup" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-12">
          <div className="mb-7 lg:hidden">
            <span className="flex size-11 items-center justify-center rounded-[15px] bg-[#f1eaff] text-[#7c3aed]"><House size={22} /></span>
          </div>
          <p className="text-[11px] font-medium text-[#84a08a]">{mode === "signup" ? "เริ่มต้นสร้างพื้นที่ของครอบครัว" : "ยินดีต้อนรับกลับมา"}</p>
          <h2 className="mt-2 text-[25px] font-bold tracking-tight">{mode === "signup" ? "สร้างบัญชีครอบครัว" : "เข้าสู่ระบบ"}</h2>
          <p className="mt-2 text-[11px] leading-5 text-[#939d96]">
            {mode === "signup"
              ? "เริ่มบันทึกและวางแผนค่าใช้จ่ายไปด้วยกัน"
              : "ลงชื่อเข้าใช้เพื่อดูข้อมูลของครอบครัว"}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <>
                <AuthField
                  label="ชื่อของคุณ"
                  icon={UserRound}
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="เช่น มะลิ"
                  required
                />
                <AuthField
                  label="ชื่อครอบครัว"
                  icon={House}
                  value={familyName}
                  onChange={setFamilyName}
                  placeholder="เช่น บ้านสุขใจ"
                  required
                />
              </>
            )}
            <AuthField
              label="อีเมล"
              icon={Mail}
              value={email}
              onChange={setEmail}
              placeholder="name@example.com"
              type="email"
              required
            />
            <AuthField
              label="รหัสผ่าน"
              icon={LockKeyhole}
              value={password}
              onChange={setPassword}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              type="password"
              minLength={6}
              required
            />
            {message && (
              <p role="status" className="rounded-xl border border-[#e8e9dc] bg-[#faf9f0] px-3 py-2.5 text-[10px] leading-5 text-[#796c3f]">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !isConfigured}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] py-3.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "กำลังดำเนินการ..."
                : mode === "signup"
                  ? "สร้างบัญชีและครอบครัว"
                  : "เข้าสู่ระบบ"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] text-[#a2aaa4]">
            <span className="h-px flex-1 bg-[#e7ebe7]" />
            หรือ
            <span className="h-px flex-1 bg-[#e7ebe7]" />
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={!isConfigured}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e7e2ee] bg-white py-3.5 text-[11px] font-semibold text-[#3f4a42] transition hover:bg-[#f8f6ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
              <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
              <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
            </svg>
            {mode === "signup" ? "สมัครด้วย Google" : "เข้าสู่ระบบด้วย Google"}
          </button>

          {!isConfigured && (
            <p className="mt-4 text-center text-[10px] leading-5 text-[#a07854]">
              ระบบบัญชียังไม่พร้อมใช้งาน กรุณาตั้งค่า Supabase ตาม README
            </p>
          )}
          <p className="mt-6 text-center text-[9px] leading-5 text-[#a2aaa4]">
            การสมัครสมาชิกหมายถึงคุณยอมรับการใช้งานข้อมูลเพื่อจัดการค่าใช้จ่ายในครอบครัว
          </p>
        </div>
        <p className="text-center text-[9px] text-[#aab1ab]">ข้อมูลของคุณเป็นส่วนตัว และมองเห็นได้เฉพาะสมาชิกในครอบครัว</p>
      </section>
    </main>
  );
}

function AuthField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  minLength,
}: {
  label: string;
  icon: typeof Mail;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold text-[#5f6b62]">{label}</span>
      <span className="flex items-center gap-2.5 rounded-xl border border-[#e7e2ee] px-3.5 transition focus-within:border-[#a78bfa]">
        <Icon size={15} className="shrink-0 text-[#a0aaa2]" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className="w-full bg-transparent py-3 text-[11px] outline-none placeholder:text-[#b1b9b3]"
        />
      </span>
    </label>
  );
}
