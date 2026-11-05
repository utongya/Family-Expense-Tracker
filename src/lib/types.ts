export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Expense = {
  id: string;
  categoryId: string;
  amount: number;
  date: string;
  note: string;
  userId?: string;
};

export type Budget = {
  id: string;
  categoryId: string;
  amount: number;
};

export type Role = "admin" | "member";

export type Member = {
  id: string;
  name: string;
  role: Role;
};

export type Invite = {
  id: string;
  email: string;
  role: Role;
};

export type DashboardData = {
  members: Member[];
  invites: Invite[];
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
};

export type DashboardSummary = {
  totalMonth: number;
  totalBudget: number;
  categoryTotals: Record<string, number>;
  dailyTotals: { date: string; label: string; total: number }[];
};
