import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["latin", "thai"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "บ้านอุ่นใจ — บันทึกรายจ่ายครอบครัว",
  description: "จัดการค่าใช้จ่ายและงบประมาณของครอบครัวได้ในที่เดียว",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
