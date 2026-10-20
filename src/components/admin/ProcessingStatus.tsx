"use client";

import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "@/i18n/useTranslation";

interface ProcessingStatusProps {
  step: string;
  message: string;
  status: "uploading" | "processing" | "complete" | "error" | "idle";
  error?: string;
}

export function ProcessingStatus({
  step,
  message,
  status,
  error,
}: ProcessingStatusProps) {
  const { t } = useTranslation();

  const stepLabels: Record<string, string> = {
    uploading: t("adminArticles.uploadingFile"),
    analyzing: t("adminArticles.analyzingContent"),
    calling_ai: t("adminArticles.callingAI"),
    processing_response: t("adminArticles.processingResponse"),
    complete: t("adminArticles.complete"),
  };

  const isActive = status === "uploading" || status === "processing";
  const isComplete = status === "complete";
  const isError = status === "error";

  const steps = ["analyzing", "calling_ai", "processing_response", "complete"];
  const currentStepIdx = steps.indexOf(step);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        {isActive && <Spinner size="sm" className="text-primary" />}
        {isComplete && (
          <svg
            className="h-5 w-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        )}
        {isError && (
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        <div>
          <p className="font-medium text-foreground">{message}</p>
          {isError && error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>

      {/* Progress steps */}
      {isActive && (
        <div className="mt-4 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  i < currentStepIdx
                    ? "bg-green-500 text-white"
                    : i === currentStepIdx
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStepIdx ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs ${
                  i <= currentStepIdx
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {stepLabels[s]}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-8 ${
                    i < currentStepIdx ? "bg-green-500" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
