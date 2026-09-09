import { useEffect, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (events.length < 2) return;

    let transitionTimer: number | undefined;
    const rotationTimer = window.setInterval(() => {
      setIsExiting(true);
      transitionTimer = window.setTimeout(() => {
        setActiveIndex((current) => (current + 1) % events.length);
        setIsExiting(false);
      }, 700);
    }, 45_000);

    return () => {
      window.clearInterval(rotationTimer);
      if (transitionTimer) window.clearTimeout(transitionTimer);
    };
  }, [events.length]);

  useEffect(() => {
    if (activeIndex >= events.length) setActiveIndex(0);
  }, [activeIndex, events.length]);

  if (!events.length) {
    return <p className="text-xs text-muted-foreground py-4">{t("empty.noEvents")}</p>;
  }

  const event = events[activeIndex] || events[0];

  return (
    <div className="w-full overflow-hidden pb-2" role="region" aria-roledescription="carousel">
      <div
        key={`${event.id}-${activeIndex}`}
        className={`w-full min-h-[180px] rounded-lg border bg-card p-4 shadow-warm flex flex-col gap-2 motion-reduce:animate-none ${
          isExiting ? "animate-carousel-slide-out" : "animate-carousel-slide-in"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
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
          {events.length > 1 && (
            <span className="text-xs tabular-nums text-muted-foreground" aria-hidden="true">
              {activeIndex + 1} / {events.length}
            </span>
          )}
        </div>
        <h4 className="text-sm font-heading font-semibold leading-tight line-clamp-2">{event.title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-3">{event.description}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-auto w-full text-xs"
          onClick={() => event.link && window.open(event.link, "_blank")}
        >
          <ExternalLink className="h-3 w-3 me-1" /> {t("events.register")}
        </Button>
      </div>
    </div>
  );
};

export default EventSlideBoard;
