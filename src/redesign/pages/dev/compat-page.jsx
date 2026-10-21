"use client";

import { useEffect, useRef, useState } from "react";
import BsButton from "react-bootstrap/Button";
import BsCard from "react-bootstrap/Card";
import BsTable from "react-bootstrap/Table";
import BsBadge from "react-bootstrap/Badge";
import BsForm from "react-bootstrap/Form";
import BsModal from "react-bootstrap/Modal";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Plot from "@/lib/plot";

/* /dev/compat — Bootstrap + Tailwind coexistence checks (plan §8). Dev-only page. */

// Computed-style assertions: Bootstrap must look as it did, and Tailwind must win on new markup.
const CHECKS = [
  { id: "bs-btn", label: "Bootstrap .btn-primary keeps Coact red", prop: "background-color", expect: "rgb(177, 4, 14)" },
  { id: "bs-p3", label: "Bootstrap .p-3 on old markup is still 1rem (Tailwind p-3 would be 0.75rem)", prop: "padding-top", expect: "16px" },
  { id: "bs-mb3", label: "Bootstrap .mb-3 on old markup is still 1rem", prop: "margin-bottom", expect: "16px" },
  { id: "bs-ul", label: "Plain <ul> keeps its bullets (preflight sets list-style none)", prop: "list-style-type", expect: "disc" },
  { id: "bs-text-primary", label: "Old .text-primary stays Coact red (shadcn's own button/badge use text-primary)", prop: "color", expect: "rgb(177, 4, 14)" },
  { id: "bs-bg-secondary", label: "Old <Badge bg=\"secondary\"> stays Coact yellow (shadcn uses bg-secondary)", prop: "background-color", expect: "rgb(254, 221, 92)" },
  { id: "bs-h5", label: "Bootstrap reboot still sizes <h5> (preflight resets to inherit)", prop: "font-size", expect: "20px" },
  { id: "tw-p4", label: "Tailwind p-4 on new markup is 1rem (Bootstrap p-4 is 1.5rem)", prop: "padding-top", expect: "16px" },
  { id: "tw-border", label: "Tailwind border uses the v2 border token (#D5DADF)", prop: "border-top-color", expect: "rgb(213, 218, 223)" },
  { id: "tw-rounded", label: "Tailwind rounded-lg = --radius (10px)", prop: "border-top-left-radius", expect: "10px" },
  { id: "tw-btn", label: "shadcn Button primary is SLAC red (v2: red leads)", prop: "background-color", expect: "rgb(177, 4, 14)" },
];

export function CompatPrototype() {
  const root = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [results, setResults] = useState([]);
  useEffect(() => {
    setResults(
      CHECKS.map((c) => {
        const el = root.current?.querySelector(`[data-check="${c.id}"]`);
        const actual = el ? getComputedStyle(el).getPropertyValue(c.prop) : "missing";
        return { ...c, actual, ok: actual === c.expect };
      }),
    );
  }, []);

  return (
    <>
      <h1 className="tw:mb-4 tw:text-2xl tw:font-semibold tw:tracking-tight">Bootstrap + Tailwind coexistence</h1>
      <div ref={root} className="tw:grid tw:gap-6 tw:lg:grid-cols-2">
        <section>
          <h2 className="tw:mb-2 tw:text-base tw:font-semibold">Old markup (react-bootstrap)</h2>
          {/* bootstrap-sample:start — Bootstrap classes, never prefixed */}
          <div className="bs-scope">
            <BsCard>
              <BsCard.Header>Details <BsBadge bg="secondary" data-check="bs-bg-secondary">pending</BsBadge></BsCard.Header>
              <BsCard.Body>
                <h5 data-check="bs-h5">Card title (h5) <span className="text-primary" data-check="bs-text-primary">text-primary</span></h5>
                <div className="p-3 mb-3 border" data-check="bs-p3"><span data-check="bs-mb3" className="d-block mb-3">p-3 · mb-3 · border</span></div>
                <ul data-check="bs-ul"><li>bullet one</li><li>bullet two</li></ul>
                <BsForm.Control placeholder="Bootstrap input" className="mb-2" />
                <BsButton variant="primary" data-check="bs-btn">Bootstrap button</BsButton>{" "}
                <BsButton variant="secondary" onClick={() => setShowModal(true)}>Open Bootstrap modal</BsButton>
                <BsModal show={showModal} onHide={() => setShowModal(false)}>
                  <BsModal.Header closeButton><BsModal.Title>react-bootstrap Modal on React 19</BsModal.Title></BsModal.Header>
                  <BsModal.Body>Modal relied on defaultProps in react-bootstrap 2.5; 2.10 does not.</BsModal.Body>
                  <BsModal.Footer><BsButton onClick={() => setShowModal(false)}>Close</BsButton></BsModal.Footer>
                </BsModal>
              </BsCard.Body>
            </BsCard>
            <BsTable striped bordered size="sm" className="mt-3">
              <thead><tr><th>Repo</th><th>Facility</th></tr></thead>
              <tbody><tr><td>lcls-xpp-2024</td><td>LCLS</td></tr><tr><td>ssrl-bl12-2</td><td>SSRL</td></tr></tbody>
            </BsTable>
            {/* Legacy chart path: plotly.js-dist-min 3 via the lazy factory in src/lib/plot.jsx */}
            <div data-testid="legacy-plot">
              <Plot
                data={[{ x: [1, 2, 3, 4], y: [3, 5, 4, 6], type: "scatter", fill: "tozeroy", name: "Storage Used" }]}
                layout={{ showlegend: false, height: 220, margin: { t: 10, b: 30, l: 40, r: 10 } }}
                style={{ width: "100%" }}
              />
            </div>
          </div>
          {/* bootstrap-sample:end */}
        </section>
        <section>
          <h2 className="tw:mb-2 tw:text-base tw:font-semibold">New markup (shadcn/ui)</h2>
          <Card data-check="tw-rounded" className="tw:rounded-lg">
            <CardHeader><CardTitle>Details <Badge variant="secondary">pending</Badge></CardTitle></CardHeader>
            <CardContent className="tw:space-y-3">
              <div data-check="tw-p4" className="tw:rounded-md tw:border tw:p-4" >p-4 · border</div>
              <div data-check="tw-border" className="tw:border tw:p-2">border token</div>
              <Button data-check="tw-btn">shadcn button</Button>
            </CardContent>
          </Card>
        </section>
      </div>
      <h2 className="tw:mt-8 tw:mb-2 tw:text-base tw:font-semibold">Computed-style checks</h2>
      <ul className="tw:space-y-1 tw:text-sm" data-testid="compat-results">
        {results.map((r) => (
          <li key={r.id} className="tw:flex tw:items-center tw:gap-2">
            <span className={cn("tw:size-2 tw:rounded-full", r.ok ? "tw:bg-emerald-600" : "tw:bg-red-600")} />
            <span className={r.ok ? "" : "tw:text-red-700"}>{r.ok ? "PASS" : "FAIL"}</span>
            <span>{r.label}</span>
            <span className="tw:font-mono tw:text-xs tw:text-muted-foreground">{r.prop}: {r.actual}{r.ok ? "" : ` (expected ${r.expect})`}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
