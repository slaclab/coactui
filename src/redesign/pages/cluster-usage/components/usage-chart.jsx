"use client";

import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { fmtMonth, fmtShortDay } from "../../../lib/dates";
import { NOTES, SERIES_COLORS } from "../constants";

const axis = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 0 });
const full = new Intl.NumberFormat("en");
const fmtMonthTick = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { month: "short", timeZone: "UTC" });
const tick = { fontFamily: "var(--font-geist-mono)", fontSize: 11, fill: "var(--muted-foreground)" };

/**
 * One dataset + one chartConfig, four renderings (Paper 6LZ-0): stacked bar, line, stacked area,
 * and "% of capacity" (one utilization series against a dashed 100% line and a burst zone).
 * `series` comes from usage-model foldSeries(); `mono` renders legend labels in mono (repos).
 */
export function UsageChart({ mode, series, rangeKey, mono = false }) {
  const { rows, keys, config, peak, avg } = series;
  const isPercent = mode === "percent";
  const cap = rows[0]?.capacity ?? 0;
  const byMonth = rangeKey === "year";
  const value = (v) => (isPercent ? `${v}%` : `${full.format(v)} resource-h`);

  return (
    <>
      <ChartContainer config={config} className="tw:aspect-auto tw:h-[240px] tw:w-full">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
          <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--border)" }} tickMargin={10} minTickGap={48} tickFormatter={byMonth ? fmtMonthTick : fmtShortDay} tick={tick} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={tick}
            domain={isPercent ? [0, 130] : [0, mode === "line" || !cap ? "auto" : cap]}
            ticks={isPercent ? [0, 30, 65, 100, 130] : mode === "line" || !cap ? undefined : [0, cap / 2, cap]}
            tickFormatter={(v) => (isPercent ? `${v}%` : axis.format(v).toLowerCase())}
          />
          {isPercent && <ReferenceArea y1={100} y2={130} ifOverflow="hidden" fill="var(--burst-bg)" fillOpacity={0.8} stroke="none" />}
          <ChartTooltip
            cursor={mode === "bar" ? { fill: "var(--muted)", opacity: 0.6 } : { stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                indicator={mode === "bar" ? "dot" : "line"}
                labelFormatter={(_, p) => (byMonth ? fmtMonth : fmtShortDay)(p?.[0]?.payload?.date)}
                formatter={(v, name, item) => (
                  <div className="tw:flex tw:w-full tw:items-center tw:gap-2">
                    <span className="tw:size-2.5 tw:shrink-0 tw:rounded-[2px]" style={{ background: item.color }} />
                    <span className={cn("tw:text-muted-foreground", mono && name !== "others" && "tw:font-mono")}>{config[name]?.label ?? name}</span>
                    <span className="tw:ml-auto tw:pl-4 tw:font-mono tw:font-medium tw:text-foreground">{value(v)}</span>
                  </div>
                )}
              />
            }
          />
          {isPercent ? (
            <Area dataKey="utilization" type="linear" stroke="var(--chart-1)" strokeWidth={2} fill="var(--muted)" fillOpacity={1} isAnimationActive={false} />
          ) : (
            keys.map((k) =>
              mode === "bar" ? (
                <Bar key={k} dataKey={k} stackId="usage" fill={`var(--color-${k})`} isAnimationActive={false} />
              ) : mode === "line" ? (
                <Line key={k} dataKey={k} type="linear" stroke={`var(--color-${k})`} strokeWidth={2} dot={false} isAnimationActive={false} />
              ) : (
                <Area key={k} dataKey={k} type="linear" stackId="usage" stroke="none" fill={`var(--color-${k})`} fillOpacity={1} isAnimationActive={false} />
              ),
            )
          )}
          {mode !== "line" && (isPercent || cap > 0) && (
            <ReferenceLine y={isPercent ? 100 : cap} stroke="var(--foreground)" strokeDasharray="4 4" strokeWidth={1} ifOverflow="extendDomain" />
          )}
        </ComposedChart>
      </ChartContainer>
      <ChartLegend mode={mode} keys={keys} config={config} peak={peak} avg={avg} mono={mono} />
    </>
  );
}

const Swatch = ({ color }) => <span className="tw:size-2.5 tw:shrink-0 tw:rounded-[2px]" style={{ background: color }} />;
const Dashed = () => <span className="tw:w-3.5 tw:shrink-0 tw:border-t tw:border-dashed tw:border-foreground" />;
function LegendItem({ mark, children, mono }) {
  return <span className={cn("tw:flex tw:items-center tw:gap-1.5 tw:text-xs tw:text-muted-strong", mono && "tw:font-mono")}>{mark}{children}</span>;
}

/** Legend under the chart: series swatches + capacity line, or the utilization key; note on the right. */
export function ChartLegend({ mode, keys, config, peak, avg, mono }) {
  const note = mode === "percent" ? `Peak ${Math.round(peak)}% · avg ${Math.round(avg)}%` : NOTES[mode].note;
  return (
    <div className="tw:flex tw:items-center tw:justify-between tw:gap-4 tw:pl-10">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-4">
        {mode === "percent" ? (
          <>
            <LegendItem mark={<Swatch color={SERIES_COLORS[0]} />}>Utilization</LegendItem>
            <LegendItem mark={<Dashed />}>100% purchased</LegendItem>
            <LegendItem mark={<span className="tw:size-2.5 tw:shrink-0 tw:rounded-[2px] tw:border tw:border-burst/35 tw:bg-burst-bg" />}>Burst zone</LegendItem>
          </>
        ) : (
          <>
            {keys.map((k) => (
              <LegendItem key={k} mark={<Swatch color={config[k].color} />} mono={mono && k !== "others"}>{config[k].label}</LegendItem>
            ))}
            {mode !== "line" && <LegendItem mark={<Dashed />}>Cluster capacity</LegendItem>}
          </>
        )}
      </div>
      {note && <span className="tw:shrink-0 tw:text-xs tw:text-muted-foreground">{note}</span>}
    </div>
  );
}
