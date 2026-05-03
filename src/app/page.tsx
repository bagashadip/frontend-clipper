"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Link as LinkIcon,
  Sparkles,
  Download,
  Check,
  ArrowRight,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import Image from "next/image";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

import { useTheme } from "@/components/ThemeProvider";

export default function LandingPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}

function LandingPage() {
  const [url, setUrl] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Capture token from OAuth callback redirect
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, "", "/");
    }

    const isLoggedIn = !!localStorage.getItem("token");
    setLoggedIn(isLoggedIn);

    // Resume pending purchase after OAuth redirect
    if (isLoggedIn) {
      const pendingPurchase = localStorage.getItem("pending_purchase");
      if (pendingPurchase) {
        localStorage.removeItem("pending_purchase");
        const { tier_id, price } = JSON.parse(pendingPurchase);
        // Delay to allow Snap JS to load
        setTimeout(() => handleSubscribe(tier_id, price), 1500);
      }
    }
  }, [searchParams]);

  const handleGenerate = () => {
    if (loggedIn) {
      const params = url ? `?url=${encodeURIComponent(url)}` : "";
      router.push(`/app${params}`);
    } else {
      window.location.href = `${BACKEND_URL}/auth/login`;
    }
  };

  const handleLogin = () => {
    if (loggedIn) {
      router.push("/app");
    } else {
      window.location.href = `${BACKEND_URL}/auth/login`;
    }
  };

  const handleSubscribe = async (tierId: string, price: number) => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      // Save purchase intent so we can resume after login
      localStorage.setItem("pending_purchase", JSON.stringify({ tier_id: tierId, price }));
      window.location.href = `${BACKEND_URL}/auth/login`;
      return;
    }
    
    try {
      setLoadingTier(tierId);
      setPaymentError(null);
      setPaymentSuccess(false);

      setPaymentSuccess(false);

      // Call our backend API to generate the Midtrans snap token
      const res = await fetch(`${BACKEND_URL}/api/payment/snap-token`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({ tier_id: tierId, amount: price }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate payment token. Please try again.");
      }

      const data = await res.json();
      const snapToken = data.snap_token;

      if (!snapToken) {
        throw new Error("Invalid token received from server.");
      }

      // Trigger Midtrans Snap Popup
      window.snap.pay(snapToken, {
        onSuccess: function (result: any) {
          console.log("Payment success:", result);
          setPaymentSuccess(true);
        },
        onPending: function (result: any) {
          console.log("Payment pending:", result);
          alert("Payment is pending. Please complete the transaction.");
        },
        onError: function (result: any) {
          console.log("Payment error:", result);
          setPaymentError("Payment failed. Please try again.");
        },
        onClose: function () {
          console.log("Payment popup closed without finishing the payment");
          setPaymentError("Payment was cancelled.");
        },
      });
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.message || "An unexpected error occurred.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-[#0a0a0a]/80 border-b border-zinc-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <a href="/" className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-600/20 rounded-lg">
              <Image src="/assets/zclip-icon.png" alt="Logo" width={20} height={20} className="w-10 h-10" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              ZClip <span className="text-purple-400">AI</span>
            </span>
          </a>

          <div className="flex items-center gap-6">
            <a
              href="#pricing"
              className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors hidden sm:block"
            >
              Pricing
            </a>
            <button
              onClick={toggleTheme}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogin}
              className="group flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 px-4 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-600/10 transition-all"
            >
              {loggedIn ? "Go to App" : "Login"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-24">
        {/* Badge */}
        <div className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 text-purple-300 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by AI
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center max-w-3xl leading-[1.1]">
          Ubah Video YouTube
          <br />
          Jadi{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Klip Viral
          </span>
        </h1>

        <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg mt-6 mb-10 text-center max-w-xl leading-relaxed">
          Paste link YouTube, AI kami otomatis pilih momen terbaik, crop ke 9:16,
          dan tambahkan caption. Siap upload ke TikTok, Reels &amp; Shorts.
        </p>

        {/* Fake URL Input */}
        <div className="w-full max-w-xl flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors shrink-0"
          >
            Generate
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-zinc-600 text-xs mt-4">
          30 menit gratis — tidak perlu kartu kredit
        </p>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-20 bg-zinc-50 dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Cara Kerja
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-14 max-w-lg mx-auto">
            Tiga langkah sederhana dari video panjang ke klip viral
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: LinkIcon,
                step: "01",
                title: "Paste URL",
                desc: "Masukkan link video YouTube yang ingin kamu potong.",
              },
              {
                icon: Sparkles,
                step: "02",
                title: "AI Magic",
                desc: "AI menganalisis transkrip & memilih momen paling viral.",
              },
              {
                icon: Download,
                step: "03",
                title: "Download Clips",
                desc: "Preview, edit caption, lalu download klip 9:16 siap upload.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-2xl p-8 hover:border-purple-400 dark:hover:border-purple-500/30 transition-all"
              >
                <span className="text-5xl font-black text-zinc-100 dark:text-white/[0.03] absolute top-4 right-6 group-hover:text-purple-100 dark:group-hover:text-purple-500/10 transition-colors">
                  {item.step}
                </span>
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-purple-600/10 mb-5">
                  <item.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Pricing
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center mb-14 max-w-lg mx-auto">
            Mulai gratis, upgrade kapan saja
          </p>

          {paymentError && (
            <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-lg text-center max-w-2xl mx-auto">
              {paymentError}
            </div>
          )}

          {paymentSuccess && (
            <div className="mb-8 p-4 bg-green-100 text-green-800 rounded-lg text-center max-w-2xl mx-auto border border-green-200">
              <Check className="inline-block h-5 w-5 mr-2" />
              Payment successful! Your account is being upgraded. The changes will reflect shortly.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Trial */}
            <div className="bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-2xl p-8 flex flex-col">
              <h3 className="text-lg font-semibold mb-1">Free Trial</h3>
              <p className="text-zinc-500 text-sm mb-6">
                Coba tanpa komitmen
              </p>
              <div className="mb-8">
                <span className="text-4xl font-bold">Rp 0</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "30 menit processing quota",
                  "Watermark included",
                  "Auto caption",
                  "720p export",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                    <Check className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleLogin}
                className="w-full border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white font-medium py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Pro Tier */}
            <div className="relative bg-gradient-to-b from-purple-50 to-white dark:from-purple-600/10 dark:to-[#0a0a0a] border border-purple-300 dark:border-purple-500/30 rounded-2xl p-8 flex flex-col">
              <div className="absolute -top-3 left-8 bg-purple-600 text-xs font-semibold px-3 py-1 rounded-full">
                Popular
              </div>
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <p className="text-zinc-500 text-sm mb-6">
                Untuk kreator serius
              </p>
              <div className="mb-8">
                <span className="text-4xl font-bold">Rp 99.000</span>
                <span className="text-zinc-500 text-sm"> / bulan</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "10 jam processing quota",
                  "No watermark",
                  "Auto caption",
                  "1080p export",
                  "Priority processing",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                    <Check className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("pro", 99000)}
                disabled={loadingTier === "pro"}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loadingTier === "pro" ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Processing...
                  </>
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 dark:border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/assets/zclip-icon.png" alt="Logo" width={16} height={16} className="w-4 h-4" />
            <span className="text-sm font-semibold">ZClip AI</span>
          </div>
          <p className="text-xs text-zinc-600">
            © 2026 ZClip AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
