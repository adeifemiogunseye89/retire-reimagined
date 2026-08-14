import { useMemo, useState } from "react";
import { BookOpen, Search, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TIPS, type Tip, type TipCategory } from "@/data/tips";
import type { ProfileData } from "@/hooks/useDashboardData";

interface Props {
  profile: ProfileData | null;
}

const CATEGORY_LABELS: Record<TipCategory, string> = {
  savings: "Savings",
  pension: "Pension",
  informal_economy: "Informal economy",
  investing: "Investing",
};

const CATEGORY_ORDER: TipCategory[] = ["pension", "savings", "informal_economy", "investing"];

const TipsTab = ({ profile }: Props) => {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Show universal tips plus tips matching the user's country. No extra fetching.
  const visibleTips = useMemo(() => {
    const country = profile?.country ?? null;
    const q = query.trim().toLowerCase();
    return TIPS.filter((tip) => tip.country === null || tip.country === country).filter(
      (tip) => !q || tip.title.toLowerCase().includes(q)
    );
  }, [profile?.country, query]);

  const grouped = useMemo(() => {
    const map = new Map<TipCategory, Tip[]>();
    for (const category of CATEGORY_ORDER) {
      const items = visibleTips.filter((tip) => tip.category === category);
      if (items.length) map.set(category, items);
    }
    return map;
  }, [visibleTips]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-heading font-bold">Tips & explainers</h2>
        <p className="text-sm text-muted-foreground">
          Short, plain-language guides on pensions, savings and building income.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tips…"
          aria-label="Search tips by title"
          className="ps-9"
        />
      </div>

      {grouped.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-heading font-semibold text-lg">No tips found</h3>
          <p className="text-sm text-muted-foreground">Try a different search term.</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([category, tips]) => (
          <Card key={category} className="shadow-warm border-s-4 border-s-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-secondary" /> {CATEGORY_LABELS[category]}
                <Badge variant="outline" className="ms-auto text-xs">{tips.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tips.map((tip) => {
                const isOpen = openId === tip.id;
                return (
                  <div key={tip.id} className="rounded-lg bg-muted/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : tip.id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center gap-3 p-3 text-start"
                    >
                      <span className="flex-1 text-sm font-heading font-semibold">{tip.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <p className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed">{tip.body}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default TipsTab;
