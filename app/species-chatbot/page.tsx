/* eslint-disable */
"use client";

import { TypographyH2, TypographyP } from "@/components/ui/typography";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type ChatMsg = { role: "user" | "bot"; content: string };

export default function SpeciesChatbot() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<ChatMsg[]>([
    {
      role: "bot",
      content:
        "Hi! I’m your species chatbot. Ask about habitat, diet, conservation status, taxonomy, or other animal facts.",
    },
  ]);
  const [pending, setPending] = useState(false);

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    // auto-scroll to bottom when messages change
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chatLog]);

  const handleSubmit = async () => {
    const q = message.trim();
    if (!q || pending) return;

    // optimistic append
    setChatLog((m) => [...m, { role: "user", content: q }]);
    setMessage("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });

      if (!res.ok) {
        const errText =
          res.status === 400
            ? "Please enter a valid question about animals or species."
            : "The species service is unavailable. Try again in a moment.";
        setChatLog((m) => [...m, { role: "bot", content: errText }]);
      } else {
        const { response } = (await res.json()) as { response: string };
        setChatLog((m) => [...m, { role: "bot", content: response }]);
      }
    } catch {
      setChatLog((m) => [
        ...m,
        { role: "bot", content: "Network error. Please check your connection and try again." },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <TypographyH2>Species Chatbot</TypographyH2>
      <div className="mt-4 flex gap-4">
        <div className="mt-4 rounded-lg bg-foreground p-4 text-background">
          <TypographyP>
            The Species Chatbot answers questions about animals only (habitat, diet, conservation status, taxonomy,
            behavior, etc.). It will politely refuse unrelated topics.
          </TypographyP>
        </div>
      </div>

      <div className="mx-auto mt-6">
        {/* Chat history */}
        <div
          ref={listRef}
          className="h-[400px] space-y-3 overflow-y-auto rounded-lg border border-border bg-muted p-4"
        >
          {chatLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start chatting about a species!</p>
          ) : (
            chatLog.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${
                    msg.role === "user"
                      ? "rounded-br-none bg-primary text-primary-foreground"
                      : "rounded-bl-none border border-border bg-foreground text-primary-foreground"
                  }`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="mt-4 flex flex-col items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleInput}
            rows={1}
            placeholder="Ask about a species..."
            className="w-full resize-none overflow-hidden rounded border border-border bg-background p-2 text-sm text-foreground focus:outline-none disabled:opacity-60"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending || !message.trim()}
            className="mt-2 rounded bg-primary px-4 py-2 text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Enter"}
          </button>
        </div>
      </div>
    </>
  );
}
