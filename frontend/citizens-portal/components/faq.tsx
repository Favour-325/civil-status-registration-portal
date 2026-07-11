"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const COLORS = {
  bg: "#F2ECD9",       // Pearl Beige
  eyebrow: "#C1633B",  // Burnt Peach
  heading: "#33454E",  // Blue Slate
  answer: "#5B6E77",
  divider: "#D8CFB8",
  icon: "#C1633B",
};

type FAQ = {
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  {
    question: "How long does the application process take?",
    answer:
      "Most applications are reviewed within 2–3 business days. You will receive a notification once the document is ready for pickup.",
  },
  {
    question: "Who is eligible to apply for a marriage certificate?",
    answer:
      "Either spouse may apply, provided both parties' identification documents and proof of the marriage ceremony are submitted with the application.",
  },
  {
    question: "Is there a fee for certificate applications?",
    answer:
      "Yes, a standard processing fee applies per certificate type. The exact amount is shown at checkout before you submit your application.",
  },
  {
    question: "What if my application is rejected?",
    answer:
      "You'll receive a notification explaining the reason for rejection along with guidance on how to correct and resubmit your application.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section style={{ backgroundColor: COLORS.bg }} className="w-full px-6 py-24 md:px-16 lg:px-24">
      <div className="mx-auto max-w-4xl">
        <span
          style={{ color: COLORS.eyebrow }}
          className="mb-4 block text-sm font-semibold tracking-[0.15em] uppercase"
        >
          Common Questions
        </span>

        <h2
          style={{ color: COLORS.heading }}
          className="mb-16 text-4xl leading-tight md:text-5xl"
        >
          Frequently Asked
          <br />
          Questions
        </h2>

        <div>
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.question}
                style={{ borderColor: COLORS.divider }}
                className="border-b"
              >
                <button
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span
                    style={{ color: COLORS.heading }}
                    className="text-lg md:text-xl"
                  >
                    {faq.question}
                  </span>

                  <Plus
                    size={22}
                    color={COLORS.icon}
                    strokeWidth={2.5}
                    className="shrink-0 transition-transform duration-300 ease-out"
                    style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                  />
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: isOpen ? "240px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <p
                    style={{ color: COLORS.answer }}
                    className="max-w-3xl pb-6 text-base leading-relaxed"
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
