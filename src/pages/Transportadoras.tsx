import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";

export default function Transportadoras() {
  return (
    <AppLayout>
      <ModulePage
        title="Transportadoras"
        description="Gerencie as transportadoras cadastradas."
      >
        <div className="text-muted-foreground text-center py-12">
          Módulo em desenvolvimento.
        </div>
      </ModulePage>
    </AppLayout>
  );
}
