import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";

const fornecedores = [
  { codigo: "FOR-001", nome: "Import Tech China LTDA", tipo: "PJ", documento: "11.222.333/0001-44", email: "vendas@importtech.com", telefone: "(11) 2222-3333", prazo: "30 dias", status: "Ativo" },
  { codigo: "FOR-002", nome: "Distribuidora Mega Cabos", tipo: "PJ", documento: "44.555.666/0001-77", email: "comercial@megacabos.com", telefone: "(19) 4444-5555", prazo: "45 dias", status: "Ativo" },
  { codigo: "FOR-003", nome: "Eletrônicos Premium SA", tipo: "PJ", documento: "77.888.999/0001-11", email: "pedidos@eletpremium.com", telefone: "(21) 6666-7777", prazo: "60 dias", status: "Ativo" },
];

const columns = [
  { key: "codigo", label: "Código", render: (f: any) => <span className="mono text-xs font-medium text-primary">{f.codigo}</span> },
  { key: "nome", label: "Razão Social" },
  { key: "documento", label: "CNPJ", render: (f: any) => <span className="mono text-xs">{f.documento}</span> },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "prazo", label: "Prazo" },
  { key: "status", label: "Status", render: (f: any) => <StatusBadge status={f.status} /> },
];

const Fornecedores = () => (
  <AppLayout>
    <ModulePage title="Fornecedores" subtitle="Cadastro e gestão de fornecedores" addLabel="Novo Fornecedor" count={fornecedores.length}>
      <DataTable columns={columns} data={fornecedores} />
    </ModulePage>
  </AppLayout>
);

export default Fornecedores;
