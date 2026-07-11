"use client";

import { useState, useEffect } from "react";

const COLORS = {
  eyebrow: "#C1633B",
  heading: "#33454E",
  cardEyebrow: "#E9CBA5",
  cardText: "#F1EDE4",
};

type Application = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  ctaHref: string;
};

const APPLICATIONS: Application[] = [
  {
    id: "birth",
    eyebrow: "Civil Registration",
    title: "Birth Certificate",
    description:
      "Apply for an official birth certificate for yourself or a family member. Required documents include valid identification and proof of relationship.",
    image: "/baby.jpg",
    ctaHref: "/birth",
  },
  {
    id: "marriage",
    eyebrow: "Civil Registration",
    title: "Marriage Certificate",
    description:
      "Request an official marriage certificate. Both parties' identification documents and proof of marriage ceremony are required.",
    image: "/marriage.jpg",
    ctaHref: "/marriage",
  },
];

export default function ApplicationCardGrid() {
  const [hovered, setHovered] = useState<string | null>(null);
  // Defaults to false (mobile-safe) so SSR and first paint never risk
  // applying the desktop flex-grow/shrink trick on a column layout.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section className="w-full bg-white px-6 py-20 md:px-16 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <span
          style={{ color: COLORS.eyebrow }}
          className="mb-4 block text-sm font-semibold tracking-[0.15em] uppercase"
        >
          Get Started
        </span>

        <h2
          style={{ color: COLORS.heading }}
          className="mb-12 font-serif text-4xl md:text-5xl"
        >
          Choose Your Application
        </h2>

        {/* grid stacks full-width rows on mobile; becomes a flex row on md+
            so the desktop flex-grow/shrink math only ever applies there */}
        <div className="grid grid-cols-1 gap-6 md:flex md:flex-row">
          {APPLICATIONS.map((app) => {
            const isHovered = isDesktop && hovered === app.id;
            const isOtherHovered = isDesktop && hovered !== null && !isHovered;
            // On mobile there's no hover to react to, so content is just
            // always shown expanded rather than faking a hover state.
            const showExpanded = isDesktop ? isHovered : true;

            return (
              <a
                key={app.id}
                href={app.ctaHref}
                onMouseEnter={() => isDesktop && setHovered(app.id)}
                onMouseLeave={() => isDesktop && setHovered(null)}
                className="relative block h-[440px] overflow-hidden rounded-lg transition-all duration-500 ease-out md:h-[400px] lg:h-[500px]"
                style={
                  isDesktop
                    ? {
                        flexGrow: isHovered ? 1.6 : isOtherHovered ? 0.7 : 1,
                        flexBasis: 0,
                      }
                    : undefined
                }
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out"
                  style={{
                    backgroundImage: `url(${app.image})`,
                    transform: isHovered ? "scale(1.05)" : "scale(1)",
                  }}
                />

                {/* Dark gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Text content, pinned to bottom, grows upward on hover (desktop only) */}
                <div className="absolute inset-x-0 bottom-0 px-8 pb-8">
                  <span
                    style={{ color: COLORS.cardEyebrow }}
                    className="mb-2 block text-xs font-semibold tracking-[0.15em] uppercase"
                  >
                    {app.eyebrow}
                  </span>

                  <h3 className="mb-3 font-serif text-3xl font-semibold text-white md:text-4xl">
                    {app.title}
                  </h3>

                  {/* Expanding detail panel — animated on desktop hover,
                      permanently open (no transition) on mobile */}
                  <div
                    className="overflow-hidden transition-all duration-500 ease-out"
                    style={{
                      maxHeight: showExpanded ? "200px" : "0px",
                      opacity: showExpanded ? 1 : 0,
                    }}
                  >
                    <p
                      style={{ color: COLORS.cardText }}
                      className="mb-4 max-w-md text-sm leading-relaxed md:text-base"
                    >
                      {app.description}
                    </p>

                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white md:text-base">
                      Start Application
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
