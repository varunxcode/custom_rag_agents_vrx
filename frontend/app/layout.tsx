import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Spaces",
  description: "Create scoped RAG agents over your own documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
