"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Header({ title }: { title?: string }) {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsGuest(Boolean(data.user?.is_anonymous));
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="mb-6 flex items-center justify-between border-b pb-4">
      <Link href="/spaces" className="text-lg font-semibold" style={{ color: "#701e00" }}>
        {title ?? "Create Custom RAG Chatbots"}
      </Link>
      <button onClick={handleLogout} className="text-sm hover:underline" style={{ color: "#ff4400" }}>
        {isGuest ? "delete this session" : "Log out"}
      </button>
    </header>
  );
}
