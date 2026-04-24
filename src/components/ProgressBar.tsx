"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const REMINDERS = [
  "Platform ini menggunakan AI dan dapat membuat kesalahan.",
  "Kamu dapat mendapatkan kualitas video lebih baik dengan upgrade ke akun Pro.",
];

function ReminderTicker() {
  const [idx, setIdx]         = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      // Fade out
      setVisible(false);
      // After fade-out completes, swap text then fade in
      setTimeout(() => {
        setIdx((i) => (i + 1) % REMINDERS.length);
        setVisible(true);
      }, 700);
    }, 5000);
    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="mt-8 flex items-start justify-center gap-2 min-h-[2rem]">
      <span className="mt-0.5 shrink-0 w-1 h-1 rounded-full bg-purple-400/60 inline-block" />
      <p
        style={{ transition: "opacity 0.7s ease, transform 0.7s ease" }}
        className={`text-xs text-zinc-400 dark:text-zinc-500 text-center max-w-xs leading-relaxed italic
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
        `}
      >
        {REMINDERS[idx]}
      </p>
    </div>
  );
}

const STEPS = [
  { key: "downloading",  label: "Downloading",  desc: "Fetching video from YouTube" },
  { key: "transcribing", label: "Transcribing",  desc: "Converting speech to text" },
  { key: "analyzing",    label: "AI Analysis",   desc: "Selecting the best viral moments" },
  { key: "rendering",    label: "Rendering",     desc: "Generating your clip files" },
];

export default function ProgressBar({ status }: { status: string }) {
  const raw = STEPS.findIndex((s) => s.key === status);
  const idx = raw === -1 ? 0 : raw;

  return (
    <div className="w-full max-w-2xl mx-auto py-10">
      {/* Step row */}
      <div className="relative flex items-start mb-10">
        {/* Full track */}
        <div className="absolute top-5 left-[12.5%] w-3/4 h-px bg-zinc-200 dark:bg-zinc-800" />
        {/* Filled progress */}
        <div
          className="absolute top-5 left-[12.5%] h-px bg-purple-500 transition-[width] duration-700 ease-out"
          style={{ width: `${(idx / (STEPS.length - 1)) * 75}%` }}
        />

        {STEPS.map((step, i) => {
          const done   = idx > i;
          const active = idx === i;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center z-10">
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
                  ${done   ? "bg-purple-600 border-purple-600 shadow-lg shadow-purple-500/40" : ""}
                  ${active ? "bg-transparent border-purple-500 shadow-lg shadow-purple-500/30" : ""}
                  ${!done && !active ? "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700" : ""}
                `}
              >
                {done && <CheckCircle2 className="w-[18px] h-[18px] text-white" />}
                {active && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inset-0 rounded-full bg-purple-400 opacity-75" />
                    <span className="relative rounded-full h-3 w-3 bg-purple-500" />
                  </span>
                )}
                {!done && !active && (
                  <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-3 text-xs font-medium text-center transition-colors
                  ${active ? "text-purple-400" : done ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-600"}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current action */}
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {STEPS[idx]?.desc}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          This may take a few minutes depending on video length
        </p>
      </div>

      <ReminderTicker />
    </div>
  );
}
