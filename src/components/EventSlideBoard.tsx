import { Calendar, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventData } from "@/hooks/useDashboardData";

interface Props {
  events: EventData[];
}

const EventSlideBoard = ({ events }: Props) => {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max px-1">
        {events.map((event) => (
          <div
            key={event.id}
            className="min-w-[260px] max-w-[280px] rounded-lg border bg-card p-4 shadow-warm flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {event.type}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(event.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
              </span>
            </div>
            <h4 className="text-sm font-heading font-semibold leading-tight line-clamp-2">
              {event.title}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto w-full text-xs"
              onClick={() => event.link && window.open(event.link, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Register
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventSlideBoard;
