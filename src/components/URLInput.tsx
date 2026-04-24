"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

interface URLInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function URLInput({ onSubmit, isLoading }: URLInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
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
          disabled={isLoading || !url.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 
                     bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 
                     disabled:cursor-not-allowed rounded-xl font-semibold 
                     text-white transition-all flex items-center gap-2"
        >
          <Zap className="w-5 h-5" />
          {isLoading ? "Processing..." : "Generate Clips"}
        </button>
      </div>
    </form>
  );
}
