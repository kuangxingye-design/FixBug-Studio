"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
  /** The resulting modified content from an assistant message */
  editedContent?: string;
}

interface AIChatPanelProps {
  content: string;
  onApply: (newContent: string) => void;
  open: boolean;
  onClose: () => void;
}

export function AIChatPanel({ content, onApply, open, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleSend = async () => {
    const instruction = input.trim();
    if (!instruction || loading) return;

    setInput("");
    setError("");

    // The content to edit: either the latest edited content, or the original
    const currentContent =
      messages.length > 0
        ? messages[messages.length - 1].editedContent || content
        : content;

    const userMsg: Message = { role: "user", content: instruction };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Build conversation history (exclude the current user message)
    const history = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentContent,
          instruction,
          history: history.length > 0 ? history : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = "";
        let eventType = "";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            eventData = line.slice(6).trim();
          } else if (line === "" && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              if (eventType === "progress") {
                // Could show progress, skip for now
              } else if (eventType === "complete") {
                const editedContent = parsed.result?.editedContent || currentContent;
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: editedContent,
                    editedContent,
                  },
                ]);
              } else if (eventType === "error") {
                setError(parsed.message || "Unknown error");
              }
            } catch {
              buffer += `event: ${eventType}\ndata: ${eventData}\n`;
            }
            eventType = "";
            eventData = "";
          } else {
            buffer += line + "\n";
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (editedContent: string) => {
    onApply(editedContent);
    onClose();
  };

  const handleDiscard = (index: number) => {
    setMessages((prev) => prev.slice(0, index));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <h2 className="font-semibold">AI 助手</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center text-center">
              <div className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  输入你想对文章做哪些修改
                </p>
                <p className="text-xs text-muted-foreground/60">
                  例如：&ldquo;给第二部分添加代码示例&rdquo;、&ldquo;把标题改得更有吸引力&rdquo;
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="space-y-2">
              {/* User message */}
              {msg.role === "user" && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* Assistant message */}
              {msg.role === "assistant" && (
                <div className="space-y-2">
                  <div className="rounded-2xl rounded-bl-md border border-border bg-card p-4">
                    <div className="max-h-80 overflow-y-auto text-sm">
                      <MarkdownRenderer content={msg.content.substring(0, 2000)} />
                    </div>
                    {msg.content.length > 2000 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        (preview truncated — last {msg.content.length - 2000} characters not shown)
                      </p>
                    )}
                  </div>
                  {i === messages.length - 1 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApply(msg.editedContent || msg.content)}
                      >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        应用到编辑器
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDiscard(i)}
                      >
                        放弃
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
              <Spinner size="sm" />
              <span className="text-sm text-muted-foreground">AI 正在修改文章...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入修改指令，如：给第一段添加代码示例"
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={loading || !input.trim()}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
