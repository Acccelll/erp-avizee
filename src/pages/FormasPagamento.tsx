import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { EmptyState } from "@/components/EmptyState";
import { CreditCard } from "lucide-react";

export default function FormasPagamento() {
  return (
    <AppLayout>
      <ModulePage title="Formas de Pagamento" subtitle="Gerencie as condições de pagamento disponíveis">
        <EmptyState
          icon={CreditCard}
          title="Nenhuma forma de pagamento"
          description="Cadastre as formas de pagamento para usar em cotações, pedidos e financeiro."
          actionLabel="Nova Forma de Pagamento"
        />
      </ModulePage>
    </AppLayout>
  );
}
