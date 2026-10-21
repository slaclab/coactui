"use client";

// plotly.js 1.x's bundled d3 v3 reads `this.document`, which breaks under ESM bundling, so
// the legacy charts use the prebuilt plotly.js-dist-min 3 bundle via the factory. It is
// ~4.6 MB and touches `window` at import, so it is client-only and code-split: only the 3
// legacy chart pages pay for it, and it goes away once they move to Recharts.
import dynamic from "next/dynamic";

const Plot = dynamic(
  () =>
    Promise.all([import("plotly.js-dist-min"), import("react-plotly.js/factory")]).then(
      ([plotly, factory]) => factory.default(plotly.default),
    ),
  { ssr: false, loading: () => <p>Loading chart…</p> },
);

export default Plot;
