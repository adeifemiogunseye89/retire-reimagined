import { Calendar, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventData } from "@/hooks/useDashboardData";

interface Props {
  events: EventData[];
  locale?: string;
}

const EventSlideBoard = ({ events, locale }: Props) => {
  const { t, i18n } = useTranslation();
  const effectiveLocale = locale || i18n.language || "en";

  if (!events.length) {
    return <p className="text-xs text-muted-foreground py-4">{t("empty.noEvents")}</p>;
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max px-1">
        {events.map((event) => (
          <div
            key={event.id}
            className="min-w-[260px] max-w-[280px] rounded-lg border bg-card p-4 shadow-warm flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">{event.type}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {(() => {
                  try {
                    return new Date(event.date).toLocaleDateString(effectiveLocale, { month: "short", day: "numeric" });
                  } catch {
                    return new Date(event.date).toLocaleDateString();
                  }
                })()}
              </span>
            </div>
            <h4 className="text-sm font-heading font-semibold leading-tight line-clamp-2">{event.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto w-full text-xs"
              onClick={() => event.link && window.open(event.link, "_blank")}
            >
              <ExternalLink className="h-3 w-3 me-1" /> {t("events.register")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventSlideBoard;
