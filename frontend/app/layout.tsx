import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "RAG Chatbots",
  description: "Create scoped RAG chatbots over your own documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${roboto.className} flex min-h-screen flex-col`}>
        <div className="min-h-0 flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
