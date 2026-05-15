import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "JewelFlow — Jewellery Raw Material & Vendor Management",
  description:
    "Premium full-stack system to manage gold and silver raw material, vendors, production, and overdue reminders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
