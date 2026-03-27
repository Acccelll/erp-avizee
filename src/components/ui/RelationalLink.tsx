import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelationalLinkProps {
  /** Label displayed before the value */
  label?: string;
  /** The display text (e.g. client name, NF number) */
  children: React.ReactNode;
  /** Route to navigate to */
  to?: string;
  /** If provided, calls this instead of navigating */
  onClick?: () => void;
  className?: string;
  mono?: boolean;
}

/**
 * Clickable relational link that navigates to a related entity.
 * Use inside ViewDrawer / ViewDrawerV2 to make FK references interactive.
 */
export function RelationalLink({ label, children, to, onClick, className, mono }: RelationalLinkProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    }
  };

  const isClickable = !!to || !!onClick;

  if (!isClickable) {
    return <span className={cn(mono && "font-mono", className)}>{children}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors font-medium",
        mono && "font-mono",
        className,
      )}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </button>
  );
}
