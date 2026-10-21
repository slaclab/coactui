"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------------------------- *
 * Chips and pills (design v2: filled neutral chips; status only as tinted, labelled pills)
 * ------------------------------------------------------------------------------------- */

/** Filled neutral chip: facility, PI/Leader role, purpose, feature names. */
export function Chip({ children, icon: Icon, mono, className, ...props }) {
  return (
    <span
      {...props}
      className={cn(
        "tw:inline-flex tw:h-5.5 tw:w-fit tw:shrink-0 tw:items-center tw:gap-1.25 tw:rounded-sm tw:bg-neutral-bg tw:px-2 tw:text-xs tw:font-semibold tw:whitespace-nowrap tw:text-muted-strong",
        mono && "tw:font-mono tw:font-medium",
        className,
      )}
    >
      {Icon && <Icon className="tw:size-3 tw:text-foreground" strokeWidth={2} />}
      {children}
    </span>
  );
}

const TONES = {
  ok: "tw:bg-ok-bg tw:text-ok-text",
  warn: "tw:bg-warn-bg tw:text-warn-text",
  crit: "tw:bg-crit-bg tw:text-crit-text",
  burst: "tw:bg-burst-bg tw:text-burst-text",
  brand: "tw:bg-brand-bg tw:text-primary-text",
  neutral: "tw:bg-neutral-bg tw:text-muted-strong",
};
const DOTS = { ok: "tw:bg-ok", warn: "tw:bg-warn", crit: "tw:bg-crit", burst: "tw:bg-burst", brand: "tw:bg-primary", neutral: "tw:bg-muted-foreground" };

/** Status pill: tone = ok | warn | crit | burst | brand | neutral. Always carries a label. */
export function StatusPill({ tone = "neutral", dot = true, children, className, ...props }) {
  return (
    <span
      {...props}
      className={cn("tw:inline-flex tw:h-5.5 tw:items-center tw:gap-1.5 tw:rounded-full tw:px-2 tw:text-xs tw:font-semibold tw:whitespace-nowrap", TONES[tone], className)}
    >
      {dot && <span className={cn("tw:size-1.5 tw:rounded-full", DOTS[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/** Small count badge, e.g. the "17" on a tab or the pending count in nav (warn tone). */
export function CountBadge({ children, tone = "neutral", className }) {
  return (
    <span className={cn("tw:flex tw:h-5 tw:min-w-5 tw:items-center tw:justify-center tw:rounded-full tw:px-1.5 tw:font-mono tw:text-[11px] tw:font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Keyboard hint. */
export function Kbd({ children, className }) {
  return (
    <kbd className={cn("tw:flex tw:h-5 tw:items-center tw:rounded tw:bg-muted tw:px-1.5 tw:font-sans tw:text-xs tw:font-medium tw:text-muted-strong", className)}>
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------------------------- *
 * Tabs and segmented controls
 * ------------------------------------------------------------------------------------- */

const tabClass = (active, disabled) =>
  cn(
    "tw:-mb-px tw:flex tw:items-center tw:gap-1.5 tw:border-b-2 tw:px-0.5 tw:pb-2.5 tw:text-sm tw:no-underline",
    active ? "tw:border-primary tw:font-semibold tw:text-foreground" : "tw:border-transparent tw:font-medium tw:text-muted-foreground tw:hover:text-foreground",
    disabled && "tw:pointer-events-none tw:opacity-50",
  );

/** Route tabs (repo page, facility page): items = [{ label, href, count?, exact? }]. Active from the URL. */
export function LinkTabs({ items, className }) {
  const pathname = usePathname();
  const isActive = (it) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`));
  // The most specific match wins, so "/repos/x/y" (overview) isn't active on "/repos/x/y/members".
  const active = [...items].filter(isActive).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <nav aria-label="Sections" className={cn("tw:flex tw:items-end tw:gap-5 tw:border-b", className)}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={it === active ? "page" : undefined} className={tabClass(it === active, it.disabled)}>
          {it.label}
          {it.count != null && <span className="tw:text-xs tw:font-medium tw:text-muted-foreground tw:tabular-nums">{it.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** State tabs (scope tabs): items = [{ value, label, disabled? }]; value/onChange (usually URL state). */
export function LineTabs({ items, value, onChange, className }) {
  return (
    <div role="tablist" className={cn("tw:flex tw:items-end tw:gap-5 tw:border-b", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={it.value === value}
          disabled={it.disabled}
          title={it.disabled ? it.disabledReason ?? "Not available yet" : undefined}
          onClick={() => onChange(it.value)}
          className={tabClass(it.value === value, it.disabled)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Segmented control (presets, range, chart type): muted track, raised white active item. */
export function Segmented({ items, value, onChange, size = "md", label }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("tw:flex tw:items-center tw:rounded-md tw:bg-muted tw:p-0.5", size === "sm" ? "tw:h-7.5" : "tw:h-8")}>
      {items.map(({ value: v, label: text, icon: Icon, disabled }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn(
              "tw:flex tw:items-center tw:gap-1.5 tw:rounded-sm",
              size === "sm" ? "tw:h-6.5 tw:px-2 tw:text-xs" : "tw:h-7 tw:px-3 tw:text-[13px]",
              active ? "tw:bg-primary-foreground tw:font-semibold tw:text-foreground tw:shadow-[0_1px_2px_rgb(20_24_28/0.08)]" : "tw:font-medium tw:text-muted-strong tw:hover:text-foreground",
              disabled && "tw:cursor-not-allowed tw:opacity-50",
            )}
          >
            {Icon && <Icon className="tw:size-3.5" />}
            {text}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------------------- *
 * Page structure
 * ------------------------------------------------------------------------------------- */

/** Breadcrumb: items = [{ label, href?, mono? }]; the last item is the current page. */
export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="tw:flex tw:items-center tw:gap-1.5 tw:text-[13px] tw:text-muted-foreground">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${it.label}-${i}`} className="tw:flex tw:items-center tw:gap-1.5">
            {i > 0 && <ChevronRight className="tw:size-3.5" aria-hidden />}
            {last || !it.href ? (
              <span className={cn(it.mono && "tw:font-mono", last && "tw:text-foreground")} aria-current={last ? "page" : undefined}>{it.label}</span>
            ) : (
              <Link href={it.href} className={cn("tw:text-muted-foreground tw:no-underline tw:hover:text-foreground", it.mono && "tw:font-mono")}>{it.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Page header (spec D1–D3 / R1): breadcrumb, title (mono for repo/cluster names), badges,
 * subtitle/meta lines, right-aligned actions, and optional route tabs underneath.
 */
export function PageHeader({ breadcrumbs, title, mono, badges, subtitle, meta, actions, tabs, className }) {
  return (
    <header className={cn("tw:flex tw:flex-col tw:gap-4", className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="tw:flex tw:items-end tw:justify-between tw:gap-6">
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2.5">
            <h1 className={cn("tw:truncate tw:text-[26px] tw:leading-8 tw:font-semibold tw:tracking-[-0.02em]", mono && "tw:font-mono tw:text-2xl")}>{title}</h1>
            {badges}
          </div>
          {subtitle && <div className="tw:text-sm tw:text-muted-foreground">{subtitle}</div>}
          {meta && <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-1 tw:text-xs tw:text-muted-foreground">{meta}</div>}
        </div>
        {actions && <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-2">{actions}</div>}
      </div>
      {tabs && <LinkTabs items={tabs} />}
    </header>
  );
}

/** Content section card: title, optional caption and header action, then body. */
export function SectionCard({ title, caption, action, children, footer, className, bodyClassName }) {
  return (
    <section className={cn("tw:flex tw:flex-col tw:rounded-xl tw:border tw:bg-background", className)}>
      {(title || action) && (
        <div className="tw:flex tw:items-start tw:justify-between tw:gap-4 tw:px-5 tw:pt-4.5 tw:pb-3">
          <div>
            {title && <h2 className="tw:text-[15px] tw:leading-5.5 tw:font-semibold">{title}</h2>}
            {caption && <p className="tw:mt-0.5 tw:text-xs tw:text-muted-foreground">{caption}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn("tw:px-5 tw:pb-4", !title && !action && "tw:pt-4", bodyClassName)}>{children}</div>
      {footer && <div className="tw:border-t tw:px-5 tw:py-3">{footer}</div>}
    </section>
  );
}

/** Definition list (peek Details, repo Details): items = [{ term, value }] (value may be a node). */
export function DefinitionList({ items, className }) {
  return (
    <dl className={cn("tw:grid tw:grid-cols-[140px_1fr] tw:gap-x-4 tw:gap-y-2.5 tw:text-sm", className)}>
      {items.filter(Boolean).map(({ term, value }) => (
        <div key={term} className="tw:contents">
          <dt className="tw:text-muted-foreground">{term}</dt>
          <dd className="tw:min-w-0 tw:break-words">{value ?? <span className="tw:text-muted-foreground">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/** icon-sm copy button with a transient check; aria-label says what is copied. */
export function CopyButton({ value, label = "Copy", className }) {
  const [copied, setCopied] = useState(false); // transient UI feedback only
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); })}
      className={cn("tw:inline-flex tw:size-6 tw:items-center tw:justify-center tw:rounded tw:text-muted-foreground tw:hover:bg-muted tw:hover:text-foreground", className)}
    >
      {copied ? <Check className="tw:size-3.5" /> : <Copy className="tw:size-3.5" />}
    </button>
  );
}

/** History timeline (spec History tabs): entries = [{ key, title, meta, badge? }]. */
export function Timeline({ entries }) {
  return (
    <ol className="tw:ml-2 tw:space-y-5 tw:border-l tw:pl-6">
      {entries.map((e) => (
        <li key={e.key} className="tw:relative">
          <span className="tw:absolute tw:top-1.5 tw:-left-[29px] tw:size-2 tw:rounded-full tw:border-2 tw:border-background tw:bg-meter" aria-hidden />
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-sm">{e.title}{e.badge}</div>
          {e.meta && <div className="tw:mt-0.5 tw:text-xs tw:text-muted-foreground">{e.meta}</div>}
        </li>
      ))}
    </ol>
  );
}
