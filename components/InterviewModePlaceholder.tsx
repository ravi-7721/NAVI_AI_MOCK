import Link from "next/link";
import {
  Code2,
  Layers3,
  Lock,
  MonitorPlay,
  type LucideIcon,
} from "lucide-react";

type DisabledInterviewMode = "full-loop" | "video" | "live-coding";

interface InterviewModePlaceholderProps {
  mode: DisabledInterviewMode;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

const MODE_COPY: Record<
  DisabledInterviewMode,
  {
    icon: LucideIcon;
    badge: string;
    title: string;
    description: string;
    chips: [string, string];
  }
> = {
  "full-loop": {
    icon: Layers3,
    badge: "Mode Removed",
    title: "Full Loop is no longer available",
    description:
      "This combined interview flow has been removed from the active interview module. Only the core practice rounds remain available for live use.",
    chips: ["Removed from selection", "No live session"],
  },
  video: {
    icon: MonitorPlay,
    badge: "Preview Only",
    title: "Video Interview is currently disabled",
    description:
      "Camera capture, microphone-driven questioning, replay generation, and live video practice are turned off. This module is now a static placeholder only.",
    chips: ["Module hardcoded", "No live session"],
  },
  "live-coding": {
    icon: Code2,
    badge: "Preview Only",
    title: "Live Coding is currently disabled",
    description:
      "Challenge setup, editor workflow, code checks, and live coding execution are turned off. This module is now a static placeholder only.",
    chips: ["Module hardcoded", "No code execution"],
  },
};

const InterviewModePlaceholder = ({
  mode,
  primaryHref = "/interview?round=technical",
  primaryLabel = "Open Technical Round",
  secondaryHref = "/interview?round=hr",
  secondaryLabel = "Open HR Round",
}: InterviewModePlaceholderProps) => {
  const copy = MODE_COPY[mode];
  const Icon = copy.icon;

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,40,0.96),rgba(9,12,21,0.96))] p-6 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr] lg:items-start">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
            <Lock className="size-4" />
            {copy.badge}
          </span>

          <div className="mt-5 flex items-start gap-4">
            <span className="inline-flex rounded-2xl border border-white/12 bg-black/25 p-3 text-white">
              <Icon className="size-5" />
            </span>

            <div>
              <h2>{copy.title}</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-light-100">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {copy.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-light-100"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-light-400">Status</p>
          <p className="mt-3 text-white">
            This interview lane is intentionally inactive and no interactive session will start
            from here.
          </p>
          <p className="mt-2 text-sm leading-6 text-light-400">
            Use the active HR, Technical, or Managerial rounds when you want a working practice
            flow.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col">
            {primaryHref ? (
              <Link href={primaryHref} className="btn-primary text-center">
                {primaryLabel}
              </Link>
            ) : null}
            {secondaryHref ? (
              <Link href={secondaryHref} className="btn-secondary text-center">
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InterviewModePlaceholder;
