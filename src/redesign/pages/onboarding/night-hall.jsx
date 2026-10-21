"use client";

import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";
import styles from "./night-hall.module.css";

/*
 * The "night data hall" layout shared by the signed-out landing and /register (design v2).
 * Full-bleed: it cancels the shell's <main> padding so the hall runs edge to edge under the
 * top bar. The night palette lives only here: bg-night plus primary-foreground at reduced
 * strength for the greys (no night text tokens yet — see the group's kit requests).
 *
 * entrance: "pending" (server / before hydration — decoration hidden), "play" (first visit:
 * blueprint draws in, then the hero rises 8 px; 1200 ms ease-out), "static".
 */

const GRID = {
  landing: "tw:lg:grid-cols-[minmax(0,700px)_minmax(0,1fr)] tw:lg:items-center tw:lg:pl-16",
  register: "tw:lg:grid-cols-[minmax(0,1fr)_456px] tw:lg:items-start",
};

export function NightHall({ variant = "register", entrance = "static", onEntranceEnd, eyebrow, title, lead, actions, aside, bottom, footer }) {
  const hero =
    entrance === "play"
      ? "tw:animate-in tw:fade-in tw:slide-in-from-bottom-2 tw:ease-out tw:animation-duration-800 tw:delay-400 tw:fill-mode-both"
      : entrance === "pending"
        ? "tw:opacity-0"
        : null;
  return (
    <section className="tw:relative tw:isolate tw:-mx-6 tw:-mt-6 tw:-mb-24 tw:flex tw:min-h-[calc(100vh-3rem)] tw:flex-1 tw:flex-col tw:overflow-hidden tw:bg-night tw:text-primary-foreground">
      <div
        aria-hidden
        className={cn(styles.blueprint, entrance === "play" && styles.draw, entrance === "pending" && styles.pending)}
        onAnimationEnd={(e) => e.target === e.currentTarget && onEntranceEnd?.()}
      />
      <div aria-hidden className="tw:pointer-events-none tw:absolute tw:inset-0 tw:bg-linear-to-b tw:from-night tw:from-10% tw:via-night/60 tw:via-50% tw:to-night/70" />
      <div aria-hidden className="tw:pointer-events-none tw:absolute tw:inset-0 tw:bg-linear-to-r tw:from-transparent tw:from-50% tw:via-night/80 tw:via-75% tw:to-night/95" />

      <div className={cn("tw:relative tw:mx-auto tw:grid tw:w-full tw:max-w-[1440px] tw:flex-1 tw:gap-12 tw:px-6 tw:py-12 tw:sm:px-14 tw:lg:py-16", GRID[variant])}>
        <div className={cn("tw:flex tw:min-w-0 tw:flex-col tw:gap-10", bottom && "tw:self-stretch")}>
          <div className={cn("tw:flex tw:flex-col tw:gap-6", hero)}>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h1
              className={cn(
                "tw:font-bold tw:tracking-[-0.035em] tw:text-primary-foreground",
                variant === "landing" ? "tw:text-[clamp(44px,5vw,64px)] tw:leading-[1.06]" : "tw:text-[clamp(44px,6vw,80px)] tw:leading-none",
              )}
            >
              {title}
            </h1>
            {lead && <p className="tw:max-w-150 tw:text-lg tw:leading-7 tw:text-primary-foreground/80">{lead}</p>}
            {actions}
          </div>
          {bottom && <div className="tw:mt-auto">{bottom}</div>}
        </div>
        {aside && <div className="tw:min-w-0">{aside}</div>}
      </div>

      {footer && <footer className="tw:relative tw:border-t tw:border-primary-foreground/10 tw:bg-night/80">{footer}</footer>}
    </section>
  );
}

/** The aluminium card that sits on the hall (register card, landing preview). */
export function HallCard({ className, children, ...props }) {
  return (
    <div
      {...props}
      className={cn(
        "tw:flex tw:flex-col tw:rounded-2xl tw:border tw:border-primary-foreground/20 tw:bg-background/95 tw:p-7 tw:text-foreground tw:shadow-[0_24px_64px_color-mix(in_oklab,var(--night)_70%,transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The hall's primary action: full-width-able SLAC-red button with the v2 glow. */
export const HALL_CTA =
  "tw:h-11 tw:rounded-lg tw:px-5 tw:text-[15px] tw:font-semibold tw:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--primary-foreground)_20%,transparent),0_6px_16px_color-mix(in_oklab,var(--primary)_25%,transparent)]";

/** External destinations shown on the public pages (not app routes). */
export const PUBLIC_LINKS = {
  docs: "https://s3df.slac.stanford.edu/",
  status: "https://s3df.slac.stanford.edu/",
  privacy: "https://www.slac.stanford.edu/",
  contact: "mailto:s3df-help@slac.stanford.edu",
};
