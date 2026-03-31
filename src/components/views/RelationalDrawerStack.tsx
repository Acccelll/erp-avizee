import { useRelationalNavigation, EntityType, ViewState } from "@/contexts/RelationalNavigationContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
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
        const isTop = index === stack.length - 1;

        return (
          <Sheet key={`${view.type}-${view.id}-${index}`} open={isOpen} onOpenChange={(open) => !open && popView()}>
            <SheetContent
              side="right"
              className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col focus-visible:outline-none"
              style={{
                zIndex: 50 + index,
                // Optional: slight offset for stacked drawers if desired
                // transform: `translateX(${index * 4}px)`
              }}
            >
              <SheetHeader className="sticky top-0 z-10 bg-card border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3 min-w-0">
                  {index > 0 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={popView}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <SheetTitle className="text-lg truncate">{getTitle(view.type)}</SheetTitle>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearStack}>
                    <X className="h-4 w-4" />
                  </Button>
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
