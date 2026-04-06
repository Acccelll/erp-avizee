import { Badge } from '@/components/ui/badge';
import {
  FileEdit, Clock, CheckCircle, Cog, CheckCheck,
  AlertTriangle, XCircle, AlarmClock, Ban, Send, FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { classes: string; icon: typeof Clock; label: string }> = {
  rascunho:        { classes: 'bg-muted text-muted-foreground border-muted', icon: FileEdit, label: 'Rascunho' },
  pendente:        { classes: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'Pendente' },
  aberto:          { classes: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'Aberto' },
  aberta:          { classes: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'Aberta' },
  em_analise:      { classes: 'bg-info/10 text-info border-info/20', icon: FileSearch, label: 'Em Análise' },
  finalizada:      { classes: 'bg-success/10 text-success border-success/20', icon: CheckCheck, label: 'Finalizada' },
  convertida:      { classes: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle, label: 'Convertida em Pedido' },
  enviado:         { classes: 'bg-info/10 text-info border-info/20', icon: Send, label: 'Enviado' },
  aprovado:        { classes: 'bg-info/10 text-info border-info/20', icon: CheckCircle, label: 'Aprovado' },
  aprovada:        { classes: 'bg-info/10 text-info border-info/20', icon: CheckCircle, label: 'Aprovada' },
  processando:     { classes: 'bg-info/10 text-info border-info/20', icon: Cog, label: 'Processando' },
  em_separacao:    { classes: 'bg-warning/10 text-warning border-warning/20', icon: Cog, label: 'Em Separação' },
  concluido:       { classes: 'bg-success/10 text-success border-success/20', icon: CheckCheck, label: 'Concluído' },
  confirmado:      { classes: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'Aguardando Aprovação' },
  confirmada:      { classes: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'Aguardando Aprovação' },
  parcial:         { classes: 'bg-warning/10 text-warning border-warning/20', icon: AlertTriangle, label: 'Parcial' },
  cancelado:       { classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Cancelado' },
  cancelada:       { classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Cancelada' },
  rejeitado:       { classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Rejeitado' },
  expirado:        { classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlarmClock, label: 'Expirado' },
  vencido:         { classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlarmClock, label: 'Vencido' },
  bloqueado:       { classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: Ban, label: 'Bloqueado' },
  pago:            { classes: 'bg-success/10 text-success border-success/20', icon: CheckCheck, label: 'Pago' },
  faturado:        { classes: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle, label: 'Faturado' },
  convertido:      { classes: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle, label: 'Convertido' },
  entregue:        { classes: 'bg-success/10 text-success border-success/20', icon: CheckCheck, label: 'Entregue' },
  aguardando:      { classes: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'Aguardando' },
  total:           { classes: 'bg-success/10 text-success border-success/20', icon: CheckCheck, label: 'Total' },
  ativo:           { classes: 'bg-success/10 text-success border-success/20', icon: CheckCircle, label: 'Ativo' },
  inativo:         { classes: 'bg-muted text-muted-foreground border-muted', icon: Ban, label: 'Inativo' },
  simples:         { classes: 'bg-muted text-muted-foreground border-muted', icon: FileEdit, label: 'Simples' },
  composto:        { classes: 'bg-primary/10 text-primary border-primary/20', icon: Cog, label: 'Composto' },
};

const defaultConfig = { classes: 'bg-muted text-muted-foreground border-muted', icon: Clock, label: '' };

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status?.toLowerCase()] || defaultConfig;
  const Icon = config.icon;
  const displayLabel = label || config.label || status;

  return (
    <Badge variant="outline" className={cn('text-xs font-medium gap-1', config.classes, className)}>
      <Icon className="h-3 w-3" />
      {displayLabel}
    </Badge>
  );
}
