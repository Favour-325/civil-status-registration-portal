"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

const COLORS = {
  pageBgFrom: "#4C6B78",
  pageBgTo: "#33454E",
  cardBg: "#FFFFFF",
  heading: "#33454E",
  body: "#5B6E77",
  label: "#4C6B78",
  border: "#DCE3E5",
  accent: "#C1633B",
  accentSoft: "#FBEAE1",
};

export default function EmailVerificationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSending(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${API_URL}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send verification code");
      }

      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setSending(false);
    }
  }

  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${COLORS.pageBgFrom}, ${COLORS.pageBgTo})`,
      }}
      className="flex min-h-screen w-full items-center justify-center px-6 py-16"
    >
      <div
        style={{ backgroundColor: COLORS.cardBg }}
        className="w-full max-w-md rounded-2xl px-8 py-12 text-center shadow-2xl sm:px-10"
      >
        <div
          style={{ backgroundColor: COLORS.accentSoft }}
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl"
        >
          <Mail size={26} color={COLORS.accent} />
        </div>

        <h1 style={{ color: COLORS.heading }} className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">
          Verify your email
        </h1>
        <p style={{ color: COLORS.body }} className="mb-8 text-sm sm:text-base">
          Enter your email and we&apos;ll send you a 6-digit verification code.
        </p>

        <form onSubmit={handleSubmit} className="text-left">
          <label
            style={{ color: COLORS.label }}
            className="mb-2 block text-xs font-bold tracking-[0.08em] uppercase"
          >
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ borderColor: COLORS.border, color: COLORS.heading }}
            className="mb-2 w-full border-0 border-b bg-transparent pb-3 text-base focus:border-b-2 focus:outline-none"
            autoFocus
          />
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            style={{ backgroundColor: COLORS.accent }}
            className="mt-8 w-full rounded-lg py-3 text-base font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      </div>
    </div>
  );
}
