"use client";

import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Coffee,
  CreditCard,
  House,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  PawPrint,
  Plane,
  Plus,
  Search,
  Settings,
  Shapes,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Utensils,
  Wallet,
  X,
  Car,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import type {
  Budget,
  Category,
  DashboardData,
  DashboardSummary,
  Expense,
} from "@/lib/types";

type DashboardProps = {
  initialData: DashboardData;
  initialSummary?: DashboardSummary;
  isDemo: boolean;
  userName: string;
  familyId?: string;
  userId?: string;
  isAdmin?: boolean;
  dataError?: string;
};

type PageKey = "overview" | "expenses" | "budgets" | "settings";
type ExpenseFormState = {
  categoryId: string;
  amount: string;
  date: string;
  note: string;
};

const navItems: { id: PageKey; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
  { id: "expenses", label: "รายการใช้จ่าย", icon: CreditCard },
  { id: "budgets", label: "งบประมาณ", icon: Wallet },
  { id: "settings", label: "ตั้งค่า", icon: Settings },
];

const categoryColors = [
  "#3b8c68",
  "#e6a65d",
  "#8b85c7",
  "#e28b83",
  "#5ba9b5",
  "#da7898",
  "#7fa56a",
  "#7391cf",
  "#a9a79e",
];

const categoryIcons: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-bag": ShoppingBag,
  house: House,
  car: Car,
  lightbulb: Lightbulb,
  "paw-print": PawPrint,
  package: Package,
  plane: Plane,
  shapes: Shapes,
};

const initialExpenseForm = (categoryId = ""): ExpenseFormState => ({
  categoryId,
  amount: "",
  date: localDateString(new Date()),
  note: "",
});

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function getCategoryColor(index: number) {
  return categoryColors[index % categoryColors.length];
}

function getCategoryIcon(icon: string) {
  return categoryIcons[icon] ?? Shapes;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function Dashboard({
  initialData,
  initialSummary,
  isDemo,
  userName,
  familyId,
  userId,
  isAdmin = false,
  dataError,
}: DashboardProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activePage, setActivePage] = useState<PageKey>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(
    initialExpenseForm(initialData.categories[0]?.id),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryBeingEdited, setCategoryBeingEdited] = useState<string | null>(null);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");

  const now = new Date();
  const currentMonthStart = localDateString(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const monthExpenses = data.expenses.filter(
    (expense) => expense.date >= currentMonthStart,
  );
  const usingServerSummary = data === initialData && Boolean(initialSummary);
  const totalMonth = usingServerSummary
    ? initialSummary!.totalMonth
    : monthExpenses.reduce((total, expense) => total + expense.amount, 0);
  const totalBudget = usingServerSummary
    ? initialSummary!.totalBudget
    : data.budgets.reduce((total, budget) => total + budget.amount, 0);
  const remaining = totalBudget - totalMonth;
  const savingsPercent =
    totalBudget > 0 ? Math.max(0, Math.round((remaining / totalBudget) * 100)) : 0;

  const spendingByCategory = data.categories
    .map((category) => ({
      ...category,
      total: usingServerSummary
        ? initialSummary!.categoryTotals[category.id] ?? 0
        : monthExpenses
            .filter((expense) => expense.categoryId === category.id)
            .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total);

  const chartData = (() => {
    if (usingServerSummary) return initialSummary!.dailyTotals;
    const today = new Date();
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (29 - index));
      const dateKey = localDateString(date);
      return {
        date: dateKey,
        label: new Intl.DateTimeFormat("th-TH", { day: "numeric" }).format(date),
        total: data.expenses
          .filter((expense) => expense.date === dateKey)
          .reduce((sum, expense) => sum + expense.amount, 0),
      };
    });
  })();

  const query = searchTerm.trim().toLocaleLowerCase("th");
  const filteredExpenses = [...data.expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((expense) => {
      if (!query) return true;
      const category = data.categories.find(
        (item) => item.id === expense.categoryId,
      );
      return `${category?.name ?? ""} ${expense.note}`
        .toLocaleLowerCase("th")
        .includes(query);
    });

  const monthName = getMonthLabel(now);

  function openAddExpense() {
    setEditingExpense(null);
    setExpenseForm(initialExpenseForm(data.categories[0]?.id));
    setExpenseDialogOpen(true);
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setExpenseForm({
      categoryId: expense.categoryId,
      amount: String(expense.amount),
      date: expense.date,
      note: expense.note,
    });
    setExpenseDialogOpen(true);
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(expenseForm.amount);
    if (!expenseForm.categoryId || !Number.isFinite(amount) || amount <= 0) {
      setNotice("กรุณาเลือกหมวดหมู่และระบุจำนวนเงินให้ถูกต้อง");
      return;
    }

    setIsSaving(true);
    setNotice("");
    const expense: Expense = {
      id: editingExpense?.id ?? crypto.randomUUID(),
      categoryId: expenseForm.categoryId,
      amount,
      date: expenseForm.date,
      note: expenseForm.note.trim(),
      userId,
    };

    try {
      if (!isDemo) {
        const supabase = createClient();
        const result = editingExpense
          ? await supabase
              .from("expenses")
              .update({
                category_id: expense.categoryId,
                amount: expense.amount,
                expense_date: expense.date,
                note: expense.note || null,
              })
              .eq("id", expense.id)
          : await supabase.from("expenses").insert({
              family_id: familyId,
              user_id: userId,
              category_id: expense.categoryId,
              amount: expense.amount,
              expense_date: expense.date,
              note: expense.note || null,
            });

        if (result.error) throw result.error;
      }

      setData((current) => ({
        ...current,
        expenses: editingExpense
          ? current.expenses.map((item) =>
              item.id === expense.id ? expense : item,
            )
          : [expense, ...current.expenses],
      }));
      setExpenseDialogOpen(false);
      setNotice(editingExpense ? "แก้ไขรายการเรียบร้อยแล้ว" : "บันทึกรายการเรียบร้อยแล้ว");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `บันทึกไม่สำเร็จ: ${error.message}`
          : "บันทึกรายการไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm("ต้องการลบรายการนี้ใช่ไหม?")) return;
    try {
      if (!isDemo) {
        const { error } = await createClient()
          .from("expenses")
          .delete()
          .eq("id", expense.id);
        if (error) throw error;
      }
      setData((current) => ({
        ...current,
        expenses: current.expenses.filter((item) => item.id !== expense.id),
      }));
      setNotice("ลบรายการเรียบร้อยแล้ว");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `ลบรายการไม่สำเร็จ: ${error.message}`
          : "ลบรายการไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    }
  }

  async function updateBudget(categoryId: string, amount: number) {
    const existing = data.budgets.find((budget) => budget.categoryId === categoryId);
    const budget: Budget = {
      id: existing?.id ?? crypto.randomUUID(),
      categoryId,
      amount,
    };
    try {
      if (!isDemo) {
        const { error } = await createClient()
          .from("budgets")
          .upsert(
            {
              family_id: familyId,
              category_id: categoryId,
              amount,
              period_month: currentMonthStart,
            },
            { onConflict: "family_id,category_id,period_month" },
          );
        if (error) throw error;
      }
      setData((current) => ({
        ...current,
        budgets: [
          ...current.budgets.filter((item) => item.categoryId !== categoryId),
          budget,
        ],
      }));
      setNotice("อัปเดตงบประมาณเรียบร้อยแล้ว");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `อัปเดตงบประมาณไม่สำเร็จ: ${error.message}`
          : "อัปเดตงบประมาณไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (!isDemo && !isAdmin) {
      setNotice("เฉพาะผู้ดูแลครอบครัวเท่านั้นที่เพิ่มหมวดหมู่ได้");
      return;
    }

    let category: Category = {
      id: crypto.randomUUID(),
      name,
      icon: "shapes",
    };
    try {
      if (!isDemo) {
        const { data: created, error } = await createClient()
          .from("categories")
          .insert({
            family_id: familyId,
            name,
            icon: category.icon,
          })
          .select("id")
          .single();
        if (error) throw error;
        category = { ...category, id: created.id };
        router.refresh();
      }
      setData((current) => ({
        ...current,
        categories: [...current.categories, category],
      }));
      setNewCategory("");
      setNotice("เพิ่มหมวดหมู่เรียบร้อยแล้ว");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `เพิ่มหมวดหมู่ไม่สำเร็จ: ${error.message}`
          : "เพิ่มหมวดหมู่ไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    }
  }

  async function renameCategory(category: Category) {
    const name = categoryNameDraft.trim();
    if (!name || name === category.name) {
      setCategoryBeingEdited(null);
      return;
    }
    try {
      if (!isDemo) {
        const { error } = await createClient()
          .from("categories")
          .update({ name })
          .eq("id", category.id);
        if (error) throw error;
      }
      setData((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id ? { ...item, name } : item,
        ),
      }));
      setCategoryBeingEdited(null);
      setNotice("แก้ไขหมวดหมู่เรียบร้อยแล้ว");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `แก้ไขหมวดหมู่ไม่สำเร็จ: ${error.message}`
          : "แก้ไขหมวดหมู่ไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    }
  }

  async function signOut() {
    if (!isDemo) {
      const { error } = await createClient().auth.signOut();
      if (error) {
        setNotice(`ออกจากระบบไม่สำเร็จ: ${error.message}`);
        return;
      }
      window.location.reload();
    }
  }

  function navigateTo(page: PageKey) {
    setActivePage(page);
    setMobileMenuOpen(false);
    setNotice("");
  }

  const avatarLetters = userName.slice(0, 2);

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#252a27]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-[#e9ece8] bg-white px-5 py-6 transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-9 flex items-center justify-between px-1">
          <Link href="/" className="flex items-center gap-3" onClick={() => navigateTo("overview")}>
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-[#e9f3ed] text-[#3b8c68]">
              <House size={21} strokeWidth={2.3} />
            </span>
            <span>
              <span className="block text-[16px] font-bold tracking-tight">บ้านอุ่นใจ</span>
              <span className="mt-0.5 block text-[10px] tracking-[0.14em] text-[#97a19a]">จัดการเงินครอบครัว</span>
            </span>
          </Link>
          <button
            aria-label="ปิดเมนู"
            className="rounded-lg p-2 text-[#839089] hover:bg-[#f4f6f4] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-[#a3aaa5]">
          เมนูหลัก
        </p>
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigateTo(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${
                activePage === id
                  ? "bg-[#edf5ef] text-[#347c5a]"
                  : "text-[#78827c] hover:bg-[#f7f8f6] hover:text-[#333a35]"
              }`}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {id === "expenses" && activePage === id && (
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] text-[#7d8a81]">
                  {data.expenses.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="mb-4 rounded-2xl bg-[#f6f7f4] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={15} className="text-[#d4a15d]" />
              <p className="text-[12px] font-semibold">วางแผนไปด้วยกัน</p>
            </div>
            <p className="text-[11px] leading-5 text-[#89928c]">
              ดูแลทุกค่าใช้จ่าย เพื่อเป้าหมายของครอบครัว
            </p>
            <button
              onClick={() => navigateTo("budgets")}
              className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#478264]"
            >
              ดูงบประมาณ <ArrowRight size={13} />
            </button>
          </div>
          <div className="flex items-center gap-3 border-t border-[#eef0ed] px-1 pt-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e9f0ea] text-[11px] font-bold text-[#4e7a5c]">
              {avatarLetters}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold">{userName}</p>
              <p className="mt-0.5 text-[10px] text-[#9aa29c]">
                {isDemo ? "โหมดตัวอย่าง" : isAdmin ? "ผู้ดูแลครอบครัว" : "สมาชิกครอบครัว"}
              </p>
            </div>
            {!isDemo && (
              <button
                aria-label="ออกจากระบบ"
                title="ออกจากระบบ"
                className="rounded-lg p-2 text-[#9aa29c] hover:bg-white hover:text-[#35433a]"
                onClick={signOut}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="fixed inset-0 z-30 bg-[#142018]/30 lg:hidden"
          aria-label="ปิดเมนู"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="min-h-screen lg:pl-[258px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e9ece8] bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              aria-label="เปิดเมนู"
              className="rounded-xl p-2 text-[#6d7971] hover:bg-[#f5f7f5] lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div>
              <p className="text-[10px] font-medium tracking-[0.12em] text-[#a1aaa3]">
                {new Intl.DateTimeFormat("th-TH", { weekday: "long" }).format(new Date())} · บ้านของเรา
              </p>
              <h1 className="mt-0.5 text-[15px] font-bold sm:text-[17px]">{pageTitle(activePage)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-[#ecefeb] px-3 py-2 text-[11px] text-[#7b867f] sm:flex">
              <CalendarDays size={14} />
              <span>{monthName}</span>
              <ChevronDown size={13} />
            </div>
            <button
              className="relative rounded-xl border border-[#ecefeb] p-2.5 text-[#7c8780] hover:bg-[#f8faf8]"
              aria-label="การแจ้งเตือน"
              title="การแจ้งเตือน"
              onClick={() => setNotice("ตอนนี้ยังไม่มีการแจ้งเตือนใหม่")}
            >
              <Bell size={17} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e58b70]" />
            </button>
            <button
              onClick={openAddExpense}
              className="flex items-center gap-2 rounded-xl bg-[#347d59] px-3 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#286b4a] sm:px-4 sm:text-[12px]"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">เพิ่มรายการ</span>
              <span className="sm:hidden">เพิ่ม</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
          {isDemo && (
            <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-[#e6eadf] bg-[#f2f5ec] px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#729365]">
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-[#495d44]">กำลังดูข้อมูลตัวอย่าง</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#788571]">
                    รายการที่เพิ่มจะอยู่ในหน้านี้ชั่วคราว ตั้งค่า Supabase เพื่อเริ่มบันทึกข้อมูลจริงของครอบครัว
                  </p>
                </div>
              </div>
              <Link
                href="/auth"
                className="ml-11 flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#3c7454] hover:underline sm:ml-0"
              >
                ตั้งค่าบัญชี <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {dataError && (
            <div role="alert" className="mb-5 rounded-xl border border-[#f0d1c8] bg-[#fff6f3] px-4 py-3 text-[12px] text-[#a64d3c]">
              โหลดข้อมูลไม่สำเร็จ: {dataError}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#dfe9e0] bg-white px-4 py-3 text-[12px] text-[#52675a]"
            >
              <span>{notice}</span>
              <button aria-label="ปิดข้อความ" onClick={() => setNotice("")}>
                <X size={15} />
              </button>
            </div>
          )}

          {activePage === "overview" && (
            <OverviewPage
              data={data}
              monthExpenses={monthExpenses}
              spendingByCategory={spendingByCategory}
              chartData={chartData}
              totalMonth={totalMonth}
              totalBudget={totalBudget}
              remaining={remaining}
              savingsPercent={savingsPercent}
              monthName={monthName}
              onOpenExpenses={() => navigateTo("expenses")}
              onEditExpense={openEditExpense}
              onAddExpense={openAddExpense}
              onOpenBudgets={() => navigateTo("budgets")}
            />
          )}
          {activePage === "expenses" && (
            <ExpensesPage
              expenses={filteredExpenses}
              categories={data.categories}
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onAdd={openAddExpense}
              onEdit={openEditExpense}
              onDelete={deleteExpense}
            />
          )}
          {activePage === "budgets" && (
            <BudgetsPage
              data={data}
              monthExpenses={monthExpenses}
              totalBudget={totalBudget}
              totalMonth={totalMonth}
              onUpdateBudget={updateBudget}
              onAddCategory={addCategory}
              categoryBeingEdited={categoryBeingEdited}
              categoryNameDraft={categoryNameDraft}
              setCategoryBeingEdited={setCategoryBeingEdited}
              setCategoryNameDraft={setCategoryNameDraft}
              onRenameCategory={renameCategory}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              isAdmin={isAdmin || isDemo}
            />
          )}
          {activePage === "settings" && (
            <SettingsPage
              userName={userName}
              isDemo={isDemo}
              isAdmin={isAdmin}
              onSignOut={signOut}
            />
          )}
        </main>
      </div>

      {expenseDialogOpen && (
        <ExpenseDialog
          categories={data.categories}
          form={expenseForm}
          editing={Boolean(editingExpense)}
          saving={isSaving}
          onChange={setExpenseForm}
          onClose={() => setExpenseDialogOpen(false)}
          onSubmit={saveExpense}
        />
      )}
    </div>
  );
}

function pageTitle(page: PageKey) {
  return {
    overview: "ภาพรวมครอบครัว",
    expenses: "รายการใช้จ่าย",
    budgets: "งบประมาณ",
    settings: "ตั้งค่า",
  }[page];
}

type OverviewPageProps = {
  data: DashboardData;
  monthExpenses: Expense[];
  spendingByCategory: (Category & { total: number })[];
  chartData: { date: string; label: string; total: number }[];
  totalMonth: number;
  totalBudget: number;
  remaining: number;
  savingsPercent: number;
  monthName: string;
  onOpenExpenses: () => void;
  onEditExpense: (expense: Expense) => void;
  onAddExpense: () => void;
  onOpenBudgets: () => void;
};

function OverviewPage({
  data,
  monthExpenses,
  spendingByCategory,
  chartData,
  totalMonth,
  totalBudget,
  remaining,
  savingsPercent,
  monthName,
  onOpenExpenses,
  onEditExpense,
  onAddExpense,
  onOpenBudgets,
}: OverviewPageProps) {
  const maxDaily = Math.max(...chartData.map((item) => item.total), 1000);
  const recentExpenses = [...monthExpenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-medium text-[#98a29b]">ยินดีต้อนรับกลับบ้าน 👋</p>
          <h2 className="mt-1.5 text-[23px] font-bold tracking-tight sm:text-[27px]">จัดการเงินบ้านเราให้อุ่นใจ</h2>
          <p className="mt-1.5 text-[12px] text-[#89938c]">ทุกเป้าหมายเริ่มต้นจากการวางแผนเล็ก ๆ ในทุกวัน</p>
        </div>
        <button
          onClick={onAddExpense}
          className="flex w-fit items-center gap-2 rounded-xl border border-[#dce7de] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#427557] shadow-sm hover:bg-[#f7faf7]"
        >
          <Plus size={15} /> บันทึกรายจ่าย
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="รายจ่ายเดือนนี้"
          value={currency(totalMonth)}
          helper={monthName}
          icon={Wallet}
          iconBg="bg-[#e9f3ed]"
          iconColor="text-[#3b8c68]"
          delta={<span className="text-[#b07c50]">สรุปรายจ่ายทั้งหมด</span>}
        />
        <SummaryCard
          label="งบประมาณทั้งหมด"
          value={currency(totalBudget)}
          helper="งบที่ตั้งไว้เดือนนี้"
          icon={SlidersHorizontal}
          iconBg="bg-[#f2edfa]"
          iconColor="text-[#8774ad]"
          delta={<span className="text-[#8a7aa9]">{data.budgets.length} หมวดหมู่</span>}
        />
        <SummaryCard
          label="งบคงเหลือ"
          value={currency(remaining)}
          helper="ใช้ได้จนถึงสิ้นเดือน"
          icon={remaining >= 0 ? ArrowDownLeft : ArrowUpRight}
          iconBg={remaining >= 0 ? "bg-[#edf4e8]" : "bg-[#fff0ec]"}
          iconColor={remaining >= 0 ? "text-[#719557]" : "text-[#ca715b]"}
          delta={
            <span className={remaining >= 0 ? "text-[#638553]" : "text-[#b95e4a]"}>
              {remaining >= 0 ? "ยังอยู่ในแผน" : "เกินงบประมาณ"}
            </span>
          }
        />
        <SummaryCard
          label="เก็บไว้ได้"
          value={`${savingsPercent}%`}
          helper="ของงบประมาณที่ตั้งไว้"
          icon={TrendingUp}
          iconBg="bg-[#fff4e6]"
          iconColor="text-[#d39b4d]"
          delta={<span className="text-[#bd8a45]">ใช้ไป {totalBudget > 0 ? Math.min(100, Math.round((totalMonth / totalBudget) * 100)) : 0}%</span>}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-bold">ภาพรวมการใช้จ่าย</h3>
              <p className="mt-1 text-[11px] text-[#99a19b]">รายจ่ายในช่วง 30 วันที่ผ่านมา</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-[#f5f7f4] px-2.5 py-1.5 text-[10px] text-[#758078]">
              <CalendarDays size={12} /> 30 วันล่าสุด
            </span>
          </div>
          <div className="h-[218px] w-full sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eff1ee" strokeDasharray="3 4" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#a1aaa3", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: "#a1aaa3", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => (value >= 1000 ? `${value / 1000}k` : `${value}`)}
                />
                <Tooltip
                  cursor={{ fill: "#f5f8f5" }}
                  contentStyle={{
                    border: "1px solid #e8ece8",
                    borderRadius: 12,
                    fontSize: 11,
                    boxShadow: "0 6px 18px rgba(30,50,35,.08)",
                  }}
                  formatter={(value) => [currency(Number(value)), "รายจ่าย"]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.date
                      ? shortDate(String(payload[0].payload.date))
                      : label
                  }
                />
                <Bar dataKey="total" fill="#77a887" radius={[5, 5, 0, 0]} maxBarSize={17} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-[#9aa39c]">
            <span className="size-2 rounded-sm bg-[#77a887]" />
            ยอดใช้จ่ายรายวัน
            <span className="ml-auto text-[#a2aaa4]">สูงสุด {currency(maxDaily)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-[14px] font-bold">ค่าใช้จ่ายตามหมวดหมู่</h3>
              <p className="mt-1 text-[11px] text-[#99a19b]">สัดส่วนรายจ่ายเดือนนี้</p>
            </div>
            <button aria-label="ตัวเลือกกราฟ" className="rounded-lg p-1.5 text-[#9ca59f] hover:bg-[#f6f8f6]">
              <MoreHorizontal size={18} />
            </button>
          </div>
          {spendingByCategory.length ? (
            <>
              <div className="relative mx-auto h-[168px] max-w-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingByCategory}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={53}
                      outerRadius={76}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {spendingByCategory.map((category) => (
                        <Cell
                          key={category.id}
                          fill={getCategoryColor(data.categories.findIndex((item) => item.id === category.id))}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => currency(Number(value))}
                      contentStyle={{ border: "1px solid #e8ece8", borderRadius: 12, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9px] text-[#9aa39c]">รวมทั้งสิ้น</span>
                  <span className="mt-1 text-[16px] font-bold">{currency(totalMonth)}</span>
                </div>
              </div>
              <div className="mt-2 space-y-2.5">
                {spendingByCategory.slice(0, 4).map((category) => {
                  const index = data.categories.findIndex((item) => item.id === category.id);
                  const Icon = getCategoryIcon(category.icon);
                  return (
                    <div key={category.id} className="flex items-center gap-2.5">
                      <span
                        className="flex size-7 items-center justify-center rounded-lg"
                        style={{ color: getCategoryColor(index), backgroundColor: `${getCategoryColor(index)}18` }}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10px] text-[#737e76]">{category.name}</span>
                      <span className="text-[10px] font-semibold">{currency(category.total)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState icon={Shapes} title="ยังไม่มีรายจ่ายในเดือนนี้" detail="เพิ่มรายการเพื่อดูสัดส่วนค่าใช้จ่าย" />
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-bold">รายการล่าสุด</h3>
              <p className="mt-1 text-[11px] text-[#99a19b]">ค่าใช้จ่ายของครอบครัว</p>
            </div>
            <button onClick={onOpenExpenses} className="flex items-center gap-1 text-[10px] font-semibold text-[#548267] hover:underline">
              ดูทั้งหมด <ArrowRight size={13} />
            </button>
          </div>
          <ExpenseTable
            expenses={recentExpenses}
            categories={data.categories}
            onEdit={onEditExpense}
          />
        </div>

        <div className="rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-[14px] font-bold">ติดตามงบประมาณ</h3>
              <p className="mt-1 text-[11px] text-[#99a19b]">ภาพรวมการใช้งบเดือนนี้</p>
            </div>
            <button onClick={onOpenBudgets} className="rounded-lg p-1.5 text-[#9ca59f]" aria-label="งบประมาณ">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="space-y-[18px]">
            {data.budgets.slice(0, 5).map((budget) => {
              const category = data.categories.find((item) => item.id === budget.categoryId);
              if (!category) return null;
              const spent = monthExpenses
                .filter((expense) => expense.categoryId === budget.categoryId)
                .reduce((sum, expense) => sum + expense.amount, 0);
              const ratio = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0;
              const color = getCategoryColor(data.categories.indexOf(category));
              const Icon = getCategoryIcon(category.icon);
              return (
                <div key={budget.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg" style={{ color, backgroundColor: `${color}18` }}>
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-[#68746c]">{category.name}</span>
                    <span className="text-[10px] font-semibold">{currency(spent)}</span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-full bg-[#f0f2ef]">
                    <div className="h-full rounded-full" style={{ width: `${ratio}%`, backgroundColor: color }} />
                  </div>
                  <p className="mt-1 text-right text-[9px] text-[#a0a8a2]">งบ {currency(budget.amount)}</p>
                </div>
              );
            })}
          </div>
          {data.budgets.length > 5 && (
            <button className="mt-4 flex items-center gap-1 text-[10px] font-semibold text-[#548267] hover:underline">
              จัดการงบประมาณ <ArrowRight size={13} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  iconBg,
  iconColor,
  delta,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  delta: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e9ece8] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex size-9 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <button aria-label={`ตัวเลือก${label}`} className="rounded-md p-1 text-[#adb4ae] hover:bg-[#f6f8f6]">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <p className="mt-4 text-[10px] font-medium text-[#929c95]">{label}</p>
      <p className="mt-1.5 truncate text-[21px] font-bold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px]">
        <span className="truncate text-[#a0a8a2]">{helper}</span>
        <span className="shrink-0">{delta}</span>
      </div>
    </div>
  );
}

function ExpenseTable({
  expenses,
  categories,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  categories: Category[];
  onEdit: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}) {
  if (!expenses.length) {
    return <EmptyState icon={Coffee} title="ยังไม่มีรายการใช้จ่าย" detail="บันทึกรายจ่ายแรกของครอบครัวได้เลย" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[470px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#eff1ee] text-[9px] font-medium text-[#a0a8a2]">
            <th className="pb-3 font-medium">รายการ</th>
            <th className="pb-3 font-medium">หมวดหมู่</th>
            <th className="pb-3 font-medium">วันที่</th>
            <th className="pb-3 text-right font-medium">จำนวนเงิน</th>
            <th className="w-8 pb-3" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => {
            const category = categories.find((item) => item.id === expense.categoryId);
            const color = getCategoryColor(Math.max(0, categories.indexOf(category!)));
            const Icon = getCategoryIcon(category?.icon ?? "shapes");
            return (
              <tr key={expense.id} className="group border-b border-[#f2f3f1] last:border-b-0">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px]" style={{ color, backgroundColor: `${color}18` }}>
                      <Icon size={15} />
                    </span>
                    <span className="max-w-[150px] truncate text-[10px] font-medium text-[#4e5952]">{expense.note || category?.name || "รายจ่าย"}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-[10px] text-[#8a948d]">{category?.name ?? "ไม่ระบุ"}</td>
                <td className="py-3 pr-3 text-[10px] text-[#8a948d]">{shortDate(expense.date)}</td>
                <td className="py-3 text-right text-[10px] font-semibold">{currency(expense.amount)}</td>
                <td className="py-3 pl-2">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      aria-label="แก้ไขรายการ"
                      title="แก้ไข"
                      className="rounded-md p-1 text-[#929c95] hover:bg-[#f2f5f2] hover:text-[#3e7958]"
                      onClick={() => onEdit(expense)}
                    >
                      <Pencil size={13} />
                    </button>
                    {onDelete && (
                      <button
                        aria-label="ลบรายการ"
                        title="ลบ"
                        className="rounded-md p-1 text-[#929c95] hover:bg-[#fff2ef] hover:text-[#bc5c4d]"
                        onClick={() => onDelete(expense)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExpensesPage({
  expenses,
  categories,
  searchTerm,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  categories: Category[];
  searchTerm: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] text-[#98a29b]">จัดการและติดตามรายจ่ายของทุกคนในบ้าน</p>
          <h2 className="mt-1.5 text-[21px] font-bold">รายการใช้จ่ายทั้งหมด</h2>
        </div>
        <button onClick={onAdd} className="flex w-fit items-center gap-2 rounded-xl bg-[#347d59] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#286b4a]">
          <Plus size={15} /> เพิ่มรายการใหม่
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniMetric label="จำนวนรายการ" value={`${expenses.length} รายการ`} icon={CreditCard} />
        <MiniMetric label="ยอดใช้จ่าย" value={currency(total)} icon={Wallet} />
        <MiniMetric label="ค่าเฉลี่ยต่อรายการ" value={currency(expenses.length ? total / expenses.length : 0)} icon={TrendingUp} />
      </div>
      <div className="rounded-2xl border border-[#e9ece8] bg-white p-4 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[14px] font-bold">รายการล่าสุด</h3>
            <p className="mt-1 text-[10px] text-[#99a19b]">ค้นหา แก้ไข หรือลบรายการของคุณ</p>
          </div>
          <label className="flex max-w-full items-center gap-2 rounded-xl border border-[#e9ece8] px-3 py-2 text-[#89938c] sm:w-[230px]">
            <Search size={15} />
            <input
              value={searchTerm}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="ค้นหารายการ..."
              className="w-full bg-transparent text-[11px] text-[#39443c] outline-none placeholder:text-[#a6ada8]"
            />
          </label>
        </div>
        <ExpenseTable expenses={expenses} categories={categories} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </section>
  );
}

function BudgetsPage({
  data,
  monthExpenses,
  totalBudget,
  totalMonth,
  onUpdateBudget,
  onAddCategory,
  categoryBeingEdited,
  categoryNameDraft,
  setCategoryBeingEdited,
  setCategoryNameDraft,
  onRenameCategory,
  newCategory,
  setNewCategory,
  isAdmin,
}: {
  data: DashboardData;
  monthExpenses: Expense[];
  totalBudget: number;
  totalMonth: number;
  onUpdateBudget: (categoryId: string, amount: number) => Promise<void>;
  onAddCategory: (event: FormEvent<HTMLFormElement>) => void;
  categoryBeingEdited: string | null;
  categoryNameDraft: string;
  setCategoryBeingEdited: (value: string | null) => void;
  setCategoryNameDraft: (value: string) => void;
  onRenameCategory: (category: Category) => void;
  newCategory: string;
  setNewCategory: (value: string) => void;
  isAdmin: boolean;
}) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] text-[#98a29b]">ตั้งเป้าหมายการใช้จ่ายให้ทุกหมวดหมู่</p>
        <h2 className="mt-1.5 text-[21px] font-bold">งบประมาณของครอบครัว</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniMetric label="งบประมาณรวม" value={currency(totalBudget)} icon={SlidersHorizontal} />
        <MiniMetric label="ใช้ไปแล้ว" value={currency(totalMonth)} icon={ArrowUpRight} />
        <MiniMetric label="คงเหลือ" value={currency(totalBudget - totalMonth)} icon={ArrowDownRight} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-[14px] font-bold">งบรายหมวดหมู่</h3>
            <p className="mt-1 text-[10px] text-[#99a19b]">ปรับงบสำหรับเดือนนี้ได้ทุกเมื่อ</p>
          </div>
          <div className="space-y-5">
            {data.categories.map((category, index) => {
              const budget = data.budgets.find((item) => item.categoryId === category.id);
              const spent = monthExpenses
                .filter((expense) => expense.categoryId === category.id)
                .reduce((sum, expense) => sum + expense.amount, 0);
              const color = getCategoryColor(index);
              const Icon = getCategoryIcon(category.icon);
              return (
                <BudgetRow
                  key={category.id}
                  category={category}
                  icon={Icon}
                  color={color}
                  spent={spent}
                  budget={budget?.amount ?? 0}
                  onSave={(amount) => onUpdateBudget(category.id, amount)}
                  canManage={isAdmin}
                />
              );
            })}
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#edf5ef] text-[#538568]"><Sparkles size={15} /></span>
              <div>
                <h3 className="text-[13px] font-bold">เพิ่มหมวดหมู่</h3>
                <p className="mt-0.5 text-[10px] text-[#99a19b]">สร้างหมวดหมู่ที่เหมาะกับบ้านคุณ</p>
              </div>
            </div>
            {isAdmin ? (
              <form onSubmit={onAddCategory} className="flex gap-2">
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  maxLength={40}
                  placeholder="ชื่อหมวดหมู่"
                  className="min-w-0 flex-1 rounded-xl border border-[#e6eae6] px-3 py-2.5 text-[11px] outline-none transition focus:border-[#87ae94]"
                />
                <button type="submit" className="flex items-center gap-1.5 rounded-xl bg-[#347d59] px-3 text-[10px] font-semibold text-white hover:bg-[#286b4a]">
                  <Plus size={14} /> เพิ่ม
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-[#8d9790]">เฉพาะผู้ดูแลครอบครัวเท่านั้นที่เพิ่มหมวดหมู่ได้</p>
            )}
            <div className="mt-4 space-y-2 border-t border-[#eff1ee] pt-4">
              <p className="mb-2 text-[10px] font-semibold text-[#8a948d]">หมวดหมู่ทั้งหมด</p>
              {data.categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                  {categoryBeingEdited === category.id ? (
                    <>
                      <input
                        value={categoryNameDraft}
                        maxLength={80}
                        onChange={(event) => setCategoryNameDraft(event.target.value)}
                        aria-label={`ชื่อหมวดหมู่ ${category.name}`}
                        className="min-w-0 flex-1 rounded-lg border border-[#dce5dd] px-2 py-1.5 text-[10px] outline-none focus:border-[#87ae94]"
                      />
                      <button
                        onClick={() => onRenameCategory(category)}
                        aria-label="บันทึกชื่อหมวดหมู่"
                        className="rounded-md bg-[#edf5ef] p-1.5 text-[#427557]"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setCategoryBeingEdited(null)}
                        aria-label="ยกเลิกแก้ไข"
                        className="rounded-md p-1.5 text-[#909a93]"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-[10px] text-[#667269]">{category.name}</span>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setCategoryBeingEdited(category.id);
                            setCategoryNameDraft(category.name);
                          }}
                          aria-label={`แก้ไขหมวดหมู่ ${category.name}`}
                          className="rounded-md p-1.5 text-[#95a098] hover:bg-[#f1f5f1] hover:text-[#477b59]"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff3e4] text-[#d09a4f]"><CircleHelp size={17} /></span>
              <div>
                <h3 className="text-[12px] font-bold">เคล็ดลับการวางแผน</h3>
                <p className="mt-1.5 text-[10px] leading-5 text-[#89938c]">ลองตั้งงบให้สอดคล้องกับรายรับ และเผื่องบสำรองสำหรับเหตุการณ์ไม่คาดคิด</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BudgetRow({
  category,
  icon: Icon,
  color,
  spent,
  budget,
  onSave,
  canManage,
}: {
  category: Category;
  icon: LucideIcon;
  color: string;
  spent: number;
  budget: number;
  onSave: (amount: number) => Promise<void>;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(budget || ""));
  const percentage = budget ? Math.min(100, (spent / budget) * 100) : 0;
  const overBudget = spent > budget && budget > 0;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await onSave(amount);
    setEditing(false);
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18`, color }}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold">{category.name}</span>
            <span className={`text-[10px] font-semibold ${overBudget ? "text-[#bf604d]" : "text-[#58635b]"}`}>{currency(spent)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f0f2ef]">
            <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: overBudget ? "#d97762" : color }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-[#9aa39c]">
            {editing ? (
              <form onSubmit={save} className="flex items-center gap-1.5">
                <span>ตั้งงบ</span>
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  autoFocus
                  aria-label={`งบประมาณ${category.name}`}
                  className="w-24 rounded-md border border-[#dce5dd] px-2 py-1 text-[10px] text-[#364238] outline-none"
                />
                <button type="submit" aria-label="บันทึกงบ" className="rounded-md bg-[#edf5ef] p-1 text-[#427557]"><Check size={13} /></button>
                <button type="button" aria-label="ยกเลิก" onClick={() => setEditing(false)} className="rounded-md p-1 text-[#909a93]"><X size={13} /></button>
              </form>
            ) : (
              <>
                <span>{budget ? `${currency(spent)} จาก ${currency(budget)}` : "ยังไม่ได้ตั้งงบ"}</span>
                {canManage && (
                  <button
                    onClick={() => { setValue(String(budget || "")); setEditing(true); }}
                    className="flex items-center gap-1 font-semibold text-[#568367] hover:underline"
                  >
                    <Pencil size={11} /> ตั้งงบ
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({
  userName,
  isDemo,
  isAdmin,
  onSignOut,
}: {
  userName: string;
  isDemo: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] text-[#98a29b]">จัดการบัญชีและข้อมูลของครอบครัว</p>
        <h2 className="mt-1.5 text-[21px] font-bold">ตั้งค่าบัญชี</h2>
      </div>
      <div className="max-w-3xl rounded-2xl border border-[#e9ece8] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-4 border-b border-[#eff1ee] pb-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e9f3ed] text-[14px] font-bold text-[#437858]">{userName.slice(0, 2)}</span>
          <div>
            <h3 className="text-[14px] font-bold">{userName}</h3>
            <p className="mt-1 text-[10px] text-[#929c95]">{isDemo ? "กำลังใช้ข้อมูลตัวอย่าง" : isAdmin ? "ผู้ดูแลครอบครัว" : "สมาชิกครอบครัว"}</p>
          </div>
        </div>
        <div className="space-y-4 py-5">
          <SettingLine label="ภาษาที่ใช้" value="ภาษาไทย" />
          <SettingLine label="สกุลเงิน" value="บาทไทย (฿)" />
          <SettingLine label="ข้อมูลครอบครัว" value={isDemo ? "โหมดตัวอย่าง" : "ข้อมูลส่วนตัวและรายจ่าย"} />
        </div>
        <div className="rounded-xl bg-[#f7f8f6] p-4">
          <p className="text-[11px] font-semibold">ข้อมูลของคุณปลอดภัย</p>
          <p className="mt-1.5 text-[10px] leading-5 text-[#89938c]">ข้อมูลครอบครัวถูกแยกตามสิทธิ์การเข้าถึง และจัดเก็บด้วย Supabase Row Level Security</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {isDemo ? (
            <Link href="/auth" className="rounded-xl bg-[#347d59] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#286b4a]">เข้าสู่ระบบ / สมัครสมาชิก</Link>
          ) : (
            <button onClick={onSignOut} className="flex items-center gap-2 rounded-xl border border-[#eadfdb] px-4 py-2.5 text-[11px] font-semibold text-[#ad6354] hover:bg-[#fff8f6]">
              <LogOut size={14} /> ออกจากระบบ
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function SettingLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-[#89938c]">{label}</span>
      <span className="text-right text-[11px] font-medium text-[#4d5850]">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-[#e9ece8] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#929c95]">{label}</p>
        <Icon size={16} className="text-[#8aab94]" />
      </div>
      <p className="mt-2 text-[17px] font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#f3f6f3] text-[#8da493]"><Icon size={18} /></span>
      <p className="mt-3 text-[11px] font-semibold text-[#59645c]">{title}</p>
      <p className="mt-1 text-[10px] text-[#9ba49d]">{detail}</p>
    </div>
  );
}

function ExpenseDialog({
  categories,
  form,
  editing,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  categories: Category[];
  form: ExpenseFormState;
  editing: boolean;
  saving: boolean;
  onChange: (value: ExpenseFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#152019]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-dialog-title"
        className="w-full max-w-[460px] rounded-t-[24px] bg-white p-5 shadow-[0_24px_80px_rgba(25,42,30,.18)] sm:rounded-[24px] sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium text-[#94a097]">บันทึกการเงินในบ้าน</p>
            <h2 id="expense-dialog-title" className="mt-1 text-[18px] font-bold">{editing ? "แก้ไขรายการใช้จ่าย" : "เพิ่มรายการใช้จ่าย"}</h2>
          </div>
          <button aria-label="ปิดหน้าต่าง" onClick={onClose} className="rounded-lg p-2 text-[#87928a] hover:bg-[#f5f7f5]"><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold text-[#647067]">จำนวนเงิน (บาท)</span>
            <div className="flex items-center rounded-xl border border-[#e5eae5] px-3 focus-within:border-[#8caf95]">
              <span className="text-[13px] text-[#a2aaa4]">฿</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                autoFocus
                value={form.amount}
                onChange={(event) => onChange({ ...form, amount: event.target.value })}
                placeholder="0.00"
                className="w-full bg-transparent px-2 py-3 text-[14px] font-semibold outline-none placeholder:font-normal placeholder:text-[#b1b8b2]"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold text-[#647067]">หมวดหมู่</span>
            <select
              required
              value={form.categoryId}
              onChange={(event) => onChange({ ...form, categoryId: event.target.value })}
              className="w-full appearance-none rounded-xl border border-[#e5eae5] bg-white px-3 py-3 text-[11px] outline-none focus:border-[#8caf95]"
            >
              <option value="" disabled>เลือกหมวดหมู่</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold text-[#647067]">วันที่</span>
            <input
              type="date"
              required
              value={form.date}
              onChange={(event) => onChange({ ...form, date: event.target.value })}
              className="w-full rounded-xl border border-[#e5eae5] bg-white px-3 py-3 text-[11px] outline-none focus:border-[#8caf95]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold text-[#647067]">รายละเอียด <span className="font-normal text-[#a5ada7]">(ไม่บังคับ)</span></span>
            <textarea
              rows={2}
              maxLength={180}
              value={form.note}
              onChange={(event) => onChange({ ...form, note: event.target.value })}
              placeholder="เช่น ซื้อของเข้าบ้าน"
              className="w-full resize-none rounded-xl border border-[#e5eae5] px-3 py-3 text-[11px] outline-none placeholder:text-[#aeb6af] focus:border-[#8caf95]"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#e5eae5] py-3 text-[11px] font-semibold text-[#657168] hover:bg-[#f7f8f7]">ยกเลิก</button>
            <button disabled={saving} type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#347d59] py-3 text-[11px] font-semibold text-white hover:bg-[#286b4a] disabled:cursor-wait disabled:opacity-70">
              {saving ? "กำลังบันทึก..." : <><Check size={14} /> {editing ? "บันทึกการแก้ไข" : "บันทึกรายการ"}</>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
