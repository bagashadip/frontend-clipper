"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

const CATEGORIES = [
  { value: "edukasi", label: "Edukasi", emoji: "📚", description: "Educational & insightful" },
  { value: "lucu", label: "Lucu", emoji: "😂", description: "Funny & entertaining" },
  { value: "urgent_panas", label: "Urgent & Panas", emoji: "🔥", description: "Controversial & trending" },
] as const;

interface URLInputProps {
  onSubmit: (url: string, categories: string[]) => void;
  isLoading: boolean;
}

export default function URLInput({ onSubmit, isLoading }: URLInputProps) {
  const [url, setUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && selectedCategories.length > 0) {
      onSubmit(url.trim(), selectedCategories);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-5">
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL here"
          className="w-full px-6 py-5 text-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl 
                     text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 
                     focus:ring-purple-500 focus:border-transparent transition-all
                     pr-44"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim() || selectedCategories.length === 0}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 
                     bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 
                     disabled:cursor-not-allowed rounded-xl font-semibold 
                     text-white transition-all flex items-center gap-2"
        >
          <Zap className="w-5 h-5" />
          {isLoading ? "Processing..." : "Generate Clips"}
        </button>
      </div>

      {/* Category selector */}
      <div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2.5">
          Select clip categories <span className="text-zinc-400 dark:text-zinc-600">(at least one)</span>
        </p>
        <div className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((cat) => {
            const selected = selectedCategories.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                  ${
                    selected
                      ? "border-purple-500 bg-purple-600/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30"
                      : "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
