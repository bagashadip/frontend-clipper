"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Link as LinkIcon, Sparkles, Download, Check, ArrowRight, Loader2,
  Sun, Moon, Captions, ScanFace, Crop, Zap, Mic, ShoppingBag, Gamepad2,
  ChevronDown, Play,
} from "lucide-react";
import Image from "next/image";
import { fetchSnapToken } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function LandingPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>}>
      <LandingPage />
    </Suspense>
  );
}

function LandingPage() {
  const [url, setUrl] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, "", "/");
    }
    const isLoggedIn = !!localStorage.getItem("token");
    setLoggedIn(isLoggedIn);
    if (isLoggedIn) {
      const pendingPurchase = localStorage.getItem("pending_purchase");
      if (pendingPurchase) {
        localStorage.removeItem("pending_purchase");
        const { tier_id, price } = JSON.parse(pendingPurchase);
        setTimeout(() => handleSubscribe(tier_id, price), 1500);
      }
    }
  }, [searchParams]);

  const handleGenerate = () => {
    if (loggedIn) {
      router.push(`/app${url ? `?url=${encodeURIComponent(url)}` : ""}`);
    } else {
      window.location.href = `${BACKEND_URL}/auth/login`;
    }
  };

  const handleLogin = () => {
    if (loggedIn) router.push("/app");
    else window.location.href = `${BACKEND_URL}/auth/login`;
  };

  const handleSubscribe = async (tierId: string, price: number) => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      localStorage.setItem("pending_purchase", JSON.stringify({ tier_id: tierId, price }));
      window.location.href = `${BACKEND_URL}/auth/login`;
      return;
    }
    try {
      setLoadingTier(tierId);
      setPaymentError(null);
      setPaymentSuccess(false);
      const snapToken = await fetchSnapToken(tierId, price);
      window.snap.pay(snapToken, {
        onSuccess: () => setPaymentSuccess(true),
        onPending: () => alert("Payment is pending. Please complete the transaction."),
        onError: () => setPaymentError("Payment failed. Please try again."),
        onClose: () => setPaymentError("Payment was cancelled."),
      });
    } catch (err: any) {
      setPaymentError(err.message || "An unexpected error occurred.");
    } finally {
      setLoadingTier(null);
    }
  };

  const bentoFeatures = [
    { icon: Captions, title: "AI Auto-Caption", desc: "Transkripsi Whisper yang akurat dengan animasi kata dinamis. Pilih dari 5+ style caption.", span: "md:col-span-2", accent: "from-purple-500/20 to-transparent" },
    { icon: ScanFace, title: "Smart Face Tracking", desc: "Kamera virtual otomatis mengikuti pembicara utama.", span: "", accent: "from-pink-500/20 to-transparent" },
    { icon: Crop, title: "Instant 9:16 Crop", desc: "Konversi landscape ke portrait secara instan tanpa distorsi.", span: "", accent: "from-blue-500/20 to-transparent" },
    { icon: Zap, title: "AI Virality Score", desc: "Setiap klip diberi skor 0–100 berdasarkan potensi viral-nya.", span: "", accent: "from-yellow-500/20 to-transparent" },
    { icon: Download, title: "Export Langsung", desc: "Download 1080p atau ekspor ke TikTok, Reels & Shorts dengan satu klik.", span: "md:col-span-2", accent: "from-green-500/20 to-transparent" },
  ];

  const useCases = [
    { icon: Mic, label: "Podcaster", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", desc: "Ubah episode podcast panjang menjadi highlight reels yang menarik untuk promosi." },
    { icon: ShoppingBag, label: "Affiliate Marketer", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20", desc: "Potong video review produk menjadi klip pendek yang mendorong konversi." },
    { icon: Gamepad2, label: "Gamer & Streamer", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", desc: "Ekstrak momen terbaik dari sesi gaming atau live stream panjangmu." },
    { icon: Sparkles, label: "Content Creator", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", desc: "Buat konten viral dari video apapun, hanya dengan paste link YouTube." },
  ];

  const faqs = [
    { q: "Apa format video output yang didukung?", a: "ZClip menghasilkan klip 9:16 (portrait) yang dioptimalkan untuk TikTok, Instagram Reels, dan YouTube Shorts. Format 16:9 tersedia di paket Pro." },
    { q: "Apakah ada batasan durasi video YouTube?", a: "Paket Free mendukung video hingga 30 menit. Paket Pro mendukung video hingga 3 jam." },
    { q: "Seberapa akurat AI dalam memilih klip terbaik?", a: "Model AI kami dilatih khusus untuk mengidentifikasi momen dengan engagement tinggi berdasarkan analisis transkrip, energi suara, dan pola konten viral." },
    { q: "Apakah data video saya aman?", a: "Video di-cache di S3 untuk performa, dan hanya dapat diakses oleh akun Anda. Kami tidak menjual atau menggunakan data Anda untuk tujuan lain." },
    { q: "Bisakah saya membatalkan langganan kapan saja?", a: "Ya, tidak ada kontrak. Batalkan kapan saja melalui halaman pengaturan akun Anda." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a]">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-[#0a0a0a]/80 border-b border-zinc-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <a href="/" className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-600/20 rounded-lg">
              <Image src="/assets/zclip-icon.png" alt="Logo" width={40} height={40} className="w-10 h-10" />
            </div>
            <span className="text-lg font-bold tracking-tight">ZClip <span className="text-purple-400">AI</span></span>
          </a>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors hidden sm:block">Pricing</a>
            <button onClick={toggleTheme} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors" title="Toggle theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogin} className="group flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 px-4 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-600/10 transition-all">
              {loggedIn ? "Go to App" : "Login"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(147,51,234,0.15),transparent)]" />
        <div className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 text-purple-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" /> Powered by AI — Whisper + Gemini
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight max-w-4xl leading-[1.05] mb-6">
          Ubah Video YouTube<br />Jadi{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
            Klip Viral
          </span>
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-xl leading-relaxed mb-10">
          Paste link YouTube, AI kami otomatis pilih momen terbaik, crop ke 9:16, dan tambahkan caption. Siap upload ke TikTok, Reels &amp; Shorts.
        </p>

        <div className="w-full max-w-xl flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
          </div>
          <button onClick={handleGenerate} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3.5 rounded-xl transition-all hover:scale-[1.02] shrink-0 shadow-lg shadow-purple-500/25">
            Generate <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-zinc-500 text-xs">30 menit gratis — tidak perlu kartu kredit</p>

        {/* Before/After Mockup */}
        <div className="mt-16 w-full max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl shadow-purple-500/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-zinc-500 ml-2 font-mono">zclip.ai — AI Clip Generator</span>
            </div>
            <div className="flex gap-6 items-center justify-center">
              {/* Before: Landscape */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <span className="text-xs text-zinc-500 font-semibold tracking-widest uppercase">Before</span>
                <div className="w-full aspect-video bg-zinc-800 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                  <Play className="w-12 h-12 text-zinc-600 relative z-10" />
                  <div className="absolute bottom-3 left-3 text-[10px] text-zinc-500 font-mono">16:9 • 47:32</div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] text-purple-400 font-semibold">AI Magic</span>
              </div>

              {/* After: Portrait clips */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-zinc-500 font-semibold tracking-widest uppercase">After</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-16 aspect-[9/16] bg-zinc-800 rounded-lg border border-purple-500/30 flex flex-col items-center justify-end p-1.5 relative overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-b ${i === 2 ? "from-purple-900/50" : "from-zinc-700/50"} to-zinc-900`} />
                      <div className="relative z-10 w-full bg-purple-600/80 rounded text-[7px] text-white text-center py-0.5 font-bold">#{i === 1 ? "viral" : i === 2 ? "fyp" : "shorts"}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">9:16 • 3 clips</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bento Grid Features ── */}
      <section id="features" className="px-6 py-24 bg-zinc-50 dark:bg-white/[0.015]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Semua yang Kamu Butuhkan</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-12 max-w-lg mx-auto">Teknologi AI terdepan dalam satu platform yang simpel.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bentoFeatures.map((f) => (
              <div
                key={f.title}
                className={`${f.span} group relative bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-2xl p-7 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-purple-400 dark:hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10 cursor-default`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-purple-600/10 flex items-center justify-center mb-4 group-hover:bg-purple-600/20 transition-colors">
                    <f.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Dibuat untuk Siapa?</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-12 max-w-lg mx-auto">ZClip dirancang untuk siapapun yang ingin tumbuh di media sosial.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {useCases.map((u) => (
              <div key={u.label} className={`group border ${u.bg} rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg`}>
                <div className={`w-12 h-12 rounded-xl ${u.bg} flex items-center justify-center mb-4`}>
                  <u.icon className={`w-6 h-6 ${u.color}`} />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{u.label}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-24 bg-zinc-50 dark:bg-white/[0.015]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Pertanyaan Umum</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-12">Semua yang ingin kamu ketahui tentang ZClip.</p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-zinc-200 dark:border-white/5 rounded-xl overflow-hidden bg-white dark:bg-white/[0.03]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  {faq.q}
                  <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Pricing</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-12">Mulai gratis, upgrade kapan saja</p>

          {paymentError && (
            <div className="mb-8 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl text-center max-w-2xl mx-auto text-sm">
              {paymentError}
            </div>
          )}
          {paymentSuccess && (
            <div className="mb-8 p-4 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/20 rounded-xl text-center max-w-2xl mx-auto text-sm">
              <Check className="inline-block h-4 w-4 mr-2" />
              Payment successful! Your account is being upgraded. Refresh in a moment to see your new quota.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-2xl p-8 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Free Trial</h3>
              <p className="text-zinc-500 text-sm mb-6">Coba tanpa komitmen</p>
              <div className="mb-8"><span className="text-4xl font-black">Rp 0</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                {["30 menit processing quota", "Watermark included", "Auto caption", "720p export"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                    <Check className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={handleLogin} className="w-full border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white font-semibold py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-b from-purple-50 to-white dark:from-purple-600/10 dark:to-[#0a0a0a] border border-purple-300 dark:border-purple-500/30 rounded-2xl p-8 flex flex-col shadow-xl shadow-purple-500/10">
              <div className="absolute -top-3 left-8 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>
              <h3 className="text-lg font-bold mb-1">Pro</h3>
              <p className="text-zinc-500 text-sm mb-6">Untuk kreator serius</p>
              <div className="mb-8">
                <span className="text-4xl font-black">Rp 99.000</span>
                <span className="text-zinc-500 text-sm"> / bulan</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["10 jam processing quota", "No watermark", "Auto caption", "1080p export", "Priority processing", "Custom crop position"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                    <Check className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("pro", 99000)}
                disabled={loadingTier === "pro"}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center shadow-lg shadow-purple-500/30"
              >
                {loadingTier === "pro" ? <><Loader2 className="animate-spin h-5 w-5 mr-2" />Processing...</> : "Upgrade to Pro"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 dark:border-white/5 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/assets/zclip-icon.png" alt="Logo" width={16} height={16} className="w-4 h-4" />
            <span className="text-sm font-bold">ZClip AI</span>
          </div>
          <p className="text-xs text-zinc-500">© 2026 ZClip AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
