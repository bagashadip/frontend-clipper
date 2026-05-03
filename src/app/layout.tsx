import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "AI Video Clipper",
  description: "Turn YouTube videos into viral short-form clips",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-white antialiased transition-colors">
        <ThemeProvider>
          {children}
        </ThemeProvider>

        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          strategy="lazyOnload"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        />
      </body>
    </html>
  );
}
