"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";

const COLORS = {
  pageBgFrom: "#4C6B78",
  pageBgTo: "#33454E",
  cardBg: "#FFFFFF",
  heading: "#33454E",
  body: "#5B6E77",
  border: "#DCE3E5",
  accent: "#C1633B",
  accentSoft: "#FBEAE1",
};

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

function OTPVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleChange(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError("");

    if (clean && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((char, i) => (next[i] = char));
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${API_URL}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid code");
      }

      const data = await res.json();
      // Store the session token in localStorage for the AuthGuard to find
      localStorage.setItem('session_token', data.sessionToken);

      router.push("/verified");
    } catch (err: any) {
      setError(err.message || "That code didn't match. Please try again.");
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN);
    setDigits(Array(CODE_LENGTH).fill(""));
    setError("");
    inputRefs.current[0]?.focus();

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${API_URL}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        // The server rate-limits independently of the client cooldown, so a
        // resend can be refused even when the timer says it's allowed.
        const data = await res.json().catch(() => ({}));
        const retryAfter = Number(res.headers.get("Retry-After"));
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          setCooldown(retryAfter);
        }
        throw new Error(data.message || "Failed to resend code");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to resend code. Please try again.");
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
          Your 6-digit code was sent to{" "}
          <span style={{ color: COLORS.heading }} className="font-medium">
            {email || "your email"}
          </span>
        </p>

        <div className="mb-2 flex justify-center gap-2 sm:gap-3">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              style={{
                borderColor: digit ? COLORS.accent : COLORS.border,
                color: COLORS.heading,
              }}
              className="h-12 w-11 rounded-lg border-2 text-center text-lg font-semibold focus:border-2 focus:outline-none sm:h-14 sm:w-12"
            />
          ))}
        </div>
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleVerify}
          disabled={verifying}
          style={{ backgroundColor: COLORS.accent }}
          className="mt-8 w-full rounded-lg py-3 text-base font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60"
        >
          {verifying ? "Verifying..." : "Verify"}
        </button>

        <p style={{ color: COLORS.body }} className="mt-6 text-sm">
          Didn&apos;t receive the code?{" "}
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            style={{ color: cooldown > 0 ? COLORS.body : COLORS.accent }}
            className="font-semibold disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Request again in ${cooldown}s` : "Request again"}
          </button>
        </p>
      </div>
    </div>
  );
}

// useSearchParams must sit under a Suspense boundary for the static export build.
export default function OTPVerificationPage() {
  return (
    <Suspense fallback={null}>
      <OTPVerification />
    </Suspense>
  );
}
