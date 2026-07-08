"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Header({ title }: { title?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="mb-6 flex items-center justify-between border-b pb-4">
      <Link href="/spaces" className="text-lg font-semibold">
        {title ?? "RAG Spaces"}
      </Link>
      <button onClick={handleLogout} className="text-sm text-gray-500 hover:underline">
        Log out
      </button>
    </header>
  );
}
