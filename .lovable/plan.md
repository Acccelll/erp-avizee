

# Análise: O que foi feito vs. O que falta no ERP AviZee

## Mapeamento Documentação vs. Implementação Atual

### FEITO (Implementado)

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Cadastros** | Completo | Produtos, Clientes, Fornecedores, Transportadoras, Formas de Pagamento, Grupos Econômicos — todos com CRUD, drawer de visualização padronizado, KPIs e abas |
| **Vendas / Cotações** | Completo | Cotações (orçamentos) com formulário dedicado, itens, PDF, listagem, drawer. Conversão para OV |
| **Ordens de Venda** | Completo | Listagem, drawer, status de faturamento, vínculo com cotação |
| **Pedidos (pipeline)** | Completo | Visão unificada de cotações confirmadas + OVs pendentes |
| **Compras** | Completo | Pedidos de compra com CRUD, itens, drawer, vínculo com fornecedor |
| **Estoque** | Completo | Posição atual, movimentações (entrada/saída/ajuste), alerta de mínimo, ajuste manual com motivo |
| **Financeiro** | Completo | Contas a pagar/receber, baixas, filtros por período/status/tipo, lançamento manual, conta contábil |
| **Caixa** | Completo | Movimentos de caixa, resumo, filtros |
| **Fluxo de Caixa** | Completo | Página dedicada |
| **Contas Bancárias** | Completo | CRUD com drawer |
| **Plano de Contas** | Completo | Contas contábeis hierárquicas |
| **Fiscal** | Completo | Notas de entrada/saída, itens, rascunho/confirmação/cancelamento, consulta NF-e |
| **Dashboard** | Completo | Cards KPI, filtro de período, alertas (estoque baixo, backlog, compras aguardando), gráficos, orçamentos e compras recentes |
| **Relatórios** | Completo | 6 tipos (estoque, movimentos, financeiro, fluxo de caixa, vendas, compras), gráficos, exportação CSV, PDF |
| **Autenticação** | Completo | Login, Signup, Forgot/Reset Password, AuthContext, ProtectedRoute |
| **Usuários/Permissões** | Parcial | Roles (admin, vendedor, financeiro, estoquista) via `user_roles` + RLS. AdminRoute implementado |
| **Administração** | Completo | Empresa, Usuários, E-mails, Parâmetros Fiscais/Financeiros |
| **Auditoria** | Completo | Logs de auditoria com visualização para admins |
| **Perfil** | Completo | Página de perfil do usuário |
| **Navegação** | Completo | Sidebar hierárquica, busca global (Ctrl+K), breadcrumbs, quick actions, tema claro/escuro, mobile bottom nav |
| **Infraestrutura** | Completo | Supabase Cloud, migrations, RLS, Edge Function (email queue), CI com GitHub Actions |

---

### PENDENTE (Gaps identificados na documentação)

| # | Item | Prioridade | Complexidade | Descrição |
|---|------|-----------|-------------|-----------|
| 1 | **Cotações de Compra** | Alta | Média | Página `CotacoesCompra.tsx` é apenas um placeholder (EmptyState). Documentação prevê comparação de propostas entre fornecedores com itens, preços e seleção do melhor fornecedor |
| 2 | **Integração fiscal real (SEFAZ)** | Alta | Muito Alta | Emissão de NF-e via SEFAZ, XML assinado, DANFE. Atualmente o fiscal é apenas controle interno sem integração real |
| 3 | **Motor tributário completo** | Alta | Alta | Cálculo automático de CFOP, CST, NCM, ICMS, PIS, COFINS, IPI baseado em regras fiscais. Campos existem nas tabelas mas sem lógica de cálculo |
| 4 | **Conciliação bancária** | Média | Alta | Importação de OFX, matching automático entre extratos e lançamentos financeiros |
| 5 | **Estorno de NF confirmada** | Média | Média | Reversão de estoque e financeiro ao estornar uma nota fiscal já confirmada |
| 6 | **Estoque por variação/SKU e múltiplos depósitos** | Média | Alta | Controle de estoque por variações do produto e por local de armazenamento. Hoje é estoque único por produto |
| 7 | **Exportação Excel (XLSX)** | Baixa | Baixa | Documentação menciona exportação Excel além de CSV/PDF. Apenas CSV e PDF estão implementados |
| 8 | **Envio de cotação por e-mail** | Média | Média | Envio do PDF da cotação diretamente por e-mail ao cliente. Edge Function de email existe mas não está integrada ao fluxo de cotações |
| 9 | **Histórico de preços de compra por produto** | Baixa | Baixa | Tabela `produtos_fornecedores` existe mas não há tela dedicada para análise de evolução de custos |
| 10 | **Valorização do estoque** | Baixa | Média | Relatório de valor total do estoque por método (custo médio, FIFO). Hoje mostra apenas quantidades |
| 11 | **Auditoria por usuario_criacao/ultima_modificacao** | Baixa | Média | Documentação prevê campos `usuario_criacao_id` e `usuario_ultima_modificacao_id` nas entidades. Hoje existe tabela `auditoria_logs` separada, mas não campos inline |

---

### Resumo Quantitativo

- **Módulos documentados**: 10 (Cadastros, Vendas, Compras, Financeiro, Estoque, Fiscal, Dashboard, Relatórios, Usuários, Administração)
- **Módulos implementados**: 10/10 com funcionalidade base
- **Funcionalidades core**: ~85% implementadas
- **Gaps críticos**: 3 (SEFAZ, motor tributário, cotações de compra)
- **Gaps de evolução**: 8 (conciliação, estorno NF, multi-depósito, Excel, email cotação, histórico preços, valorização estoque, auditoria inline)

---

### Recomendação de Priorização

**Sprint imediato (alto valor, complexidade moderada):**
1. Implementar Cotações de Compra (comparação de fornecedores)
2. Exportação XLSX nos relatórios
3. Envio de cotação por e-mail

**Sprint seguinte (alto valor, alta complexidade):**
4. Motor tributário básico (cálculo automático de impostos)
5. Estorno de NF confirmada com reversão
6. Valorização do estoque

**Backlog estratégico (requer integrações externas):**
7. Integração SEFAZ (NF-e real)
8. Conciliação bancária (OFX)
9. Múltiplos depósitos

