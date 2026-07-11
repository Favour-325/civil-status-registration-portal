"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";

const COLORS = {
  pageBgFrom: "#4C6B78",
  pageBgTo: "#33454E",
  cardBg: "#FFFFFF",
  heading: "#33454E",
  body: "#5B6E77",
  accent: "#C1633B",
};

export default function EmailVerifiedPage() {
  const router = useRouter();

  return (
    <AuthGuard>
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
            style={{ backgroundColor: COLORS.accent }}
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
          >
            <CheckCircle2 size={28} color="#FFFFFF" />
          </div>

          <h1 style={{ color: COLORS.heading }} className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">
            Email Verified
          </h1>
          <p style={{ color: COLORS.body }} className="mb-8 text-sm sm:text-base">
            Your email has been successfully verified. You can now continue with
            your application.
          </p>

          <button
            onClick={() => router.push("/apply")}
            style={{ backgroundColor: COLORS.accent }}
            className="w-full rounded-lg py-3 text-base font-semibold text-white transition-colors hover:brightness-95"
          >
            Continue to Application
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
