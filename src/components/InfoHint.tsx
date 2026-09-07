import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small info icon with a short plain-language explanation.
 * Used next to headline financial figures so no number is unexplained.
 */
const InfoHint = ({ text, label }: { text: string; label?: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label || `What this number means: ${text}`}
        className="inline-flex items-center text-muted-foreground/70 hover:text-primary transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[16rem] text-xs leading-relaxed">
      {text}
    </TooltipContent>
  </Tooltip>
);

export default InfoHint;
