"use client";

import { Download, Loader2 } from "lucide-react";

interface ProgressBarProps {
  status: string;
}

const STEPS = [
  { key: "downloading", label: "Downloading" },
  { key: "transcribing", label: "Analyzing Content" },
  { key: "analyzing", label: "Selecting Clips" },
  { key: "rendering", label: "Generating Clips" },
];

export default function ProgressBar({ status }: ProgressBarProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, idx) => {
          const isCompleted = currentIndex > idx;
          const isActive = currentIndex === idx;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-purple-600 border-purple-600"
                      : isActive
                      ? "border-purple-500 bg-purple-100 dark:bg-purple-600/20"
                      : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  {isCompleted ? (
                    <Download className="w-5 h-5 text-white" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  ) : (
                    <span className="text-zinc-500 text-sm">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? "text-purple-400" : isCompleted ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all ${
                    currentIndex > idx ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
