import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";

const clientes = [
  { codigo: "CLI-001", nome: "Tech Solutions LTDA", tipo: "PJ", documento: "12.345.678/0001-90", email: "contato@techsolutions.com", telefone: "(11) 3456-7890", status: "Ativo" },
  { codigo: "CLI-002", nome: "Maria Silva Santos", tipo: "PF", documento: "123.456.789-00", email: "maria@email.com", telefone: "(21) 98765-4321", status: "Ativo" },
  { codigo: "CLI-003", nome: "Distribuidora Nacional SA", tipo: "PJ", documento: "98.765.432/0001-10", email: "compras@distnacional.com", telefone: "(31) 3333-4444", status: "Ativo" },
  { codigo: "CLI-004", nome: "João Pedro Almeida", tipo: "PF", documento: "987.654.321-00", email: "joao.almeida@email.com", telefone: "(41) 99888-7766", status: "Inativo" },
];

const columns = [
  { key: "codigo", label: "Código", render: (c: any) => <span className="mono text-xs font-medium text-primary">{c.codigo}</span> },
  { key: "nome", label: "Nome / Razão Social" },
  { key: "tipo", label: "Tipo" },
  { key: "documento", label: "CPF/CNPJ", render: (c: any) => <span className="mono text-xs">{c.documento}</span> },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "status", label: "Status", render: (c: any) => <StatusBadge status={c.status} /> },
];

const Clientes = () => (
  <AppLayout>
    <ModulePage title="Clientes" subtitle="Cadastro e gestão de clientes" addLabel="Novo Cliente" count={clientes.length}>
      <DataTable columns={columns} data={clientes} />
    </ModulePage>
  </AppLayout>
);

export default Clientes;
