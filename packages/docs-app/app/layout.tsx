import type { Metadata } from "next";
import { ThemeProvider } from "@docs-platform/react-renderer";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Docs",
  description: "API documentation platform — under construction.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
