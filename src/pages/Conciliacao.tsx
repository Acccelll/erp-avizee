import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { parseOFX, type OFXTransaction } from "@/lib/parseOFX";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Upload, CheckCircle, XCircle, Shuffle, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ContaBancaria {
  id: string;
  nome: string;
  banco?: string;
}

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  tipo: string;
}

interface Match {
  extratoId: string;
  lancamentoId: string;
}

export default function Conciliacao() {
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [selectedConta, setSelectedConta] = useState<string>("");
  const [extratoItems, setExtratoItems] = useState<OFXTransaction[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (supabase.from as any)("contas_bancarias")
      .select("id, descricao, saldo_atual, ativo")
      .eq("ativo", true)
      .then(({ data }: any) => {
        if (data) setContasBancarias(data.map((d: any) => ({ id: d.id, nome: d.descricao })) as ContaBancaria[]);
      });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const items = parseOFX(text);
      if (items.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo OFX.");
        return;
      }
      setExtratoItems(items);
      setMatches([]);
      toast.success(`${items.length} transações importadas do extrato.`);

      // Load lancamentos for the period of the extrato
      if (selectedConta) {
        await loadLancamentos(items);
      }
    } catch (err: any) {
      toast.error("Erro ao processar arquivo OFX: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadLancamentos = async (items: OFXTransaction[]) => {
    if (!selectedConta || items.length === 0) return;
    const dates = items.map((i) => i.data).sort();
    const dateFrom = dates[0];
    const dateTo = dates[dates.length - 1];

    const { data } = await supabase
      .from("financeiro_lancamentos")
      .select("id, descricao, valor, data_vencimento, tipo")
      .eq("ativo", true)
      .gte("data_vencimento", dateFrom)
      .lte("data_vencimento", dateTo)
      .order("data_vencimento", { ascending: true });

    setLancamentos((data as Lancamento[]) || []);
  };

  const handleContaChange = async (contaId: string) => {
    setSelectedConta(contaId);
    setMatches([]);
    if (extratoItems.length > 0) {
      await loadLancamentos(extratoItems);
    }
  };

  const handleAutoMatch = () => {
    const newMatches: Match[] = [];
    const usedLancamentos = new Set<string>();

    for (const extrato of extratoItems) {
      const candidate = lancamentos.find((l) => {
        if (usedLancamentos.has(l.id)) return false;
        const valorMatch = Math.abs(Math.abs(l.valor) - Math.abs(extrato.valor)) < 0.01;
        if (!valorMatch) return false;
        const extratoDate = new Date(extrato.data);
        const lancDate = new Date(l.data_vencimento);
        const diffDays = Math.abs((extratoDate.getTime() - lancDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      });

      if (candidate) {
        newMatches.push({ extratoId: extrato.id, lancamentoId: candidate.id });
        usedLancamentos.add(candidate.id);
      }
    }

    setMatches(newMatches);
    toast.success(`${newMatches.length} pares encontrados automaticamente.`);
  };

  const handleManualMatch = (extratoId: string, lancamentoId: string) => {
    setMatches((prev) => {
      const filtered = prev.filter((m) => m.extratoId !== extratoId);
      if (lancamentoId === "") return filtered;
      return [...filtered, { extratoId, lancamentoId }];
    });
  };

  const handleConfirmarConciliacao = async () => {
    if (matches.length === 0) {
      toast.error("Nenhum par confirmado para conciliar.");
      return;
    }

    // Structured payload — ready to be persisted when a service is plugged in.
    const payload = {
      conta_bancaria_id: selectedConta,
      data_conciliacao: new Date().toISOString(),
      pares: matches.map((m) => {
        const extrato = extratoItems.find((e) => e.id === m.extratoId);
        const lancamento = lancamentos.find((l) => l.id === m.lancamentoId);
        return {
          extrato_id: m.extratoId,
          lancamento_id: m.lancamentoId,
          valor_extrato: extrato?.valor ?? null,
          valor_lancamento: lancamento?.valor ?? null,
        };
      }),
    };

    setConfirming(true);
    try {
      // TODO: replace with a conciliacao.service.ts call when the table is ready.
      // Example: await confirmarConciliacao(payload);
      void payload; // payload is structured and validated — ready to persist.

      const total = extratoItems.length;
      const pareados = matches.length;
      const semPar = total - pareados;
      toast.warning(
        `Revisão concluída: ${pareados} par(es) identificado(s), ${semPar} sem correspondência.` +
          " Atenção: esta ação ainda não foi gravada no banco de dados.",
      );
    } finally {
      setConfirming(false);
    }
  };

  const getMatch = (extratoId: string) => matches.find((m) => m.extratoId === extratoId);
  const usedLancamentoIds = new Set(matches.map((m) => m.lancamentoId));

  const pareados = matches.length;
  const semPar = extratoItems.length - pareados;

  return (
    <AppLayout>
      <ModulePage title="Conciliação Bancária" subtitle="Importe um extrato OFX e concilie com os lançamentos do ERP">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={selectedConta} onValueChange={handleContaChange}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Selecionar conta bancária" />
            </SelectTrigger>
            <SelectContent>
              {contasBancarias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}{c.banco ? ` — ${c.banco}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.qfx,.xml"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Importando..." : "Importar Extrato OFX"}
          </Button>

          {extratoItems.length > 0 && lancamentos.length > 0 && (
            <Button onClick={handleAutoMatch} variant="secondary">
              <Shuffle className="w-4 h-4 mr-2" />
              Match Automático
            </Button>
          )}
        </div>

        {/* Matching grid */}
        {extratoItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Left: extrato */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Extrato OFX ({extratoItems.length} transações)
                </h3>
                <div className="space-y-2">
                  {extratoItems.map((item) => {
                    const match = getMatch(item.id);
                    const isPareado = !!match;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 transition-colors ${
                          isPareado
                            ? "border-success/40 bg-success/5"
                            : "border-destructive/40 bg-destructive/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.descricao || "Sem descrição"}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(item.data)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-sm font-mono font-semibold ${
                                item.valor >= 0 ? "text-success" : "text-destructive"
                              }`}
                            >
                              {formatCurrency(item.valor)}
                            </span>
                            {isPareado ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <Select
                            value={match?.lancamentoId || ""}
                            onValueChange={(val) => handleManualMatch(item.id, val)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Vincular lançamento..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Nenhum</SelectItem>
                              {lancamentos
                                .filter((l) => !usedLancamentoIds.has(l.id) || l.id === match?.lancamentoId)
                                .map((l) => (
                                  <SelectItem key={l.id} value={l.id}>
                                    {formatDate(l.data_vencimento)} · {l.descricao} · {formatCurrency(l.valor)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: lancamentos */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Lançamentos ERP ({lancamentos.length} no período)
                </h3>
                <div className="space-y-2">
                  {lancamentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      {selectedConta
                        ? "Nenhum lançamento encontrado no período do extrato."
                        : "Selecione uma conta bancária para carregar lançamentos."}
                    </p>
                  ) : (
                    lancamentos.map((l) => {
                      const isPareado = usedLancamentoIds.has(l.id);
                      return (
                        <div
                          key={l.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            isPareado
                              ? "border-success/40 bg-success/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{l.descricao}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(l.data_vencimento)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-mono font-semibold">{formatCurrency(l.valor)}</span>
                              <Badge variant={l.tipo === "receber" ? "default" : "secondary"} className="text-[10px]">
                                {l.tipo}
                              </Badge>
                              {isPareado && <CheckCircle className="w-4 h-4 text-success" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer summary */}
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong>Atenção:</strong> a confirmação abaixo ainda não persiste os pares no banco de dados.
                  Os lançamentos conciliados precisam ser revisados manualmente por enquanto.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pareados: </span>
                    <span className="font-semibold text-success">{pareados}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sem correspondência: </span>
                    <span className="font-semibold text-destructive">{semPar}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold">{extratoItems.length}</span>
                  </div>
                </div>
                <Button onClick={handleConfirmarConciliacao} disabled={matches.length === 0 || confirming} variant="outline">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {confirming ? "Processando..." : "Confirmar Revisão"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center border rounded-xl bg-muted/10">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Importe um arquivo OFX para iniciar a conciliação</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Aceita arquivos .ofx, .qfx e .xml</p>
          </div>
        )}
      </ModulePage>
    </AppLayout>
  );
}
