import { FileText, Shield, Clock, CheckCircle2, type LucideIcon } from "lucide-react";

const COLORS = {
  bg: "#F2ECD9",       // Pearl Beige
  eyebrow: "#C1633B",  // Burnt Peach
  heading: "#33454E",  // Blue Slate
  body: "#5B6E77",
  iconBg: "#FFFFFF",
  iconColor: "#C1633B",
  activeIconBg: "#C1633B",
  activeIconColor: "#FFFFFF",
};

type Step = {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const STEPS: Step[] = [
  {
    step: "Step 1",
    title: "Gather Documents",
    description:
      "Collect valid identification and supporting records required for your certificate type.",
    icon: FileText,
  },
  {
    step: "Step 2",
    title: "Submit Application",
    description:
      "Complete the guided online form with accurate details and upload your documents securely.",
    icon: Shield,
  },
  {
    step: "Step 3",
    title: "Processing",
    description:
      "Applications are reviewed within 2–3 business days.",
    icon: Clock,
  },
  {
    step: "Step 4",
    title: "Receive Certificate",
    description:
      "Once approved, your official certificate is ready for pickup or delivery to your address.",
    icon: CheckCircle2,
  },
];

export default function ApplicationProcess() {
  return (
    <section style={{ backgroundColor: COLORS.bg }} className="w-full px-6 py-20 md:px-16 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <span
          style={{ color: COLORS.eyebrow }}
          className="mb-4 block text-sm font-semibold tracking-[0.15em] uppercase"
        >
          How It Works
        </span>

        <h2
          style={{ color: COLORS.heading }}
          className="mb-16 font-serif text-4xl md:text-5xl"
        >
          Application Process
        </h2>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ step, title, description, icon: Icon }) => (
            <div key={step} className="group">
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl text-[#C1633B] shadow-sm transition-colors duration-300 ease-out bg-white group-hover:bg-[#C1633B] group-hover:text-white"
              >
                <Icon size={26} strokeWidth={2} color="currentColor" />
              </div>

              <span
                style={{ color: COLORS.eyebrow }}
                className="mb-2 block text-xs font-semibold tracking-[0.15em] uppercase"
              >
                {step}
              </span>

              <h3
                style={{ color: COLORS.heading }}
                className="mb-3 text-xl font-bold"
              >
                {title}
              </h3>

              <p style={{ color: COLORS.body }} className="text-base leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
