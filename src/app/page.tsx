import { Dashboard } from "@/components/dashboard";
import { createDemoData } from "@/lib/demo-data";
import type { DashboardData, DashboardSummary } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";
import { Suspense } from "react";

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function bangkokDateString(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8f6ff]">
          <p className="text-[12px] text-[#718078]">กำลังเตรียมข้อมูลครอบครัว...</p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const demoData = createDemoData();

  if (!hasSupabaseConfig()) {
    return (
      <Dashboard
        initialData={demoData}
        isDemo
        userName="ครอบครัวสุขใจ"
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Dashboard
        initialData={demoData}
        isDemo
        userName="ครอบครัวสุขใจ"
      />
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("family_id, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <Dashboard
        initialData={emptyData}
        isDemo={false}
        userName={user.email ?? "สมาชิก"}
        dataError={
          profileError?.message ??
          "ไม่พบโปรไฟล์ครอบครัว กรุณาตรวจสอบการตั้งค่า Supabase"
        }
      />
    );
  }

  const today = new Date();
  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(today);
  const todayPart = (type: string) =>
    Number(todayParts.find((item) => item.type === type)?.value);
  const monthStart = `${todayPart("year")}-${`${todayPart("month")}`.padStart(2, "0")}-01`;
  const last30DaysStart = bangkokDateString(
    new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
  );
  const dataStart = monthStart < last30DaysStart ? monthStart : last30DaysStart;

  const [
    { data: categories, error: categoryError },
    { data: budgets, error: budgetError },
    { data: expenses, error: expenseError },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("created_at"),
    supabase
      .from("budgets")
      .select("id, category_id, amount")
      .eq("period_month", monthStart),
    supabase
      .from("expenses")
      .select("id, category_id, amount, expense_date, note, user_id")
      .gte("expense_date", dataStart)
      .order("expense_date", { ascending: false })
      .limit(500),
  ]);

  const queryError = categoryError ?? budgetError ?? expenseError;
  const initialData: DashboardData = {
    categories: (categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon ?? "shapes",
    })),
    budgets: (budgets ?? []).map((budget) => ({
      id: budget.id,
      categoryId: budget.category_id,
      amount: Number(budget.amount),
    })),
    expenses: (expenses ?? []).map((expense) => ({
      id: expense.id,
      categoryId: expense.category_id,
      amount: Number(expense.amount),
      date: expense.expense_date,
      note: expense.note ?? "",
      userId: expense.user_id,
    })),
  };
  const monthRows = initialData.expenses.filter(
    (expense) => expense.date >= monthStart,
  );
  const dailyTotals = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(
      Date.UTC(todayPart("year"), todayPart("month") - 1, todayPart("day") - (29 - index)),
    );
    const dateKey = bangkokDateString(date);
    return {
      date: dateKey,
      label: new Intl.DateTimeFormat("th-TH", { day: "numeric" }).format(date),
      total: initialData.expenses
        .filter((expense) => expense.date === dateKey)
        .reduce((sum, expense) => sum + expense.amount, 0),
    };
  });
  const initialSummary: DashboardSummary = {
    totalMonth: monthRows.reduce((sum, expense) => sum + expense.amount, 0),
    totalBudget: initialData.budgets.reduce(
      (sum, budget) => sum + budget.amount,
      0,
    ),
    categoryTotals: Object.fromEntries(
      initialData.categories.map((category) => [
        category.id,
        monthRows
          .filter((expense) => expense.categoryId === category.id)
          .reduce((sum, expense) => sum + expense.amount, 0),
      ]),
    ),
    dailyTotals,
  };

  return (
    <Dashboard
      initialData={initialData}
      initialSummary={initialSummary}
      isDemo={false}
      userName={profile.display_name || user.email || "สมาชิก"}
      familyId={profile.family_id}
      userId={user.id}
      isAdmin={profile.role === "admin"}
      dataError={queryError?.message}
    />
  );
}

const emptyData: DashboardData = {
  categories: [],
  budgets: [],
  expenses: [],
};
