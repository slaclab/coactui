"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { fmtLongDay, fmtShortDay } from "../../../lib/dates";
import { formatInt, formatStorage } from "../../../lib/format";
import { formatCount } from "./compute-math";

// Graphite tokens, mono ticks — same treatment as the cluster usage page.
const tick = { fontFamily: "var(--font-geist-mono)", fontSize: 11, fill: "var(--muted-foreground)" };
const axis = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function TooltipRow({ color, dashed, label, value }) {
  return (
    <div className="tw:flex tw:w-full tw:items-center tw:gap-2">
      {dashed ? <span className="tw:w-2.5 tw:shrink-0 tw:border-t tw:border-dashed tw:border-foreground" /> : <span className="tw:size-2.5 tw:shrink-0 tw:rounded-[2px]" style={{ background: color }} />}
      <span className="tw:text-muted-foreground">{label}</span>
      <span className="tw:ml-auto tw:pl-4 tw:font-mono tw:font-medium tw:text-foreground">{value}</span>
    </div>
  );
}

function Legend({ items, note }) {
  return (
    <div className="tw:flex tw:items-center tw:justify-between tw:pl-12">
      <div className="tw:flex tw:items-center tw:gap-4">
        {items.map((it) => (
          <span key={it.label} className="tw:flex tw:items-center tw:gap-1.5 tw:text-xs tw:text-muted-strong">
            {it.dashed ? <span className="tw:w-3.5 tw:shrink-0 tw:border-t tw:border-dashed tw:border-foreground" /> : <span className="tw:size-2.5 tw:shrink-0 tw:rounded-[2px]" style={{ background: it.color }} />}
            {it.label}
          </span>
        ))}
      </div>
      {note && <span className="tw:text-xs tw:text-muted-foreground">{note}</span>}
    </div>
  );
}

const compute = {
  used: { label: "Used (cumulative)", color: "var(--chart-1)" },
  pace: { label: "Uniform pace", color: "var(--chart-3)" },
};

/** Cumulative resource-hours (Area) against the straight-line allocation pace (dashed Line). */
export function CumulativeComputeChart({ rows }) {
  const last = rows.at(-1);
  return (
    <>
      <ChartContainer config={compute} className="tw:aspect-auto tw:h-[240px] tw:w-full">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
          <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--border)" }} tickMargin={10} minTickGap={48} tickFormatter={fmtShortDay} tick={tick} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={tick} tickFormatter={(v) => axis.format(v).toLowerCase()} />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, p) => fmtLongDay(p?.[0]?.payload?.date)}
                formatter={(v, name, item) => (
                  <TooltipRow color={item.color} dashed={name === "pace"} label={compute[name]?.label ?? name} value={`${formatInt(v)} resource-h`} />
                )}
              />
            }
          />
          <Area dataKey="used" type="linear" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.12} isAnimationActive={false} />
          <Line dataKey="pace" type="linear" stroke="var(--chart-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ChartContainer>
      <Legend
        items={[{ label: compute.used.label, color: "var(--chart-1)" }, { label: "Uniform pace of the allocation", dashed: true }]}
        note={last ? `${formatInt(last.used)} of ${formatInt(last.pace)} resource-h by ${fmtShortDay(last.date)}` : null}
      />
    </>
  );
}

/** Daily used space or inodes (Area) with the allocation as a dashed ReferenceLine. */
export function StorageUsageChart({ rows, metric, allocated }) {
  const key = metric === "inodes" ? "inodes" : "gigabytes";
  const fmt = metric === "inodes" ? (v) => `${formatCount(v)} files` : formatStorage;
  const config = { [key]: { label: metric === "inodes" ? "Files used" : "Space used", color: "var(--chart-1)" } };
  return (
    <>
      <ChartContainer config={config} className="tw:aspect-auto tw:h-[240px] tw:w-full">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
          <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--border)" }} tickMargin={10} minTickGap={48} tickFormatter={fmtShortDay} tick={tick} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={tick}
            domain={[0, (max) => Math.max(max, allocated ?? 0) * 1.05]}
            tickFormatter={(v) => (metric === "inodes" ? formatCount(v) : formatStorage(v))}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, p) => fmtLongDay(p?.[0]?.payload?.date)}
                formatter={(v, name, item) => <TooltipRow color={item.color} label={config[name]?.label ?? name} value={fmt(v)} />}
              />
            }
          />
          <Area dataKey={key} type="linear" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.12} isAnimationActive={false} />
          {allocated ? <ReferenceLine y={allocated} stroke="var(--foreground)" strokeDasharray="4 4" strokeWidth={1} ifOverflow="extendDomain" /> : null}
        </ComposedChart>
      </ChartContainer>
      <Legend items={[{ label: config[key].label, color: "var(--chart-1)" }, allocated ? { label: `Allocated · ${fmt(allocated)}`, dashed: true } : null].filter(Boolean)} />
    </>
  );
}
