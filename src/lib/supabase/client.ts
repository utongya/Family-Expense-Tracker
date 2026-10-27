"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("กรุณาตั้งค่า Supabase URL และ Anon Key ก่อนใช้งาน");
  }

  return createBrowserClient(url, anonKey);
}
