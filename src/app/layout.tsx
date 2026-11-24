import type { Metadata, Viewport } from "next";
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
  applicationName: "บ้านอุ่นใจ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "บ้านอุ่นใจ",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  colorScheme: "light",
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
