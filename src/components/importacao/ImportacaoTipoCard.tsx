import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, List } from "lucide-react";

interface ImportacaoTipoCardProps {
  title: string;
  description: string;
  type: string;
  onImport: (type: string) => void;
  onViewBatches: (type: string) => void;
  summary?: {
    lastDate?: string;
    lastStatus?: string;
    totalBatches?: number;
  };
}

export function ImportacaoTipoCard({ title, description, type, onImport, onViewBatches, summary }: ImportacaoTipoCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {summary && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between border-b pb-1">
              <span>Última carga:</span>
              <span className="font-medium text-foreground">{summary.lastDate || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span>Status:</span>
              <span className="font-medium text-foreground">{summary.lastStatus || "Sem dados"}</span>
            </div>
            <div className="flex justify-between">
              <span>Total de lotes:</span>
              <span className="font-medium text-foreground">{summary.totalBatches || 0}</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onImport(type)}
          className="w-full gap-1.5"
        >
          <FileUp className="h-3.5 w-3.5" />
          Importar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewBatches(type)}
          className="w-full gap-1.5"
        >
          <List className="h-3.5 w-3.5" />
          Ver lotes
        </Button>
      </CardFooter>
    </Card>
  );
}
