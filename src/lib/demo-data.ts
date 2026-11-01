import type { DashboardData } from "@/lib/types";

const categorySeeds = [
  ["food", "อาหาร และเครื่องดื่ม", "utensils"],
  ["shopping", "ช็อปปิ้ง", "shopping-bag"],
  ["home", "ค่างวดบ้าน", "house"],
  ["sam", "ค่างวด SAM", "landmark"],
  ["utilities", "สาธารณูปโภค", "lightbulb"],
  ["pets", "คชจ.ฮาโกะ/ฮาซิ", "paw-print"],
  ["household", "ของใช้เบ็ดเตล็ด", "package"],
  ["travel", "ท่องเที่ยว/สันทนาการ", "plane"],
  ["other", "อื่น ๆ", "shapes"],
];

export function createDemoData(): DashboardData {
  const categories = categorySeeds.map(([id, name, icon]) => ({
    id,
    name,
    icon,
  }));
  const today = new Date();
  const dateAt = (daysAgo: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().slice(0, 10);
  };

  return {
    categories,
    budgets: [
      { id: "budget-food", categoryId: "food", amount: 12000 },
      { id: "budget-shopping", categoryId: "shopping", amount: 6500 },
      { id: "budget-home", categoryId: "home", amount: 15000 },
      { id: "budget-sam", categoryId: "sam", amount: 8200 },
      { id: "budget-utilities", categoryId: "utilities", amount: 4800 },
      { id: "budget-pets", categoryId: "pets", amount: 3500 },
      { id: "budget-household", categoryId: "household", amount: 2800 },
      { id: "budget-travel", categoryId: "travel", amount: 4200 },
      { id: "budget-other", categoryId: "other", amount: 3000 },
    ],
    expenses: [
      { id: "demo-1", categoryId: "food", amount: 580, date: dateAt(0), note: "ซื้อของเข้าบ้าน" },
      { id: "demo-2", categoryId: "shopping", amount: 1290, date: dateAt(0), note: "ของใช้ในบ้าน" },
      { id: "demo-3", categoryId: "food", amount: 245, date: dateAt(1), note: "มื้อกลางวัน" },
      { id: "demo-4", categoryId: "pets", amount: 890, date: dateAt(2), note: "อาหารฮาโกะกับฮาซิ" },
      { id: "demo-5", categoryId: "utilities", amount: 1680, date: dateAt(3), note: "ค่าไฟฟ้า" },
      { id: "demo-6", categoryId: "food", amount: 430, date: dateAt(4), note: "ตลาดสด" },
      { id: "demo-7", categoryId: "travel", amount: 750, date: dateAt(5), note: "กิจกรรมวันหยุด" },
      { id: "demo-8", categoryId: "household", amount: 460, date: dateAt(7), note: "ของใช้เบ็ดเตล็ด" },
      { id: "demo-9", categoryId: "shopping", amount: 2200, date: dateAt(9), note: "รองเท้า" },
      { id: "demo-10", categoryId: "food", amount: 680, date: dateAt(10), note: "มื้อเย็นกับครอบครัว" },
      { id: "demo-11", categoryId: "sam", amount: 8200, date: dateAt(12), note: "ค่างวดรถ" },
      { id: "demo-12", categoryId: "food", amount: 390, date: dateAt(14), note: "อาหารเช้า" },
      { id: "demo-13", categoryId: "other", amount: 540, date: dateAt(16), note: "ค่าใช้จ่ายอื่น ๆ" },
      { id: "demo-14", categoryId: "home", amount: 15000, date: dateAt(18), note: "ค่างวดบ้าน" },
      { id: "demo-15", categoryId: "food", amount: 720, date: dateAt(20), note: "ซื้อของเข้าบ้าน" },
      { id: "demo-16", categoryId: "utilities", amount: 690, date: dateAt(23), note: "ค่าน้ำประปา" },
      { id: "demo-17", categoryId: "shopping", amount: 850, date: dateAt(26), note: "ของใช้ส่วนตัว" },
      { id: "demo-18", categoryId: "food", amount: 510, date: dateAt(28), note: "ตลาดสด" },
    ],
  };
}
