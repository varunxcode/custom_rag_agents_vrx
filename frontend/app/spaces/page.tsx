"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import GuestBanner from "@/components/GuestBanner";
import Header from "@/components/Header";
import { apiFetch } from "@/lib/api";
import { Space } from "@/lib/types";

function SpacesContent() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSpaces() {
    setLoading(true);
    try {
      const data = await apiFetch<Space[]>("/spaces");
      setSpaces(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSpaces();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiFetch<Space>("/spaces", {
        method: "POST",
        body: JSON.stringify({ name, instructions: "" }),
      });
      setName("");
      await loadSpaces();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Header />
      <GuestBanner />
      <h1 className="mb-4 text-xl font-semibold">Your RAG Chatbots</h1>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="enter your chatbot name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-[#ff4400] px-4 py-2 text-white disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : spaces.length === 0 ? (
        <p className="text-gray-500">No chatbots yet — create one above.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {spaces.map((space) => (
            <li key={space.id}>
              <Link
                href={`/spaces/${space.id}`}
                className="block rounded border px-4 py-3 hover:bg-[#ff4400]"
              >
                <span className="font-medium" style={{ color: "#701e00" }}>{space.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function SpacesPage() {
  return (
    <AuthGuard>
      <SpacesContent />
    </AuthGuard>
  );
}
