// Centralized status definitions for all ERP modules

export const statusOrcamento: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "secondary" },
  enviado: { label: "Enviado", color: "info" },
  confirmado: { label: "Confirmado", color: "info" },
  aprovado: { label: "Aprovado", color: "success" },
  convertido: { label: "Convertido", color: "success" },
  rejeitado: { label: "Rejeitado", color: "destructive" },
  cancelado: { label: "Cancelado", color: "destructive" },
  expirado: { label: "Expirado", color: "warning" },
};

export const statusCompra: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Cotação", color: "secondary" },
  confirmado: { label: "Pedido Confirmado", color: "info" },
  parcial: { label: "Recebimento Parcial", color: "warning" },
  entregue: { label: "Entregue", color: "success" },
  cancelado: { label: "Cancelado", color: "destructive" },
};

export const statusOrdemVenda: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "secondary" },
  confirmado: { label: "Confirmada", color: "info" },
  faturado: { label: "Faturada", color: "success" },
  cancelado: { label: "Cancelada", color: "destructive" },
};

export const statusNotaFiscal: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "warning" },
  autorizada: { label: "Autorizada", color: "success" },
  cancelada: { label: "Cancelada", color: "destructive" },
  denegada: { label: "Denegada", color: "destructive" },
  inutilizada: { label: "Inutilizada", color: "secondary" },
};

export const statusFinanceiro: Record<string, { label: string; color: string }> = {
  aberto: { label: "Em Aberto", color: "warning" },
  parcial: { label: "Parcialmente Pago", color: "info" },
  pago: { label: "Pago", color: "success" },
  vencido: { label: "Vencido", color: "destructive" },
  cancelado: { label: "Cancelado", color: "secondary" },
  estornado: { label: "Estornado", color: "destructive" },
};

export const statusRemessa: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "warning" },
  em_transito: { label: "Em Trânsito", color: "info" },
  entregue: { label: "Entregue", color: "success" },
  devolvido: { label: "Devolvido", color: "destructive" },
};

export const statusCotacaoCompra: Record<string, { label: string; color: string }> = {
  aberta: { label: "Aberta", color: "info" },
  em_analise: { label: "Em Análise", color: "warning" },
  finalizada: { label: "Finalizada", color: "success" },
  cancelada: { label: "Cancelada", color: "destructive" },
};

// Helper to get label from any status schema
export function getStatusLabel(schema: Record<string, { label: string; color: string }>, status: string): string {
  return schema[status]?.label || status;
}

export function getStatusColor(schema: Record<string, { label: string; color: string }>, status: string): string {
  return schema[status]?.color || "secondary";
}

// Convert status schema to MultiSelect options
export function statusToOptions(schema: Record<string, { label: string; color: string }>): { value: string; label: string }[] {
  return Object.entries(schema).map(([value, { label }]) => ({ value, label }));
}
