import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickAddClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (clienteId: string) => void;
}

export function QuickAddClientModal({ open, onClose, onCreated }: QuickAddClientModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_razao_social: "",
    nome_fantasia: "",
    cpf_cnpj: "",
    tipo_pessoa: "J",
    email: "",
    telefone: "",
    cidade: "",
    uf: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social.trim()) {
      toast.error("Nome / Razão Social é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nome_razao_social: form.nome_razao_social,
          nome_fantasia: form.nome_fantasia || null,
          cpf_cnpj: form.cpf_cnpj || null,
          tipo_pessoa: form.tipo_pessoa as any,
          email: form.email || null,
          telefone: form.telefone || null,
          cidade: form.cidade || null,
          uf: form.uf || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Cliente cadastrado!");
      onCreated(data.id);
      onClose();
      setForm({ nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "", tipo_pessoa: "J", email: "", telefone: "", cidade: "", uf: "" });
    } catch (err: any) {
      console.error("[quick-add-client]", err);
      toast.error("Erro ao cadastrar cliente.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Razão Social / Nome *</Label>
            <Input
              value={form.nome_razao_social}
              onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })}
              placeholder="Nome completo ou razão social"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo_pessoa} onValueChange={(v) => setForm({ ...form, tipo_pessoa: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="J">Jurídica</SelectItem>
                  <SelectItem value="F">Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.tipo_pessoa === "J" ? "CNPJ" : "CPF"}</Label>
              <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} placeholder={form.tipo_pessoa === "J" ? "00.000.000/0001-00" : "000.000.000-00"} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} className="uppercase" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
