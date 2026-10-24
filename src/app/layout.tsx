import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { LiffProvider } from "@/components/LiffProvider";
import "./globals.css";

// One rounded family throughout, by request.
const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-kanit",
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
  themeColor: "#e6f5ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={kanit.variable}>
      <body>
        <LiffProvider>
          <main className="mx-auto min-h-screen max-w-md px-4 pt-8 pb-28">{children}</main>
        </LiffProvider>
      </body>
    </html>
  );
}
