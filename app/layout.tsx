import "./globals.css";
import type { Metadata } from "next";
import { LayoutWrapper } from "@/components/layout-wrapper";

export const metadata: Metadata = {
  title: "Material Intelligence",
  description: "Enterprise takeoff and project material intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="app-shell">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}