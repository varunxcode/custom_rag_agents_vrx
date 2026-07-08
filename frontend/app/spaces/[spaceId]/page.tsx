"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import { apiFetch } from "@/lib/api";
import { Chat, Document, Space } from "@/lib/types";

function SpaceDetailContent() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const router = useRouter();

  const [space, setSpace] = useState<Space | null>(null);
  const [instructions, setInstructions] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [creatingChat, setCreatingChat] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function loadSpace() {
    const data = await apiFetch<Space>(`/spaces/${spaceId}`);
    setSpace(data);
    setInstructions(data.instructions);
  }

  async function loadDocuments() {
    const data = await apiFetch<Document[]>(`/spaces/${spaceId}/documents`);
    setDocuments(data);
  }

  async function loadChats() {
    const data = await apiFetch<Chat[]>(`/spaces/${spaceId}/chats`);
    setChats(data);
  }

  useEffect(() => {
    Promise.all([loadSpace(), loadDocuments(), loadChats()]).catch((err) =>
      setError((err as Error).message)
    );
  }, [spaceId]);

  // Poll while any document is still processing, so status flips to "ready" without a manual refresh.
  useEffect(() => {
    const hasPending = documents.some((d) => d.status === "pending" || d.status === "processing");
    if (!hasPending) return;
    const interval = setInterval(() => {
      loadDocuments().catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [documents]);

  async function handleSaveInstructions() {
    setSavingInstructions(true);
    setError(null);
    try {
      await apiFetch(`/spaces/${spaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ instructions }),
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingInstructions(false);
    }
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiFetch(`/spaces/${spaceId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setDeletingDocId(documentId);
    setError(null);
    try {
      await apiFetch(`/documents/${documentId}`, { method: "DELETE" });
      await loadDocuments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingDocId(null);
    }
  }

  async function handleCreateChat() {
    setCreatingChat(true);
    setError(null);
    try {
      const chat = await apiFetch<Chat>(`/spaces/${spaceId}/chats`, {
        method: "POST",
        body: JSON.stringify({ title: "New Chat" }),
      });
      router.push(`/spaces/${spaceId}/chats/${chat.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreatingChat(false);
    }
  }

  if (!space) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Header />
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Header title={space.name} />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Instructions</h2>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="e.g., you are a helpful assistant for customer's queries"
          className="w-full rounded border px-3 py-2"
        />
        <button
          onClick={handleSaveInstructions}
          disabled={savingInstructions}
          className="mt-2 rounded bg-[#ff4400] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {savingInstructions ? "Saving..." : "Save instructions"}
        </button>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">Documents</h2>
        <p className="mb-2 text-xs text-gray-500">Supported formats: .txt, .md, .pdf</p>
        <div className="mb-3 flex gap-2">
          <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf" className="flex-1 text-sm" />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded bg-[#ff4400] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>{doc.filename}</span>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      doc.status === "ready"
                        ? "text-green-700"
                        : doc.status === "failed"
                          ? "text-red-600"
                          : "text-gray-500"
                    }
                  >
                    {doc.status}
                  </span>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    disabled={deletingDocId === doc.id}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    {deletingDocId === doc.id ? "..." : "✕"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Chats</h2>
          <button
            onClick={handleCreateChat}
            disabled={creatingChat}
            className="rounded bg-[#ff4400] px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            + New chat
          </button>
        </div>
        {chats.length === 0 ? (
          <p className="text-sm text-gray-500">No chats yet — start one above.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/spaces/${spaceId}/chats/${chat.id}`}
                  className="block rounded border px-3 py-2 text-sm hover:bg-[#ff4400]"
                  style={{ color: "#3d3d3d" }}
                >
                  {chat.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function SpaceDetailPage() {
  return (
    <AuthGuard>
      <SpaceDetailContent />
    </AuthGuard>
  );
}
