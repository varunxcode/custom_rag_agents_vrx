"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function GuestBanner() {
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsGuest(Boolean(data.user?.is_anonymous));
    });
  }, []);

  if (!isGuest) return null;

  return (
    <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      You&apos;re browsing as a guest — your RAG chatbots are deleted after an hour.{" "}
      <Link href="/signup" className="underline">
        Sign up
      </Link>{" "}
      to keep them.
    </div>
  );
}
