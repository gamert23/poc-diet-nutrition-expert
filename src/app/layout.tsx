import type { Metadata, Viewport } from "next";
import { LiffProvider } from "@/components/LiffProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Nutritionist",
  description: "ผู้ช่วยควบคุมอาหารและโภชนาการส่วนบุคคลบน LINE",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <LiffProvider>
          <main className="mx-auto min-h-screen max-w-md px-4 pt-5 pb-24">{children}</main>
        </LiffProvider>
      </body>
    </html>
  );
}
