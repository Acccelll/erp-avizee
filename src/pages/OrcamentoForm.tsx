import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteSearch } from "@/components/ui/AutocompleteSearch";
import { OrcamentoItemsGrid, type OrcamentoItem } from "@/components/Orcamento/OrcamentoItemsGrid";
import { OrcamentoTotaisCard } from "@/components/Orcamento/OrcamentoTotaisCard";
import { OrcamentoCondicoesCard } from "@/components/Orcamento/OrcamentoCondicoesCard";
import { OrcamentoSidebarSummary } from "@/components/Orcamento/OrcamentoSidebarSummary";
import { OrcamentoPdfTemplate } from "@/components/Orcamento/OrcamentoPdfTemplate";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, FileText, Copy } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ClienteSnapshot {
  nome_razao_social: string; nome_fantasia: string; cpf_cnpj: string;
  inscricao_estadual: string; email: string; telefone: string; celular: string;
  contato: string; logradouro: string; numero: string; bairro: string;
  cidade: string; uf: string; cep: string; codigo: string;
}

const emptyCliente: ClienteSnapshot = {
  nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "", inscricao_estadual: "",
  email: "", telefone: "", celular: "", contato: "", logradouro: "", numero: "",
  bairro: "", cidade: "", uf: "", cep: "", codigo: "",
};

export default function OrcamentoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  const isEdit = !!id;
  const isMobile = useIsMobile();

  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  const [numero, setNumero] = useState("");
  const [dataOrcamento, setDataOrcamento] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("rascunho");
  const [clienteId, setClienteId] = useState("");
  const [clienteSnapshot, setClienteSnapshot] = useState<ClienteSnapshot>(emptyCliente);
  const [items, setItems] = useState<OrcamentoItem[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [validade, setValidade] = useState("");

  const [desconto, setDesconto] = useState(0);
  const [impostoSt, setImpostoSt] = useState(0);
  const [impostoIpi, setImpostoIpi] = useState(0);
  const [freteValor, setFreteValor] = useState(0);
  const [outrasDespesas, setOutrasDespesas] = useState(0);

  const [pagamento, setPagamento] = useState("");
  const [prazoPagamento, setPrazoPagamento] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [freteTipo, setFreteTipo] = useState("");
  const [modalidade, setModalidade] = useState("");

  const totalProdutos = items.reduce((sum, i) => sum + (i.valor_total || 0), 0);
  const valorTotal = totalProdutos - desconto + impostoSt + impostoIpi + freteValor + outrasDespesas;
  const quantidadeTotal = items.reduce((sum, i) => sum + (i.quantidade || 0), 0);
  const pesoTotal = items.reduce((sum, i) => sum + (i.peso_total || 0), 0);

  useEffect(() => {
    const loadData = async () => {
      const [clientesRes, produtosRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("ativo", true).order("nome_razao_social"),
        supabase.from("produtos").select("*").eq("ativo", true).order("nome"),
      ]);
      setClientes(clientesRes.data || []);
      setProdutos(produtosRes.data || []);

      if (isEdit) {
        const { data: orc } = await supabase.from("orcamentos").select("*").eq("id", id).single();
        if (orc) {
          setNumero(orc.numero); setDataOrcamento(orc.data_orcamento); setStatus(orc.status);
          setClienteId(orc.cliente_id || ""); setObservacoes(orc.observacoes || "");
          setValidade(orc.validade || ""); setDesconto(orc.desconto || 0);
          setImpostoSt(orc.imposto_st || 0); setImpostoIpi(orc.imposto_ipi || 0);
          setFreteValor(orc.frete_valor || 0); setOutrasDespesas(orc.outras_despesas || 0);
          setPagamento(orc.pagamento || ""); setPrazoPagamento(orc.prazo_pagamento || "");
          setPrazoEntrega(orc.prazo_entrega || ""); setFreteTipo(orc.frete_tipo || "");
          setModalidade(orc.modalidade || "");
          if (orc.cliente_snapshot) setClienteSnapshot(orc.cliente_snapshot);
          const { data: itensData } = await supabase.from("orcamentos_itens").select("*").eq("orcamento_id", id);
          if (itensData) setItems(itensData);
        }
      } else {
        const { count } = await supabase.from("orcamentos").select("*", { count: "exact", head: true });
        setNumero(`COT${String((count || 0) + 1).padStart(6, "0")}`);
      }
    };
    loadData();
  }, [id, isEdit]);

  const handleClienteChange = useCallback((cId: string) => {
    setClienteId(cId);
    const c = clientes.find((cl: any) => cl.id === cId);
    if (c) {
      setClienteSnapshot({
        nome_razao_social: c.nome_razao_social || "", nome_fantasia: c.nome_fantasia || "",
        cpf_cnpj: c.cpf_cnpj || "", inscricao_estadual: c.inscricao_estadual || "",
        email: c.email || "", telefone: c.telefone || "", celular: c.celular || "",
        contato: c.contato || "", logradouro: c.logradouro || "", numero: c.numero || "",
        bairro: c.bairro || "", cidade: c.cidade || "", uf: c.uf || "",
        cep: c.cep || "", codigo: c.id?.substring(0, 6) || "",
      });
    }
  }, [clientes]);

  const handleSave = async () => {
    if (!numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        numero, data_orcamento: dataOrcamento, status, cliente_id: clienteId || null,
        validade: validade || null, observacoes, desconto, imposto_st: impostoSt,
        imposto_ipi: impostoIpi, frete_valor: freteValor, outras_despesas: outrasDespesas,
        valor_total: valorTotal, quantidade_total: quantidadeTotal, peso_total: pesoTotal,
        pagamento, prazo_pagamento: prazoPagamento, prazo_entrega: prazoEntrega,
        frete_tipo: freteTipo, modalidade, cliente_snapshot: clienteSnapshot,
      };

      let orcId = id;
      if (isEdit) {
        await supabase.from("orcamentos").update(payload).eq("id", id);
        await supabase.from("orcamentos_itens").delete().eq("orcamento_id", id);
      } else {
        const { data: newOrc, error } = await supabase.from("orcamentos").insert(payload).select().single();
        if (error) throw error;
        orcId = newOrc.id;
      }

      if (items.length > 0 && orcId) {
        const itemsPayload = items.filter(i => i.produto_id).map(i => ({
          orcamento_id: orcId, produto_id: i.produto_id, codigo_snapshot: i.codigo_snapshot,
          descricao_snapshot: i.descricao_snapshot, variacao: i.variacao || null,
          quantidade: i.quantidade, unidade: i.unidade, valor_unitario: i.valor_unitario,
          valor_total: i.valor_total, peso_unitario: i.peso_unitario || 0, peso_total: i.peso_total || 0,
        }));
        if (itemsPayload.length > 0) await supabase.from("orcamentos_itens").insert(itemsPayload);
      }

      toast.success("Cotação salva com sucesso!");
      if (!isEdit && orcId) navigate(`/cotacoes/${orcId}`, { replace: true });
    } catch (err: any) {
      console.error('[orcamento]', err);
      toast.error("Erro ao salvar cotação. Tente novamente.");
    }
    setSaving(false);
  };

  const handleDuplicate = async () => {
    if (!id) { toast.error("Salve o orçamento antes de duplicar"); return; }
    try {
      const { count } = await supabase.from("orcamentos").select("*", { count: "exact", head: true });
      const newNumero = `COT${String((count || 0) + 1).padStart(6, "0")}`;
      const payload = {
        numero: newNumero, data_orcamento: new Date().toISOString().split("T")[0], status: "rascunho",
        cliente_id: clienteId || null, validade: null, observacoes, desconto, imposto_st: impostoSt,
        imposto_ipi: impostoIpi, frete_valor: freteValor, outras_despesas: outrasDespesas,
        valor_total: valorTotal, quantidade_total: quantidadeTotal, peso_total: pesoTotal,
        pagamento, prazo_pagamento: prazoPagamento, prazo_entrega: prazoEntrega,
        frete_tipo: freteTipo, modalidade, cliente_snapshot: clienteSnapshot,
      };
      const { data: newOrc, error } = await supabase.from("orcamentos").insert(payload).select().single();
      if (error) throw error;

      if (items.length > 0) {
        const itemsPayload = items.filter(i => i.produto_id).map(i => ({
          orcamento_id: newOrc.id, produto_id: i.produto_id, codigo_snapshot: i.codigo_snapshot,
          descricao_snapshot: i.descricao_snapshot, variacao: i.variacao || null,
          quantidade: i.quantidade, unidade: i.unidade, valor_unitario: i.valor_unitario,
          valor_total: i.valor_total, peso_unitario: i.peso_unitario || 0, peso_total: i.peso_total || 0,
        }));
        await supabase.from("orcamentos_itens").insert(itemsPayload);
      }

      toast.success(`Duplicado: ${newNumero}`);
      navigate(`/cotacoes/${newOrc.id}`, { replace: true });
    } catch (err: any) {
      console.error('[orcamento] duplicar:', err);
      toast.error("Erro ao duplicar cotação. Tente novamente.");
    }
  };

  const handleGeneratePdf = async () => {
    setPreviewOpen(true);
    setTimeout(async () => {
      if (!pdfRef.current) return;
      try {
        const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${numero || "orcamento"}.pdf`);
        toast.success("PDF gerado com sucesso!");
      } catch {
        toast.error("Erro ao gerar PDF");
      }
    }, 500);
  };

  const handleTotalChange = (field: string, value: number) => {
    const setters: Record<string, (v: number) => void> = {
      desconto: setDesconto, imposto_st: setImpostoSt, imposto_ipi: setImpostoIpi,
      frete_valor: setFreteValor, outras_despesas: setOutrasDespesas,
    };
    setters[field]?.(value);
  };

  const handleCondicaoChange = (field: string, value: any) => {
    const setters: Record<string, (v: any) => void> = {
      pagamento: setPagamento, prazo_pagamento: setPrazoPagamento,
      prazo_entrega: setPrazoEntrega, frete_tipo: setFreteTipo, modalidade: setModalidade,
    };
    setters[field]?.(value);
  };

  const clienteOptions = clientes.map((c: any) => ({
    id: c.id, label: c.nome_razao_social, sublabel: c.cpf_cnpj || "",
  }));

  return (
    <AppLayout>
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cotacoes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="page-title text-xl md:text-2xl">{isEdit ? "Editar Cotação" : "Nova Cotação"}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Criação e emissão de proposta comercial</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:ml-12 md:flex md:flex-wrap">
          <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar Rascunho"}</Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2"><Eye className="w-4 h-4" />Visualizar</Button>
          <Button variant="secondary" onClick={handleGeneratePdf} className="gap-2"><FileText className="w-4 h-4" />Gerar PDF</Button>
          {isEdit && <Button variant="outline" onClick={handleDuplicate} className="gap-2"><Copy className="w-4 h-4" />Duplicar</Button>}
        </div>
        {isMobile && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cotação</p>
              <p className="mt-1 font-mono text-sm font-semibold">{numero || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total</p>
              <p className="mt-1 text-base font-semibold">{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cliente</p>
              <p className="mt-1 truncate text-sm">{clienteSnapshot.nome_razao_social || 'Selecione um cliente'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Itens</p>
              <p className="mt-1 text-sm">{items.filter(i => i.produto_id).length} item(ns)</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-5">
          {/* Dados do Orçamento */}
          <div className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-semibold text-foreground mb-4">Dados da Cotação</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Nº Cotação</Label><Input value={numero} onChange={(e) => setNumero(e.target.value)} className="font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Data</Label><Input type="date" value={dataOrcamento} onChange={(e) => setDataOrcamento(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="confirmado">Confirmada</SelectItem>
                    <SelectItem value="aprovado">Aprovada</SelectItem>
                    <SelectItem value="convertido">Convertida</SelectItem>
                    <SelectItem value="cancelado">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Validade</Label><Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></div>
            </div>
          </div>

          {/* Cliente */}
          <div className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-semibold text-foreground mb-4">Cliente</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs">Buscar Cliente</Label>
                  <AutocompleteSearch
                    options={clienteOptions}
                    value={clienteId}
                    onChange={handleClienteChange}
                    placeholder="Buscar por nome ou CNPJ..."
                  />
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Código</Label><Input value={clienteSnapshot.codigo} readOnly className="bg-accent/30 font-mono text-xs" /></div>
              </div>
              {clienteId && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm bg-accent/20 rounded-lg p-4">
                  <div className="md:col-span-2 space-y-1"><Label className="text-xs text-muted-foreground">Razão Social</Label><p className="font-medium">{clienteSnapshot.nome_razao_social}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Fantasia</Label><p>{clienteSnapshot.nome_fantasia || "—"}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">CNPJ/CPF</Label><p className="font-mono text-xs">{clienteSnapshot.cpf_cnpj || "—"}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">I.E.</Label><p>{clienteSnapshot.inscricao_estadual || "—"}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Email</Label><p>{clienteSnapshot.email || "—"}</p></div>
                  <div className="md:col-span-2 space-y-1"><Label className="text-xs text-muted-foreground">Endereço</Label><p>{clienteSnapshot.logradouro}{clienteSnapshot.numero ? `, ${clienteSnapshot.numero}` : ""} - {clienteSnapshot.bairro}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Cidade/UF</Label><p>{clienteSnapshot.cidade}/{clienteSnapshot.uf} - {clienteSnapshot.cep}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Telefone</Label><p>{clienteSnapshot.telefone || "—"}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Celular</Label><p>{clienteSnapshot.celular || "—"}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Contato</Label><p>{clienteSnapshot.contato || "—"}</p></div>
                </div>
              )}
            </div>
          </div>

          <OrcamentoItemsGrid items={items} onChange={setItems} produtos={produtos} />

          <OrcamentoTotaisCard
            totalProdutos={totalProdutos}
            form={{ valor_total: valorTotal, desconto, imposto_st: impostoSt, imposto_ipi: impostoIpi, frete_valor: freteValor, outras_despesas: outrasDespesas }}
            onChange={handleTotalChange}
          />

          <OrcamentoCondicoesCard
            form={{ quantidade_total: quantidadeTotal, peso_total: pesoTotal, pagamento, prazo_pagamento: prazoPagamento, prazo_entrega: prazoEntrega, frete_tipo: freteTipo, modalidade }}
            onChange={handleCondicaoChange}
          />

          <div className="bg-card rounded-xl border shadow-soft p-5">
            <h3 className="font-semibold text-foreground mb-3">Observações</h3>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Texto livre para observações comerciais, instruções, validade, condições extras, etc."
              className="min-h-[120px]" />
            <p className="text-xs text-muted-foreground mt-2">Este texto aparecerá no PDF do orçamento.</p>
          </div>
        </div>

        <div className="hidden lg:col-span-4 lg:block">
          <OrcamentoSidebarSummary
            status={status} numero={numero} clienteNome={clienteSnapshot.nome_razao_social}
            qtdItens={items.filter(i => i.produto_id).length} totalProdutos={totalProdutos}
            freteValor={freteValor} valorTotal={valorTotal}
            onSave={handleSave} onPreview={() => setPreviewOpen(true)}
            onGeneratePdf={handleGeneratePdf} saving={saving}
          />
        </div>
      </div>


        {isMobile && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm lg:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumo</p>
                <p className="mt-1 text-sm font-semibold">{clienteSnapshot.nome_razao_social || 'Sem cliente selecionado'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                <p className="mt-1 text-base font-semibold">{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-accent/40 p-3 text-center text-xs">
              <div>
                <p className="font-semibold text-muted-foreground">Itens</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{items.filter(i => i.produto_id).length}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Qtd.</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{quantidadeTotal}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Peso</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{pesoTotal.toFixed(2)} kg</p>
              </div>
            </div>
          </div>
        )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-card z-10">
            <h3 className="font-semibold">Pré-visualização do Orçamento</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
              <Button size="sm" onClick={handleGeneratePdf} className="gap-1.5"><FileText className="w-3.5 h-3.5" />Baixar PDF</Button>
            </div>
          </div>
          <div className="flex justify-center p-4 bg-muted/30">
            <OrcamentoPdfTemplate
              ref={pdfRef} numero={numero} data={dataOrcamento} cliente={clienteSnapshot}
              items={items.filter(i => i.produto_id)} totalProdutos={totalProdutos}
              desconto={desconto} impostoSt={impostoSt} impostoIpi={impostoIpi}
              freteValor={freteValor} outrasDespesas={outrasDespesas} valorTotal={valorTotal}
              quantidadeTotal={quantidadeTotal} pesoTotal={pesoTotal} pagamento={pagamento}
              prazoPagamento={prazoPagamento} prazoEntrega={prazoEntrega} freteTipo={freteTipo}
              modalidade={modalidade} observacoes={observacoes}
            />
          </div>
        </DialogContent>
      </Dialog>

      {isMobile && (
        <div className="fixed inset-x-0 bottom-[4.9rem] z-30 border-t border-border bg-background/95 px-3 py-3 backdrop-blur md:hidden">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)} className="h-11 rounded-xl text-xs">Preview</Button>
            <Button variant="secondary" onClick={handleGeneratePdf} className="h-11 rounded-xl text-xs">PDF</Button>
            <Button onClick={handleSave} disabled={saving} className="h-11 rounded-xl text-xs">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
