"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import { apiFetch, apiStream } from "@/lib/api";
import { Message } from "@/lib/types";

function ChatContent() {
  const { chatId } = useParams<{ spaceId: string; chatId: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Message[]>(`/chats/${chatId}/messages`)
      .then(setMessages)
      .catch((err) => setError((err as Error).message));
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    setError(null);
    setSending(true);
    setSlowHint(false);
    const slowTimer = setTimeout(() => setSlowHint(true), 5000);

    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: `local-user-${Date.now()}`, chat_id: chatId, role: "user", content, created_at: now },
      { id: `local-assistant-${Date.now()}`, chat_id: chatId, role: "assistant", content: "", created_at: now },
    ]);

    // Render's free tier can drop the very first request to a sleeping instance
    // (connection reset) rather than just answering slowly, so retry once
    // automatically instead of surfacing a scary error for a cold start.
    async function attemptStream() {
      const reader = await apiStream(`/chats/${chatId}/messages`, { content });
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        clearTimeout(slowTimer);
        setSlowHint(false);
        const text = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + text };
          return next;
        });
      }
    }

    try {
      try {
        await attemptStream();
      } catch (err) {
        if (err instanceof TypeError) {
          // Network-level failure (e.g. "Failed to fetch") - likely a cold-start
          // connection drop. Wait for the instance to finish waking up, then retry.
          setSlowHint(true);
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await attemptStream();
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearTimeout(slowTimer);
      setSlowHint(false);
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col p-6">
      <Header />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded px-4 py-2 text-sm ${
              message.role === "user" ? "ml-12 bg-gray-100" : "mr-12 bg-blue-50"
            }`}
          >
            <p className="mb-1 text-xs font-medium uppercase text-gray-500">{message.role}</p>
            {message.content ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              message.role === "assistant" &&
              sending && (
                <div className="flex gap-1 py-1" aria-label="Assistant is typing">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                </div>
              )
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {slowHint && (
        <p className="mb-2 text-xs text-gray-500">
          Waking up the server — this can take up to a minute on the first message after a period of inactivity (free-tier hosting).
        </p>
      )}

      <form onSubmit={handleSend} className="mt-4 flex gap-2 border-t pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this Space's documents..."
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}
