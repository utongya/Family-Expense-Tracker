"use client";

import { createClient } from "@supabase/supabase-js";

export function createPasswordClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("กรุณาตั้งค่า Supabase URL และ Anon Key ก่อนใช้งาน");
  }
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "family-password-setup",
    },
  });
}
