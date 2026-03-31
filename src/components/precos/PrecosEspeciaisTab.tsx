import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Tag, Calendar, User, Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { ProductSelector, ClientSelector } from "@/components/ui/DataSelector";

type PrecoEspecial = Tables<"precos_especiais"> & {
  clientes?: { nome_razao_social: string };
  produtos?: { nome: string; sku: string; preco_venda: number };
};

interface Props {
  clienteId?: string;
  produtoId?: string;
}

export function PrecosEspeciaisTab({ clienteId, produtoId }: Props) {
  const [loading, setLoading] = useState(true);
  const [precos, setPrecos] = useState<PrecoEspecial[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PrecoEspecial> | null>(null);
  const [saving, setSaving] = useState(false);

  // Cache para seletores
  const [allProdutos, setAllProdutos] = useState<any[]>([]);
  const [allClientes, setAllClientes] = useState<any[]>([]);

  const fetchPrecos = async () => {
    setLoading(true);
    let query = supabase
      .from("precos_especiais")
      .select("*, clientes(nome_razao_social), produtos(nome, sku, preco_venda)");

    if (clienteId) query = query.eq("cliente_id", clienteId);
    if (produtoId) query = query.eq("produto_id", produtoId);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar preços especiais");
    } else {
      setPrecos(data || []);
    }
    setLoading(false);
  };

  const loadSelectionData = async () => {
    if (clienteId && allProdutos.length === 0) {
      const { data } = await supabase.from("produtos").select("*, produtos_fornecedores(*, fornecedores(nome_razao_social))").eq("ativo", true).order("nome");
      setAllProdutos(data || []);
    }
    if (produtoId && allClientes.length === 0) {
      const { data } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome_razao_social");
      setAllClientes(data || []);
    }
  };

  useEffect(() => {
    fetchPrecos();
  }, [clienteId, produtoId]);

  const openCreate = async () => {
    await loadSelectionData();
    setEditing({
      cliente_id: clienteId || "",
      produto_id: produtoId || "",
      preco_especial: 0,
      ativo: true,
    });
    setModalOpen(true);
  };

  const openEdit = async (p: PrecoEspecial) => {
    await loadSelectionData();
    setEditing(p);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.cliente_id || !editing?.produto_id || !editing?.preco_especial) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSaving(true);
    const payload = {
      cliente_id: editing.cliente_id,
      produto_id: editing.produto_id,
      preco_especial: editing.preco_especial,
      desconto_percentual: editing.desconto_percentual || null,
      vigencia_inicio: editing.vigencia_inicio || null,
      vigencia_fim: editing.vigencia_fim || null,
      observacao: editing.observacao || null,
      ativo: editing.ativo ?? true,
    };

    try {
      let error;
      if (editing.id) {
        ({ error } = await supabase.from("precos_especiais").update(payload).eq("id", editing.id));
      } else {
        ({ error } = await supabase.from("precos_especiais").insert(payload));
      }

      if (error) throw error;

      toast.success("Preço especial salvo!");
      setModalOpen(false);
      fetchPrecos();
    } catch (err: any) {
      console.error(err);
      toast.error(err.code === "23505" ? "Já existe um preço especial para este vínculo" : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este preço especial?")) return;
    const { error } = await supabase.from("precos_especiais").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Excluído");
      fetchPrecos();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="w-4 h-4" /> Preços Especiais de Venda
        </h4>
        <Button size="sm" variant="outline" onClick={openCreate} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Adicionar Regra
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{clienteId ? "Produto" : "Cliente"}</TableHead>
              <TableHead className="text-right">Preço Especial</TableHead>
              <TableHead className="text-center">Vigência</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : precos.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">Nenhum preço especial cadastrado</TableCell></TableRow>
            ) : (
              precos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-sm">
                      {clienteId ? p.produtos?.nome : p.clientes?.nome_razao_social}
                    </p>
                    {clienteId && p.produtos?.sku && (
                      <p className="text-[10px] text-muted-foreground font-mono">{p.produtos.sku}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(p.preco_especial)}
                    {p.desconto_percentual && (
                      <span className="block text-[10px] text-success">-{p.desconto_percentual}% s/ original</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {p.vigencia_inicio || p.vigencia_fim ? (
                      <span className="flex flex-col">
                        {p.vigencia_inicio ? `Início: ${formatDate(p.vigencia_inicio)}` : ""}
                        {p.vigencia_fim ? `Fim: ${formatDate(p.vigencia_fim)}` : ""}
                      </span>
                    ) : "Permanente"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${p.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="h-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar" : "Novo"} Preço Especial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {clienteId ? (
              <div className="space-y-2">
                <Label>Produto *</Label>
                <div className="flex gap-2">
                  <ProductSelector
                    produtos={allProdutos}
                    onSelect={(p) => setEditing({ ...editing, produto_id: p.id, preco_especial: p.preco_venda })}
                    trigger={
                      <Button variant="outline" className="w-full justify-start font-normal text-muted-foreground overflow-hidden">
                        <Package className="w-4 h-4 mr-2 shrink-0" />
                        <span className="truncate">
                          {allProdutos.find(p => p.id === editing?.produto_id)?.nome || "Selecionar produto..."}
                        </span>
                      </Button>
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <ClientSelector
                  clientes={allClientes}
                  onSelect={(c) => setEditing({ ...editing, cliente_id: c.id })}
                  trigger={
                    <Button variant="outline" className="w-full justify-start font-normal text-muted-foreground">
                      <User className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">
                        {allClientes.find(c => c.id === editing?.cliente_id)?.nome_razao_social || "Selecionar cliente..."}
                      </span>
                    </Button>
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Especial (R$) *</Label>
                <Input
                  type="number" step="0.01"
                  value={editing?.preco_especial || ""}
                  onChange={(e) => setEditing({ ...editing, preco_especial: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number" step="0.1"
                  value={editing?.desconto_percentual || ""}
                  onChange={(e) => setEditing({ ...editing, desconto_percentual: Number(e.target.value) })}
                  placeholder="Informativo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Início</Label>
                <Input
                  type="date"
                  value={editing?.vigencia_inicio || ""}
                  onChange={(e) => setEditing({ ...editing, vigencia_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Fim</Label>
                <Input
                  type="date"
                  value={editing?.vigencia_fim || ""}
                  onChange={(e) => setEditing({ ...editing, vigencia_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={editing?.observacao || ""}
                onChange={(e) => setEditing({ ...editing, observacao: e.target.value })}
                className="min-h-[60px]"
              />
            </div>

            <div className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" id="ativo"
                checked={editing?.ativo ?? true}
                onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="ativo" className="cursor-pointer">Regra Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
