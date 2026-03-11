import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";

const produtos = [
  { codigo: "PRD-001", nome: "Cabo HDMI 2.1 Premium", grupo: "Cabos", unidade: "UN", estoque: 142, custo: 18.5, preco: 39.9, status: "Ativo" },
  { codigo: "PRD-002", nome: "Adaptador USB-C Hub 7 em 1", grupo: "Adaptadores", unidade: "UN", estoque: 85, custo: 62.0, preco: 129.9, status: "Ativo" },
  { codigo: "PRD-003", nome: "Mousepad Gamer RGB 80x30", grupo: "Acessórios", unidade: "UN", estoque: 3, custo: 25.0, preco: 59.9, status: "Ativo" },
  { codigo: "PRD-004", nome: "Suporte Monitor Articulado", grupo: "Suportes", unidade: "UN", estoque: 28, custo: 95.0, preco: 199.9, status: "Ativo" },
  { codigo: "PRD-005", nome: "Webcam Full HD 1080p", grupo: "Eletrônicos", unidade: "UN", estoque: 0, custo: 110.0, preco: 249.9, status: "Inativo" },
];

const columns = [
  { key: "codigo", label: "Código", render: (p: any) => <span className="mono text-xs font-medium text-primary">{p.codigo}</span> },
  { key: "nome", label: "Nome" },
  { key: "grupo", label: "Grupo" },
  { key: "unidade", label: "UN" },
  { key: "estoque", label: "Estoque", render: (p: any) => (
    <span className={p.estoque <= 5 ? "text-destructive font-semibold" : ""}>{p.estoque}</span>
  )},
  { key: "custo", label: "Custo", render: (p: any) => `R$ ${p.custo.toFixed(2)}` },
  { key: "preco", label: "Preço Venda", render: (p: any) => <span className="font-semibold">R$ {p.preco.toFixed(2)}</span> },
  { key: "status", label: "Status", render: (p: any) => <StatusBadge status={p.status} /> },
];

const Produtos = () => {
  return (
    <AppLayout>
      <ModulePage title="Produtos" subtitle="Cadastro e gestão de produtos" addLabel="Novo Produto" count={produtos.length}>
        <DataTable columns={columns} data={produtos} />
      </ModulePage>
    </AppLayout>
  );
};

export default Produtos;
