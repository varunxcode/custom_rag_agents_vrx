"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? "/spaces" : "/login");
    });
  }, [router]);

  return <div className="p-8 text-gray-500">Loading... please wait a minute</div>;
}
