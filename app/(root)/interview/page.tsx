import Agent from "@/components/Agent";
import InterviewModePlaceholder from "@/components/InterviewModePlaceholder";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getInterviewModes } from "@/lib/actions/general.action";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  Layers3,
  MonitorPlay,
  UserRoundSearch,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

interface PageProps {
  searchParams: Promise<{
    round?: string;
  }>;
}

const MODE_VISUALS: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    kicker: string;
    focus: string;
    glow: string;
    activeCard: string;
    idleCard: string;
    iconActive: string;
    iconIdle: string;
    banner: string;
  }
> = {
  hr: {
    icon: UserRoundSearch,
    kicker: "People Screen",
    focus: "Behavioral fit",
    glow: "bg-transparent",
    activeCard: "border-primary-200/35 bg-white/[0.06] shadow-[0_14px_30px_rgba(0,0,0,0.22)]",
    idleCard: "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]",
    iconActive: "border-primary-200/35 bg-primary-200/10 text-primary-100",
    iconIdle: "border-white/10 bg-black/20 text-light-100",
    banner: "border-white/10 bg-white/[0.045]",
  },
  technical: {
    icon: Wrench,
    kicker: "Core Skills",
    focus: "Implementation depth",
    glow: "bg-transparent",
    activeCard: "border-primary-200/35 bg-white/[0.06] shadow-[0_14px_30px_rgba(0,0,0,0.22)]",
    idleCard: "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]",
    iconActive: "border-primary-200/35 bg-primary-200/10 text-primary-100",
    iconIdle: "border-white/10 bg-black/20 text-light-100",
    banner: "border-white/10 bg-white/[0.045]",
  },
  managerial: {
    icon: BriefcaseBusiness,
    kicker: "Leadership",
    focus: "Ownership signals",
    glow: "bg-transparent",
    activeCard: "border-primary-200/35 bg-white/[0.06] shadow-[0_14px_30px_rgba(0,0,0,0.22)]",
    idleCard: "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]",
    iconActive: "border-primary-200/35 bg-primary-200/10 text-primary-100",
    iconIdle: "border-white/10 bg-black/20 text-light-100",
    banner: "border-white/10 bg-white/[0.045]",
  },
  "full-loop": {
    icon: Layers3,
    kicker: "Complete Run",
    focus: "Mixed evaluation",
    glow: "bg-transparent",
    activeCard: "border-primary-200/35 bg-white/[0.06] shadow-[0_14px_30px_rgba(0,0,0,0.22)]",
    idleCard: "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]",
    iconActive: "border-primary-200/35 bg-primary-200/10 text-primary-100",
    iconIdle: "border-white/10 bg-black/20 text-light-100",
    banner: "border-white/10 bg-white/[0.045]",
  },
  video: {
    icon: MonitorPlay,
    kicker: "Camera On",
    focus: "Voice + presence",
    glow: "bg-rose-400/25",
    activeCard: "border-rose-300/55 bg-rose-400/10 shadow-[0_20px_48px_rgba(244,114,182,0.18)]",
    idleCard: "border-white/10 bg-white/[0.04] hover:border-rose-300/30 hover:bg-rose-400/[0.07] hover:shadow-[0_16px_36px_rgba(244,114,182,0.12)]",
    iconActive: "border-rose-300/40 bg-rose-300/12 text-rose-100",
    iconIdle: "border-rose-300/15 bg-black/25 text-rose-100 group-hover:border-rose-300/30",
    banner: "border-rose-300/25 bg-rose-400/[0.08]",
  },
  "live-coding": {
    icon: Code2,
    kicker: "Fast Signal",
    focus: "Runnable code",
    glow: "bg-amber-300/22",
    activeCard: "border-amber-300/55 bg-amber-300/10 shadow-[0_20px_48px_rgba(251,191,36,0.16)]",
    idleCard: "border-white/10 bg-white/[0.04] hover:border-amber-300/28 hover:bg-amber-300/[0.07] hover:shadow-[0_16px_36px_rgba(251,191,36,0.1)]",
    iconActive: "border-amber-300/40 bg-amber-300/14 text-amber-100",
    iconIdle: "border-amber-300/15 bg-black/25 text-amber-100 group-hover:border-amber-300/28",
    banner: "border-amber-300/25 bg-amber-300/[0.08]",
  },
};

const Page = async ({ searchParams }: PageProps) => {
  const user = await getCurrentUser();
  const modes = await getInterviewModes();
  const { round } = await searchParams;
  const visibleModes = modes.filter((mode) => mode.id !== "full-loop");
  const activeRound =
    round === "hr" ||
    round === "managerial" ||
    round === "full-loop" ||
    round === "video" ||
    round === "technical" ||
    round === "live-coding"
      ? round
      : "technical";
  const activeVisual = MODE_VISUALS[activeRound] || MODE_VISUALS.technical;
  const ActiveRoundIcon = activeVisual.icon;
  const isDisabledRound =
    activeRound === "full-loop" ||
    activeRound === "video" ||
    activeRound === "live-coding";
  const disabledMode = isDisabledRound
    ? (activeRound as "full-loop" | "video" | "live-coding")
    : null;
  const selectedMode = modes.find((mode) => mode.id === activeRound);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h3>Interview generation</h3>
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          {visibleModes.map((mode) => {
            const visual = MODE_VISUALS[mode.id] || MODE_VISUALS.technical;
            const Icon = visual.icon;
            const isActive = activeRound === mode.id;
            const isDisabledMode = mode.id === "video" || mode.id === "live-coding";
            const isSpotlight = isDisabledMode;
            const cardClassName = cn(
              "group relative overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-300",
              isDisabledMode
                ? "cursor-pointer select-none"
                : "hover:-translate-y-0.5",
              isActive ? visual.activeCard : visual.idleCard,
            );

            const cardContent = (
              <>
                {(isSpotlight || isActive) && (
                  <span
                    className={cn(
                      "pointer-events-none absolute -right-8 -top-8 size-24 rounded-full blur-3xl transition-transform duration-300",
                      !isDisabledMode && "group-hover:scale-110",
                      visual.glow,
                    )}
                  />
                )}

                <div className="relative flex h-full min-h-[150px] flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={cn(
                          "text-[10px] uppercase tracking-[0.26em]",
                          isActive || isSpotlight ? "text-white/80" : "text-light-400",
                        )}
                      >
                        {visual.kicker}
                      </p>
                      <h4 className="mt-2 text-lg font-semibold leading-snug text-white">
                        {mode.name}
                      </h4>
                    </div>

                    <span
                      className={cn(
                        "inline-flex rounded-xl border p-2.5 transition-all duration-300",
                        !isDisabledMode && "group-hover:scale-105",
                        isActive ? visual.iconActive : visual.iconIdle,
                      )}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-light-100/88">{mode.description}</p>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs">
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1",
                        isDisabledMode
                          ? "border-white/15 bg-black/25 text-white"
                          : "border-white/10 bg-black/20 text-light-100",
                      )}
                    >
                      {isDisabledMode ? "Preview only" : visual.focus}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-medium transition-transform duration-300",
                        isDisabledMode
                          ? "text-white/90"
                          : isActive
                            ? "text-white/90"
                            : "text-light-400 group-hover:translate-x-1 group-hover:text-light-100",
                      )}
                    >
                      {isDisabledMode ? "In Progress" : "Open"}
                      {!isDisabledMode ? <ArrowRight className="size-3.5" /> : null}
                    </span>
                  </div>
                </div>
              </>
            );

            if (isDisabledMode) {
              return (
                <div
                  key={mode.id}
                  className={cardClassName}
                  aria-disabled="true"
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={mode.id}
                href={`/interview?round=${mode.id}`}
                className={cardClassName}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>

      <section
        className={cn(
          "mt-5 overflow-hidden rounded-2xl border px-4 py-4 sm:px-5",
          activeVisual.banner,
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className={cn("rounded-xl border p-2.5", activeVisual.iconActive)}>
              <ActiveRoundIcon className="size-[18px]" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.26em] text-light-400">
                Selected Mode
              </p>
              <h4 className="mt-1.5 text-lg font-semibold text-white">
                {selectedMode?.name ||
                  (activeRound === "video"
                    ? "Video Interview"
                    : activeRound === "live-coding"
                      ? "Live Coding"
                      : activeRound === "full-loop"
                        ? "Full Loop"
                        : "Interview Round")}
              </h4>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-light-100/88">
                {activeRound === "video"
                  ? "This mode is still visible as a preview card, but the real video interview flow has been disabled."
                  : activeRound === "live-coding"
                    ? "This mode is still visible as a preview card, but the real live coding workflow has been disabled."
                    : activeRound === "full-loop"
                      ? "This combined flow has been removed from the active interview module."
                      : "Choose this lane when you want structured interview practice with guided questions and feedback."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-light-100">
              {isDisabledRound ? "Unavailable" : activeVisual.focus}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-light-100">
              {activeRound === "video"
                ? "No mic or camera"
                : activeRound === "live-coding"
                  ? "No editor or checks"
                  : activeRound === "full-loop"
                    ? "Removed"
                    : "Q&A flow"}
            </span>
          </div>
        </div>
      </section>

      {disabledMode ? (
        <InterviewModePlaceholder
          mode={disabledMode}
          primaryHref="/interview?round=technical"
          primaryLabel="Open Technical Round"
          secondaryHref="/interview?round=managerial"
          secondaryLabel="Open Managerial Round"
        />
      ) : (
        <Agent
          key={activeRound}
          userName={user?.name ?? "Candidate"}
          userId={user?.id}
          profileImage={user?.profileURL}
          type="generate"
          roundType={activeRound}
        />
      )}
    </>
  );
};

export default Page;
