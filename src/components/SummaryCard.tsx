import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string | number;
  variation?: string;
  variationType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function SummaryCard({
  title,
  value,
  variation,
  variationType = 'neutral',
  icon: Icon,
  onClick,
  className,
}: SummaryCardProps) {
  const variationColors = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'stat-card',
        onClick && 'cursor-pointer hover:border-primary/30 active:scale-[0.98]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground font-medium tracking-wide truncate">{title}</p>
          <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
          {variation && (
            <div className={cn('flex items-center gap-1 text-xs mt-1 font-medium', variationColors[variationType])}>
              {variationType === 'positive' && <ArrowUpIcon className="h-3 w-3" />}
              {variationType === 'negative' && <ArrowDownIcon className="h-3 w-3" />}
              <span>{variation}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-lg bg-accent">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryCard;
