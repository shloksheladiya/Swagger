import type { Metadata } from "next";
import { ThemeProvider } from "@docs-platform/react-renderer";
import { productionConfig } from "./production-config";
import "./globals.css";

// Tab title comes from the same branding the header renders, so the two
// can't drift apart when a deployment swaps its production config.
export const metadata: Metadata = {
  title: productionConfig.branding.title,
  description:
    "Interactive REST API documentation rendered from an OpenAPI document, with live Try It Out requests.",
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
