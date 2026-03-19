import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { EmptyState } from "@/components/EmptyState";
import { ShoppingCart } from "lucide-react";

export default function CotacoesCompra() {
  return (
    <AppLayout>
      <ModulePage title="Cotações de Compra" subtitle="Compare propostas de fornecedores">
        <EmptyState
          icon={ShoppingCart}
          title="Nenhuma cotação de compra"
          description="Crie cotações para comparar preços e condições entre fornecedores."
          actionLabel="Nova Cotação de Compra"
        />
      </ModulePage>
    </AppLayout>
  );
}
