"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { verifyPayment } from "@/lib/api";

const TIERS = [
  {
    id: "pro",
    name: "Pro",
    price: 99000,
    priceLabel: "Rp 99.000 / month",
    description: "Perfect for content creators who need more quota.",
    features: [
      "Up to 5 hours of processing time",
      "Priority GPU rendering",
      "1080p Export Quality",
      "Custom Watermark",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 249000,
    priceLabel: "Rp 249.000 / month",
    description: "For agencies and power users.",
    features: [
      "Up to 20 hours of processing time",
      "Dedicated GPU rendering",
      "4K Export Quality",
      "API Access",
    ],
  },
];

export function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubscribe = async (tierId: string, price: number) => {
    try {
      setLoading(tierId);
      setError(null);
      setSuccess(false);

      // Call the backend API to generate the Midtrans snap token
      const res = await fetch("/api/payment/snap-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        onSuccess: async function (result: { order_id?: string }) {
          console.log("Payment success:", result);
          // Verify with our backend so the upgrade applies even if the
          // webhook URL isn't reachable from Midtrans.
          try {
            if (result?.order_id) {
              await verifyPayment(result.order_id);
            }
            setSuccess(true);
            // Reload so the app shell picks up the new tier from /auth/me.
            setTimeout(() => window.location.reload(), 1500);
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            setSuccess(true);
          }
        },
        onPending: function (result: any) {
          console.log("Payment pending:", result);
          alert("Payment is pending. Please complete the transaction.");
        },
        onError: function (result: any) {
          console.log("Payment error:", result);
          setError("Payment failed. Please try again.");
        },
        onClose: function () {
          console.log("Payment popup closed without finishing the payment");
          setError("Payment was cancelled.");
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12 bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-xl text-zinc-500 dark:text-zinc-400">
            Upgrade your plan to unlock more processing time and features.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-lg text-center max-w-2xl mx-auto">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-8 p-4 bg-green-100 text-green-800 rounded-lg text-center max-w-2xl mx-auto border border-green-200">
            <Check className="inline-block h-5 w-5 mr-2" />
            Payment successful! Your account is being upgraded. The changes will reflect shortly.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 bg-zinc-50 dark:bg-zinc-900 flex flex-col transition-all hover:border-blue-500"
            >
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {tier.name}
              </h3>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                {tier.description}
              </p>
              <div className="mt-6 text-4xl font-bold text-zinc-900 dark:text-white">
                {tier.priceLabel}
              </div>
              
              <ul className="mt-8 space-y-4 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <Check className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.id, tier.price)}
                disabled={loading === tier.id}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === tier.id ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Processing...
                  </>
                ) : (
                  "Upgrade Now"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
