import { Chip, MeterBar } from "../../kit";
import { HallCard } from "./night-hall";

/*
 * Illustrative only (landing, Paper "Landing (signed out)"): what a repo looks like inside
 * Coact. Static sample values — no data, hidden from assistive tech.
 */
const SAMPLE = {
  name: "lcls-xpp-2024",
  facility: "LCLS",
  meters: [
    { label: "milano", mono: true, value: "42%", pct: 42 },
    { label: "data · sdfdata", value: "2.8 / 8 TB", pct: 35 },
  ],
  members: ["jdoe", "bwong", "asmith"],
};

export function RepoPreviewCard() {
  return (
    <HallCard aria-hidden className="tw:gap-3.5 tw:select-none">
      <div className="tw:flex tw:items-center tw:justify-between">
        <span className="tw:font-mono tw:text-[15px] tw:leading-5.5 tw:font-semibold">{SAMPLE.name}</span>
        <Chip className="tw:rounded-full tw:px-2.5">{SAMPLE.facility}</Chip>
      </div>
      {SAMPLE.meters.map((m) => (
        <div key={m.label} className="tw:flex tw:flex-col tw:gap-1.5">
          <div className="tw:flex tw:justify-between tw:text-xs tw:leading-4">
            <span className={m.mono ? "tw:font-mono tw:text-muted-strong" : "tw:text-muted-strong"}>{m.label}</span>
            <span className="tw:font-medium tw:tabular-nums">{m.value}</span>
          </div>
          <MeterBar pct={m.pct} className="tw:h-2 tw:w-full" />
        </div>
      ))}
      <span className="tw:h-px tw:bg-border" />
      <div className="tw:flex tw:flex-wrap tw:gap-1.5">
        {SAMPLE.members.map((u) => (
          <Chip key={u} mono className="tw:h-6">{u}</Chip>
        ))}
        <Chip mono className="tw:h-6 tw:bg-ok-bg tw:font-semibold tw:text-ok-text">+ you</Chip>
      </div>
    </HallCard>
  );
}
