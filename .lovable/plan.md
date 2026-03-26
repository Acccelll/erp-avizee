
# Sprint D: Integração SEFAZ & Faturamento

## Itens Implementados

### 1. Consulta CNPJ via BrasilAPI (SEFAZ)
**Arquivos**: `src/hooks/useCnpjLookup.ts`, `src/pages/Clientes.tsx`, `src/pages/Fornecedores.tsx`

Hook `useCnpjLookup` que consulta a BrasilAPI (`brasilapi.com.br/api/cnpj/v1/{cnpj}`) ao sair do campo CNPJ (onBlur). Preenche automaticamente: razão social, nome fantasia, email, telefone, endereço completo. Integrado nos formulários de Clientes (quando tipo_pessoa = J) e Fornecedores.

### 2. Geração de NF a partir de Ordem de Venda
**Arquivo**: `src/pages/OrdensVenda.tsx`

Botão "Gerar NF" disponível em OVs aprovadas/em separação com faturamento != total. Ao confirmar:
- Cria nota fiscal de saída vinculada à OV
- Copia itens da OV para itens da NF
- Atualiza status_faturamento da OV para "total"
- Atualiza quantidade_faturada dos itens

### Sprints Anteriores
- **Sprint A**: package.json fix, session timeout, ErrorBoundary, GlobalSearch categorizado
- **Sprint B**: Sparklines, sidebar badges, DashboardSkeleton, column toggle
- **Sprint C**: DRE, calendário financeiro, aprovação orçamentos, alertas estoque
