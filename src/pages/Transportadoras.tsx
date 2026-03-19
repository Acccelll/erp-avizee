import { AppLayout } from "@/components/AppLayout";
import ModulePage from "@/components/ModulePage";
import { Truck } from "lucide-react";

export default function Transportadoras() {
  return (
    <AppLayout>
      <ModulePage
        title="Transportadoras"
        icon={Truck}
        description="Gerencie as transportadoras cadastradas."
      >
        <div className="text-muted-foreground text-center py-12">
          Módulo em desenvolvimento.
        </div>
      </ModulePage>
    </AppLayout>
  );
}
