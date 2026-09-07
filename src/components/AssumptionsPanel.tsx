import { useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";
import { buildAssumptions } from "@/lib/assumptions";
import type { ProfileData } from "@/hooks/useDashboardData";

/**
 * Collapsible "How this is calculated" panel.
 * Presentation only — it describes the assumptions already stored on the
 * profile, and never changes any value or calculation.
 */
const AssumptionsPanel = ({
  profile,
  title = "How this is calculated",
  note,
}: {
  profile: ProfileData | null;
  title?: string;
  note?: string;
}) => {
  const [open, setOpen] = useState(false);
  const items = buildAssumptions(profile);

  return (
    <div className="rounded-xl border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-heading font-semibold">
          <ScrollText className="h-4 w-4 text-primary" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            These are the assumptions behind your figures. Change any of them in your profile and your
            numbers update — nothing here is hidden.
          </p>
          <dl className="space-y-3">
            {items.map((a) => (
              <div key={a.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs font-semibold">{a.label}</dt>
                  <dd className="text-xs font-semibold tabular-nums text-primary text-end">{a.value}</dd>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.explain}</p>
              </div>
            ))}
          </dl>
          {note && <p className="text-xs text-muted-foreground italic border-t pt-3">{note}</p>}
        </div>
      )}
    </div>
  );
};

export default AssumptionsPanel;
