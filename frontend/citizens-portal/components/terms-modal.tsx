"use client";

import { useState } from "react";

const COLORS = {
  overlay: "rgba(30, 41, 48, 0.6)",
  modalBg: "#FFFFFF",
  heading: "#33454E",
  bodyText: "#5B6E77",
  border: "#E7E2D8",
  shield: "#C1633B",
  accent: "#C1633B",
  accentDisabled: "#E3AC96",
  cancelBorder: "#D7DEE1",
  cancelText: "#33454E",
};

type TermsModalProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
};

export function TermsModal({ open, onClose, onAccept }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  return (
    <div
      style={{ backgroundColor: COLORS.overlay }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: COLORS.modalBg }}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{ borderColor: COLORS.border }}
          className="flex items-center justify-between border-b px-8 py-6"
        >
          <div className="flex items-center gap-3">
            <ShieldIcon color={COLORS.shield} />
            <h2
              style={{ color: COLORS.heading }}
              className="font-serif text-2xl font-semibold"
            >
              Terms &amp; Policies
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ color: COLORS.heading }}
            className="rounded-full p-1 transition-opacity hover:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-8 py-6">
          <p style={{ color: COLORS.bodyText }} className="mb-6 text-base">
            Please review and accept the following terms before proceeding
            with your application.
          </p>

          <TermSection
            title="1. Accuracy of Information"
            body="I confirm that all information provided in this application is true, accurate, and complete to the best of my knowledge. Providing false or misleading information may result in rejection of the application and legal penalties."
          />
          <TermSection
            title="2. Supporting Documents"
            body="I understand that uploaded documents must be valid, legible, and official. The registry reserves the right to request additional documentation or verified originals during the review period."
          />
          <TermSection
            title="3. Data Privacy & Protection"
            body="My personal data will be processed in accordance with the Civil Registry Privacy Policy. Information is stored securely and used solely for the purpose of issuing civil status documents."
            last
          />
        </div>

        {/* Footer */}
        <div
          style={{ borderColor: COLORS.border }}
          className="flex flex-col gap-5 border-t px-8 py-6"
        >
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ accentColor: COLORS.accent }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span style={{ color: COLORS.heading }}>
              I have read and agree to the Terms &amp; Policies
            </span>
          </label>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              style={{ borderColor: COLORS.cancelBorder, color: COLORS.cancelText }}
              className="flex-1 rounded-lg border py-3 text-base font-medium transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!agreed}
              style={{
                backgroundColor: agreed ? COLORS.accent : COLORS.accentDisabled,
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed"
            >
              Accept &amp; Continue
              <CheckCircleIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermSection({
  title,
  body,
  last = false,
}: {
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-6"}>
      <h3 style={{ color: COLORS.heading }} className="mb-2 text-base font-bold">
        {title}
      </h3>
      <p style={{ color: COLORS.bodyText }} className="text-base leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5l-8-3Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
