import { useEffect, useState, type ReactNode } from 'react';
import {
  getDisplayMessage,
  upcCoverage,
  useArvist,
  useBarcodeScanner,
  useExceptions,
  useInspection,
  useScanMatch,
  useShipmentMedia,
  useStationBinding,
} from '@arvist/react';
import {
  ExceptionList,
  InspectionStatus,
  MediaGallery,
  ReconciliationTable,
  StationStatus,
} from '@arvist/react/ui';
import type { MockBackend } from './mock/backend';
import { StyleShowcase } from './style-showcase';

const STATION_NAME = 'Z01-PS-001';

export interface QualityStationBoardProps {
  backend: MockBackend;
  autoCompleted: boolean;
  onAutoCompletedChange: (value: boolean) => void;
}

/**
 * This is the main demo page: one packing station where a worker scans
 * boxes and Arvist flags anything that needs attention.
 *
 * Everything below comes from `@arvist/react`. This file doesn't do any of
 * the actual inspection work itself. It doesn't count items, spot problems,
 * match barcodes, or check whether photos have expired; it just calls the
 * SDK's hooks and displays what they return. That's the whole point of this
 * demo: showing how much the SDK takes care of for you.
 *
 * Next to each section is a dashed box with a plain-language note explaining
 * what that hook or component does.
 */
export function QualityStationBoard({ backend, autoCompleted, onAutoCompletedChange }: QualityStationBoardProps) {
  const { resolveErrorMessage } = useArvist();

  // 1) Checks whether this station exists and is free to use right now. We
  // check again every 30 seconds, so if the station is removed or renamed
  // while this page is open, we find out quickly instead of work quietly
  // disappearing into a station nobody is watching.
  const binding = useStationBinding(STATION_NAME, { pollMs: 30_000 });

  // 2) The main hook for this whole page. It keeps track of one shipment as
  // it's inspected: what step it's on, how far along it is, whether we're
  // still connected for live updates, and whether it's allowed to be marked
  // complete yet.
  const inspection = useInspection({
    areaName: STATION_NAME,
    areaId: binding.station?.area_id,
    onCompleted: (shipment, reconciliation) => {
      console.info('[completed]', shipment.shipment_key, reconciliation.totals);
    },
  });

  // 3) Turns the shipment's raw problems into a friendly list of issues a
  // person can actually read and act on (e.g. "too many of this item",
  // "this box looks damaged").
  const exceptions = useExceptions(inspection.shipment, {
    onResolved: inspection.refresh,
    // There's no button that edits a count directly on the server. Instead we
    // just remember the correction here, and it gets sent along the next
    // time the inspection is submitted.
    onCorrectCount: ({ lineItem, quantity }) => inspection.stageCorrection(lineItem, quantity),
  });

  // 4) Photos taken during the inspection. We pass the whole `shipment`
  // object here, not just its id, because photos arrive gradually as each
  // unit is inspected. Passing only the id would fetch once and never
  // pick up later photos.
  const media = useShipmentMedia(inspection.shipment);

  const [toast, setToast] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [rawScans, setRawScans] = useState<string[]>([]);

  useEffect(() => backend.onLog((line) => setLog((l) => [line, ...l].slice(0, 40))), [backend]);

  // 5a) Listens for barcode scans anywhere on the page and shows exactly
  // what was scanned, whether or not it matches anything. This is here just
  // so you can see the raw scan data, separate from the "did it match"
  // check below.
  useBarcodeScanner({
    onScan: (scan) => setRawScans((s) => [`${scan.value} (${scan.kind})`, ...s].slice(0, 8)),
  });

  // 5b) The one most real screens actually use: it checks each scan against
  // the items in the current shipment (first by barcode, then by SKU if
  // there's no barcode on file). If nothing is being inspected yet, a scan is
  // treated as "a new box just arrived, start inspecting it".
  useScanMatch(inspection.shipment?.line_items, {
    enabled: inspection.phase !== 'starting',
    onMatch: (item) => setToast(`Matched ${item.name}`),
    onUnmatched: (scan) => {
      if (inspection.phase === 'idle') void startFromScan(scan.value);
      else setToast(`${scan.value} is not on this order`);
    },
  });

  const startFromScan = async (orderNumber: string) => {
    try {
      await inspection.start({ order_numbers: [orderNumber] });
    } catch (err) {
      setToast(getDisplayMessage(err, resolveErrorMessage));
    }
  };

  const complete = async () => {
    try {
      await inspection.finish();
      await inspection.submit();
    } catch (err) {
      setToast(getDisplayMessage(err, resolveErrorMessage));
    }
  };

  const coverage = upcCoverage(inspection.shipment?.line_items);

  return (
    <div className="min-h-screen">
      <header className="bg-brand-navy">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <img src="/logo-white.png" alt="Arvist" className="h-7 w-auto" />
          <span aria-hidden="true" className="h-5 w-px bg-white/20" />
          <span className="font-display text-sm font-semibold text-white/90">
            Quality Station Board
          </span>
        </div>
      </header>

      <div className="arvist-root arvist-touch mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-sm text-arvist-text-muted">
              This page has no real Arvist server behind it. It runs on scripted data so you can
              try it safely, using the same real <code>@arvist/react</code> hooks and components
              a production integration would use.
            </p>
            <label className="flex items-center gap-2 text-sm text-arvist-text-muted">
              <input
                type="checkbox"
                checked={autoCompleted}
                onChange={(e) => onAutoCompletedChange(e.target.checked)}
              />
              Shipment auto-completed upstream
            </label>
          </div>

          <Section
            title="Styling"
            note={
              <>
                Every component in <code>@arvist/react/ui</code> is built on <code>className</code>,
                per-slot <code>classNames</code>, and an <code>unstyled</code> escape hatch. Switch
                tabs above the preview to see the same <code>InspectionStatus</code> component under
                each one, with the exact props used shown below it.
              </>
            }
          >
            <StyleShowcase />
          </Section>

          <Section
            title="Station"
            note={
              <>
                <code>useStationBinding('{STATION_NAME}')</code> checks whether this station exists
                and is free to use right now. We check again every 30 seconds, so if the station gets
                removed or renamed while this page is open, we notice quickly instead of finding
                out later that work sent here went nowhere. <code>StationStatus</code> is simply
                the box below; it displays whatever this hook finds.
              </>
            }
          >
            <StationStatus areaName={STATION_NAME} {...binding} />
          </Section>

          <Section
            title="Inspection"
            note={
              <>
                <code>useInspection()</code> is the main hook on this page. It keeps track of one
                shipment as it moves through steps: <code>idle → starting → in_progress → review →
                completed</code>. It also tells us <code>connection</code> (whether we're still
                getting live updates) separately from <code>phase</code>, so a quiet station with no
                activity can be told apart from a broken connection.{' '}
                <code>InspectionStatus</code> just displays those values below.
              </>
            }
          >
            <InspectionStatus
              phase={inspection.phase}
              progress={inspection.progress}
              connection={inspection.connection}
              detail={
                inspection.shipment
                  ? `${inspection.shipment.order_numbers.join(', ')} · ${inspection.shipment.shipment_key}`
                  : 'Scan a tote to begin'
              }
            />
            {inspection.error ? (
              <p
                role="alert"
                className="mt-2 rounded-[var(--arvist-radius)] border border-arvist-blocking/40 bg-arvist-blocking-surface px-4 py-3 text-sm"
              >
                {getDisplayMessage(inspection.error, resolveErrorMessage)}
              </p>
            ) : null}
          </Section>

          <Section
            title="Barcode scanning"
            note={
              <>
                There are two hooks here, doing two different jobs.{' '}
                <code>useBarcodeScanner</code> just listens for scans anywhere on the page. It can
                tell a barcode scanner apart from a person typing, because a scanner types much
                faster than any human. <code>useScanMatch</code> builds on top of that: it takes
                each scan and checks it against the items in the current shipment, first by barcode
                number, then by SKU if there's no barcode on file (not every item has one). The
                banner below comes from <code>upcCoverage()</code> and just warns you when some
                items are missing a barcode. Try it: click a chip on the right, or type some digits
                on your keyboard and press Enter. This page listens everywhere, not just in a
                text box.
              </>
            }
          >
            {coverage.total > 0 && coverage.ratio < 1 ? (
              <p className="mb-2 rounded-[var(--arvist-radius)] border border-arvist-warning/40 bg-arvist-warning-surface px-4 py-2 text-sm">
                {coverage.withUpc} of {coverage.total} lines carry a UPC; the rest fall back to
                SKU matching.
              </p>
            ) : null}
            <div className="rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-3 text-sm">
              <p className="mb-1 font-medium">Raw scans (useBarcodeScanner)</p>
              <p className="text-arvist-text-muted">
                {rawScans.length === 0 ? 'Nothing scanned yet.' : rawScans.join(' · ')}
              </p>
            </div>
          </Section>

          <Section
            title="Exceptions"
            note={
              <>
                The server only stores four basic kinds of problems.{' '}
                <code>useExceptions</code> turns those into nine clearer categories a person can
                actually act on. For example, it combines "we don't recognize this item" into one
                card instead of two separate ones, and it relabels a cancelled item as "removed"
                instead of something more confusing. When you click a button below to resolve an
                issue, it calls <code>exceptions.resolve()</code>, which sends the right details to
                the server for that action and then refreshes the inspection.
              </>
            }
          >
            <ExceptionList
              exceptions={exceptions.exceptions}
              resolvingKey={exceptions.resolving}
              onResolve={async (exception, resolution, reason) => {
                await exceptions.resolve({
                  exception,
                  resolution,
                  reason,
                  annotation:
                    resolution.action === 'identify_product'
                      ? { image_id: 5000, annotation: { id: 1, category_id: 3, identifiers: { items_quantity: 1 } } }
                      : undefined,
                  identifier: resolution.action === 'submit_identifiers' ? 'LPN-000123' : undefined,
                  quantity:
                    resolution.action === 'correct_count' ? exception.quantities?.expected : undefined,
                });
                setToast(`${exception.title} · ${resolution.label}`);
              }}
            />
          </Section>

          {inspection.shipment ? (
            <Section
              title="Reconciliation"
              note={
                <>
                  <code>reconcile()</code> and <code>checkCompletion()</code> work out expected vs.
                  actual counts, and whether this inspection is allowed to be marked complete. While
                  the shipment is still <code>in_progress</code>, a low count isn't treated as a
                  real problem yet, since counts naturally start at zero and climb up as items get
                  scanned. Once the shipment reaches <code>review</code>, a low
                  count does block completion, because at that point counting is supposed to be
                  done. Try turning on "Shipment auto-completed upstream" above to see that rule
                  change.
                </>
              }
            >
              <div className="rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-3">
                <ReconciliationTable
                  reconciliation={inspection.reconciliation}
                  final={inspection.phase === 'completed'}
                  showBarcode
                />
              </div>
            </Section>
          ) : null}

          {media.items.length > 0 ? (
            <Section
              title="Capture"
              note={
                <>
                  <code>useShipmentMedia</code> fetches photos taken during the inspection. It's
                  given the whole <code>shipment</code> object, not just its id, because photos
                  arrive gradually, one unit at a time, as the inspection happens. If it only had
                  the id, it would fetch once and then never show later photos. These photo links
                  also expire after about 30 minutes; <code>media.stale</code> tells us when that's
                  about to happen, and <code>media.refresh</code> (wired to the button in the
                  gallery) fetches fresh ones.
                </>
              }
            >
              <MediaGallery items={media.items} stale={media.stale} onRefresh={media.refresh} />
            </Section>
          ) : null}

          <footer className="flex flex-wrap items-center gap-3">
            {inspection.corrections.length > 0 ? (
              <span className="text-sm text-arvist-text-muted">
                {inspection.corrections.length} count correction(s) staged, sent on submit rather
                than written live.
              </span>
            ) : null}
            <button
              type="button"
              onClick={complete}
              disabled={!inspection.completion.canComplete || !inspection.shipment || inspection.loading}
              className="rounded-[var(--arvist-radius)] bg-arvist-info px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Complete inspection
            </button>
            {inspection.completion.reason ? (
              <span className="text-sm text-arvist-blocking">{inspection.completion.reason}</span>
            ) : null}
          </footer>
        </div>

        <aside className="space-y-4">
          <div className="space-y-2 rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-arvist-text-muted">
              Simulate the warehouse
            </h2>
            <p className="text-xs text-arvist-text-muted">
              These buttons stand in for things that happen in a real warehouse: a box getting
              scanned, a unit finishing inspection. They're not part of the SDK; they just fake
              real-world events so this page has something to react to.
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => startFromScan('ORD-77421')}>Scan tote</Btn>
              <Btn onClick={backend.advance}>Next unit</Btn>
              <Btn onClick={backend.reset}>Reset</Btn>
            </div>
          </div>

          <div className="rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-arvist-text-muted">
              Event log
            </h2>
            <p className="sdk-note mb-2">
              A live list of every request the SDK sends and every real-time update it gets back,
              in the order they happen. Handy for seeing exactly what happens when you click a
              button above.
            </p>
            <ol className="max-h-96 space-y-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-arvist-text-muted">
              {log.length === 0 ? <li>Nothing yet.</li> : log.map((line, i) => <li key={i}>{line}</li>)}
            </ol>
          </div>
        </aside>

        {toast ? (
          <div
            role="status"
            onAnimationEnd={() => setToast(null)}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-arvist-text px-4 py-2 text-sm text-arvist-surface shadow-lg"
          >
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Groups an SDK-powered panel with a visible "how this works" note beside it. */
function Section({ title, note, children }: { title: string; note: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-arvist-text-muted">{title}</h2>
        {children}
      </div>
      <p className="sdk-note">{note}</p>
    </section>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--arvist-radius)] border border-arvist-border px-3 py-1.5 text-sm font-medium hover:bg-arvist-surface-muted"
    >
      {children}
    </button>
  );
}
