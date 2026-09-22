import { useState } from 'react';
import { InspectionStatus } from '@arvist/react/ui';

interface StyleMode {
  id: string;
  label: string;
  note: string;
  snippet: string;
  /** Wraps the preview so `.arvist-dark` can flip the theme tokens for that one box. */
  wrapperClassName: string;
  componentProps: {
    className?: string;
    classNames?: Record<string, string>;
    unstyled?: boolean;
  };
}

const PREVIEW_PROPS = {
  phase: 'in_progress' as const,
  progress: 0.62,
  connection: 'connected' as const,
  detail: 'ORD-77421 · SHP-10234',
};

const MODES: StyleMode[] = [
  {
    id: 'default',
    label: 'Default',
    note: 'No overrides at all. Every color, radius, and spacing value comes from the --arvist-* custom properties this demo sets in styles.css to match the Arvist brand palette. Drop the component in with no props and it already looks like this.',
    wrapperClassName: 'rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-4',
    componentProps: {},
    snippet: `<InspectionStatus
  phase="in_progress"
  progress={0.62}
  connection="connected"
  detail="ORD-77421 · SHP-10234"
/>`,
  },
  {
    id: 'dark',
    label: 'Dark theme',
    note: 'The component itself does not change. Wrapping it in a .arvist-dark ancestor swaps every token to its dark value, so a light host page can still run one dark panel. No prop on the component knows or cares which theme is active.',
    wrapperClassName: 'arvist-dark rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-4',
    componentProps: {},
    snippet: `<div className="arvist-dark">
  <InspectionStatus
    phase="in_progress"
    progress={0.62}
    connection="connected"
  />
</div>`,
  },
  {
    id: 'brand',
    label: 'Brand accent',
    note: 'The classNames prop targets one named part at a time (root, dot, fill, pct, and so on) and adds your classes alongside the built-in ones rather than replacing them. Nothing here is a fork; it is three extra classes on top of the same component.',
    wrapperClassName: 'rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-4',
    componentProps: {
      classNames: {
        root: 'ring-2 ring-brand-accent/40 shadow-[0_8px_24px_-8px_rgba(0,188,212,0.45)]',
        dot: 'shadow-[0_0_0_4px_rgba(0,188,212,0.25)]',
        fill: 'bg-gradient-to-r from-brand-accent to-brand-navy',
        pct: 'font-display font-semibold text-brand-navy',
      },
    },
    snippet: `<InspectionStatus
  phase="in_progress"
  progress={0.62}
  connection="connected"
  classNames={{
    root: 'ring-2 ring-brand-accent/40',
    fill: 'bg-gradient-to-r from-brand-accent to-brand-navy',
    pct: 'font-display font-semibold text-brand-navy',
  }}
/>`,
  },
  {
    id: 'unstyled',
    label: 'Unstyled',
    note: 'unstyled drops every built-in class. Markup, ARIA, and behavior stay exactly as they are, so classNames on this same component becomes the entire design. This is the escape hatch for a host app running its own design system end to end.',
    wrapperClassName: 'rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-surface p-4',
    componentProps: {
      unstyled: true,
      classNames: {
        root: 'flex flex-col gap-3 border-2 border-black bg-white p-4 font-mono',
        phase: 'flex items-center justify-between',
        phaseGroup: 'flex items-center gap-2',
        dot: 'h-2 w-2 bg-black',
        label: 'text-xs font-bold uppercase tracking-[0.2em] text-black',
        connection: 'text-[10px] font-bold uppercase tracking-widest text-black/50',
        detail: 'text-xs text-black/70',
        progress: 'flex items-center gap-2',
        bar: 'h-1.5 flex-1 bg-black/10',
        fill: 'h-full bg-black',
        pct: 'text-xs font-bold text-black',
      },
    },
    snippet: `<InspectionStatus
  phase="in_progress"
  progress={0.62}
  connection="connected"
  unstyled
  classNames={{
    root: 'flex flex-col gap-3 border-2 border-black bg-white p-4 font-mono',
    dot: 'h-2 w-2 bg-black',
    fill: 'h-full bg-black',
    // ...every other slot, your own design system throughout
  }}
/>`,
  },
];

/**
 * Four ways to restyle one real SDK component, switched live from the same
 * data. Nothing here is a mockup: each tab renders the actual `InspectionStatus`
 * import with different props, so the markup, the CSS variables, and the
 * `classNames`/`unstyled` props are exactly what a host app would ship.
 */
export function StyleShowcase() {
  const [modeId, setModeId] = useState(MODES[0].id);
  const mode = MODES.find((m) => m.id === modeId) ?? MODES[0];

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Styling approach" className="flex flex-wrap gap-1 rounded-full bg-arvist-surface-muted p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === modeId}
            onClick={() => setModeId(m.id)}
            className={
              m.id === modeId
                ? 'rounded-full bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-full px-3 py-1.5 text-xs font-medium text-arvist-text-muted hover:text-arvist-text'
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={mode.wrapperClassName}>
        <InspectionStatus {...PREVIEW_PROPS} {...mode.componentProps} />
      </div>

      <p className="sdk-note">{mode.note}</p>

      <pre className="overflow-x-auto rounded-[var(--arvist-radius)] border border-arvist-border bg-arvist-text/[0.04] p-3 font-mono text-[11px] leading-relaxed text-arvist-text">
        <code>{mode.snippet}</code>
      </pre>
    </div>
  );
}
