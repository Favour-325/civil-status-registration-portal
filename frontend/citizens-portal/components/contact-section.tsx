"use client";

import { useState } from "react";

const COLORS = {
  bg: "#4C6B78",
  eyebrow: "#C9A876",
  heading: "#FFFFFF",
  body: "#A9C2CA",
  inputText: "#CFE0E5",
  inputLine: "#6E8993",
  accent: "#C1633B",
  accentHover: "#AD5530",
};

export default function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        // The server validates and rate-limits; its message is more useful than
        // a blanket "something went wrong".
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Could not send your message (${res.status})`);
      }

      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section id="contact-us"
      style={{ backgroundColor: COLORS.bg }}
      className="w-full px-6 py-24 md:px-16 lg:px-24 font-sans"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 md:grid-cols-2 md:gap-24">
        <div className="flex flex-col justify-center">
          <span
            style={{ color: COLORS.eyebrow }}
            className="mb-4 text-sm font-semibold tracking-[0.15em] uppercase"
          >
            Get in Touch
          </span>

          <h2
            style={{ color: COLORS.heading }}
            className="mb-6 text-4xl font-heading leading-tight md:text-5xl"
          >
            We&apos;re Here to Help
          </h2>

          <p
            style={{ color: COLORS.body }}
            className="mb-10 max-w-md text-base leading-relaxed md:text-lg"
          >
            Have questions about your application or need assistance with
            civil status documentation? Reach out and our team will respond
            promptly.
          </p>

          <div className="space-y-2 text-sm md:text-base" style={{ color: COLORS.body }}>
            <p>Phone: +237 672-555-199</p>
            <p>Email: contact@ccsr.cm</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col justify-center gap-8">
          <FormField
            label="Full Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <FormField
            label="Email Address"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <FormField
            label="Subject"
            name="subject"
            value={form.subject}
            onChange={handleChange}
          />
          <FormField
            label="Your Message"
            name="message"
            value={form.message}
            onChange={handleChange}
            textarea
            required
          />

          <button
            type="submit"
            disabled={status === "sending"}
            style={{ backgroundColor: COLORS.accent }}
            className="mt-2 flex items-center justify-center gap-2 rounded-md px-8 py-4 text-base font-semibold text-white transition-colors duration-200 hover:brightness-95 disabled:opacity-70"
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = COLORS.accentHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = COLORS.accent)
            }
          >
            {status === "sending" ? "Sending..." : "Send Message"}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>

          {status === "sent" && (
            <p className="text-sm text-emerald-300">
              Message sent — we&apos;ve emailed you a confirmation and a civil agent
              will treat it as soon as possible.
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

type FormFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
};

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  textarea = false,
}: FormFieldProps) {
  const sharedClasses =
    "w-full bg-transparent border-0 border-b pb-3 text-base focus:outline-none focus:border-white/80 transition-colors placeholder-current";

  return (
    <div className="relative">
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={label}
          rows={3}
          style={{
            color: "#E4EEF1",
            borderColor: "#6E8993",
          }}
          className={sharedClasses + " resize-none"}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={label}
          style={{
            color: "#E4EEF1",
            borderColor: "#6E8993",
          }}
          className={sharedClasses}
        />
      )}
    </div>
  );
}
