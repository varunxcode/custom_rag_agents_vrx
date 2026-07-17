"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/spaces");
  }

  async function handleGuest() {
    setGuestLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInAnonymously();
    setGuestLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/spaces");
  }

  return (
    <main className="mx-auto mt-24 max-w-sm">
      <h2 className="mb-6 text-2xl font-semibold">Build Custom RAG-Based chatbots</h2>
      <h1 className="mb-6 text-xl font-semibold">Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-[#ff4400] px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
      <button
        type="button"
        onClick={handleGuest}
        disabled={guestLoading}
        className="mt-2 w-full rounded border px-3 py-2 text-sm hover:bg-[#ff4400] hover:text-white disabled:opacity-50"
      >
        {guestLoading ? "Starting..." : "Continue as guest"}
      </button>
    </main>
  );
}
