import type { Metadata, Viewport } from "next";
import { Mali, Mitr } from "next/font/google";
import { LiffProvider } from "@/components/LiffProvider";
import "./globals.css";

// Rounded terminals throughout for a soft, friendly feel. Mali keeps looped Thai
// letterforms for body text, which read more easily for older users, who are a large
// part of the hypertension and diabetes audience.
const mali = Mali({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mitr = Mitr({
  subsets: ["thai", "latin"],
  weight: ["400", "500"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Nutritionist",
  description: "ผู้ช่วยควบคุมอาหารและโภชนาการส่วนบุคคลบน LINE",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f5ef",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${mali.variable} ${mitr.variable}`}>
      <body>
        <LiffProvider>
          <main className="mx-auto min-h-screen max-w-md px-4 pt-6 pb-24">{children}</main>
        </LiffProvider>
      </body>
    </html>
  );
}
