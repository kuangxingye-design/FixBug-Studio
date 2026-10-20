"use client";

import { useState, useCallback, useRef } from "react";
import type { AIProcessResponse, AIMergeResponse } from "@/lib/ai/types";

interface UseAIStreamOptions {
  onProgress?: (step: string, message: string) => void;
  onComplete?: (result: AIProcessResponse | AIMergeResponse) => void;
  onError?: (message: string) => void;
}

export function useAIStream(options: UseAIStreamOptions = {}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle");
  const [progressStep, setProgressStep] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [result, setResult] = useState<AIProcessResponse | AIMergeResponse | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (url: string, formData: FormData) => {
      setStatus("uploading");
      setProgressStep("uploading");
      setProgressMessage("Uploading file...");
      setError("");
      setResult(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(url, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Request failed");
        }

        setStatus("processing");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
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
              // Complete event — parse and dispatch
              try {
                const parsed = JSON.parse(eventData);
                switch (eventType) {
                  case "progress":
                    setProgressStep(parsed.step);
                    setProgressMessage(parsed.message);
                    options.onProgress?.(parsed.step, parsed.message);
                    break;
                  case "complete":
                    setResult(parsed.result);
                    setStatus("complete");
                    options.onComplete?.(parsed.result);
                    break;
                  case "error":
                    setError(parsed.message);
                    setStatus("error");
                    options.onError?.(parsed.message);
                    break;
                }
              } catch {
                // Incomplete JSON, put back in buffer
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
        if ((err as Error).name === "AbortError") {
          setStatus("idle");
          setError("Cancelled");
          return;
        }
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setStatus("error");
        options.onError?.(message);
      }
    },
    [options]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgressStep("");
    setProgressMessage("");
    setResult(null);
    setError("");
    abortRef.current?.abort();
  }, []);

  return {
    status,
    progressStep,
    progressMessage,
    result,
    error,
    startStream,
    cancel,
    reset,
  };
}
