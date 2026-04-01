import { useRelationalNavigation, EntityType, ViewState, MAX_DRAWER_DEPTH } from "@/contexts/RelationalNavigationContext";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, X, AlertTriangle } from "lucide-react";
import { ProdutoView } from "./ProdutoView";
import { ClienteView } from "./ClienteView";
import { FornecedorView } from "./FornecedorView";
import { OrcamentoView } from "./OrcamentoView";
import { PedidoCompraView } from "./PedidoCompraView";
import { NotaFiscalView } from "./NotaFiscalView";
import { RemessaView } from "./RemessaView";
import { OrdemVendaView } from "./OrdemVendaView";

export function RelationalDrawerStack() {
  const { stack, popView, clearStack } = useRelationalNavigation();
  const atLimit = stack.length >= MAX_DRAWER_DEPTH;

  const renderView = (view: ViewState) => {
    switch (view.type) {
      case "produto": return <ProdutoView id={view.id} />;
      case "cliente": return <ClienteView id={view.id} />;
      case "fornecedor": return <FornecedorView id={view.id} />;
      case "orcamento": return <OrcamentoView id={view.id} />;
      case "pedido_compra": return <PedidoCompraView id={view.id} />;
      case "nota_fiscal": return <NotaFiscalView id={view.id} />;
      case "remessa": return <RemessaView id={view.id} />;
      case "ordem_venda": return <OrdemVendaView id={view.id} />;
      default: return <div className="p-4">Visualização não implementada para {view.type}</div>;
    }
  };

  const getTitle = (type: EntityType) => {
    const titles: Record<EntityType, string> = {
      produto: "Detalhes do Produto",
      cliente: "Detalhes do Cliente",
      fornecedor: "Detalhes do Fornecedor",
      orcamento: "Cotação / Orçamento",
      pedido_compra: "Pedido de Compra",
      nota_fiscal: "Nota Fiscal",
      remessa: "Remessa / Rastreio",
      ordem_venda: "Ordem de Venda",
    };
    return titles[type] || "Detalhes";
  };

  return (
    <>
      {stack.map((view, index) => {
        const isOpen = true; // Managed by presence in stack
        return (
          <Sheet key={`${view.type}-${view.id}-${index}`} open={isOpen} onOpenChange={(open) => !open && popView()}>
            <SheetContent
              side="right"
              className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col focus-visible:outline-none transition-all duration-300 ease-out border-l"
              style={{
                zIndex: 50 + index,
                transform: `translateX(${Math.max(0, (stack.length - 1 - index) * -8)}px)`,
                boxShadow: `${(index + 1) * -6}px 0 ${(index + 1) * 16}px rgba(15, 23, 42, 0.12)`,
                borderLeftColor: `hsl(var(--primary) / ${Math.min(0.18 + index * 0.06, 0.45)})`
              }}
            >
              <SheetHeader className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex flex-col gap-1.5 space-y-0">
                {/* Breadcrumb trail — shown only when stack depth > 1 */}
                {stack.length > 1 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto pb-1">
                    {stack.slice(0, index).map((prev, i) => (
                      <span key={i} className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="hover:text-foreground transition-colors hover:underline underline-offset-2"
                          onClick={() => {
                            const stepsBack = index - i;
                            for (let s = 0; s < stepsBack; s++) popView();
                          }}
                        >
                          {getTitle(prev.type)}
                        </button>
                        <span className="opacity-40">›</span>
                      </span>
                    ))}
                    <span className="font-medium text-foreground shrink-0">{getTitle(view.type)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {index > 0 && (
                      <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1" onClick={popView}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-xs">Voltar para {getTitle(stack[index - 1].type)}</span>
                      </Button>
                    )}
                    <SheetTitle className="text-base truncate">{getTitle(view.type)}</SheetTitle>
                    <SheetDescription className="sr-only">Visualização de {getTitle(view.type)}</SheetDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Depth-limit warning — visible only on the topmost drawer when at limit */}
                    {isTop && atLimit && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center justify-center h-8 w-8 text-amber-500">
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-center">
                          Profundidade máxima atingida ({MAX_DRAWER_DEPTH} drawers). Ao abrir um novo, o mais antigo será fechado automaticamente.
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearStack}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Fechar tudo <kbd className="ml-1 text-xs opacity-70">⇧ ESC</kbd>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 px-6 py-4">
                {renderView(view)}
              </div>
            </SheetContent>
          </Sheet>
        );
      })}
    </>
  );
}
