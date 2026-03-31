# Módulo de Migração de Dados - ERP AviZee

Este documento descreve a arquitetura técnica, os fluxos de dados e os procedimentos para migração de dados legados no ERP AviZee.

## 1. Arquitetura
O módulo de migração foi projetado para garantir a integridade dos dados operacionais, separando a carga inicial do uso cotidiano do sistema. A arquitetura segue o padrão **Staging-Validation-Carga**.

### 1.1 Tabelas de Banco de Dados (Supabase)
- `importacao_lotes`: Tabela mestre que controla os lotes de importação (status, totais, mapeamento de colunas, data-base).
- `importacao_logs`: Registra cada evento do processamento, desde erros de validação até sucessos de carga.
- `stg_*`: Tabelas de staging (ex: `stg_produtos`, `stg_clientes`) que armazenam o payload bruto dos arquivos antes da inserção final.
- `produto_alias_importacao`: Tabela de equivalência para vincular códigos externos (de fornecedores ou sistemas antigos) aos IDs internos.

### 1.2 Camada de Lógica (TypeScript)
Localizada em `src/lib/importacao/`:
- `normalizers.ts`: Padronização de strings, documentos (CPF/CNPJ), valores monetários e datas.
- `parsers.ts`: Lógica robusta para interpretar quantidades (incluindo expressões matemáticas e unidades mistas via regex-guarded Function constructor) e datas em formato Excel serial.
- `validators.ts`: Regras de negócio específicas para cada tipo de entidade migrada, mapeando diferentes cabeçalhos de coluna (aliases).
- `aliases.ts`: Mapeamento de códigos de produtos de fornecedores para IDs internos.

## 2. Fluxos Implementados

### 2.1 Cadastros (Produtos, Clientes, Fornecedores)
- **Origem**: Planilha Excel (.xlsx / .csv).
- **Estratégia**: Upsert baseado em chaves naturais (`codigo_interno` para produtos, `cpf_cnpj` para pessoas).
- **Resultado**: Registros criados ou atualizados nas tabelas principais.

### 2.2 Estoque Inicial
- **Origem**: Planilha Excel.
- **Estratégia**: Geração de movimentos de estoque com origem `abertura`.
- **Impacto**: O saldo informado torna-se o novo saldo atual, registrando o histórico de abertura.

### 2.3 Compras por XML
- **Origem**: Arquivos .xml individuais ou .zip com múltiplos XMLs.
- **Estratégia**: Deduplicação por `chave_acesso`. Identificação de fornecedor por CNPJ.
- **Resultado**: Registros em `compras` e `notas_fiscais`.

### 2.4 Faturamento Histórico
- **Origem**: Planilha Excel.
- **Estratégia**: Agrupamento de itens por número de nota.
- **Flag Somente Consulta**: Permite importar notas sem impactar o estoque físico ou o financeiro operacional atual.

### 2.5 Financeiro em Aberto
- **Origem**: Planilha Excel.
- **Estratégia**: Carga de títulos pendentes (Pagar/Receber) com origem `abertura_financeiro`.
- **Regra**: Não gera baixas automáticas.

## 3. Regras de Validação e Segurança
- **Perfis**: Acesso restrito a usuários com role `admin`.
- **Deduplicação**: Verificação rigorosa contra chaves únicas existentes no banco antes da carga final.
- **Staging**: Os dados nunca entram diretamente nas tabelas operacionais sem passar pela validação em tela e no banco de staging.

## 4. Limitações Atuais (Fase 1)
- Importação de itens de faturamento histórico não vincula automaticamente novos produtos (requer cadastro prévio).
- O custo médio não é recalculado retroativamente durante a abertura de estoque.
- Upload limitado pelo tamanho de memória do navegador (browser-side parsing).
- Cálculos matemáticos em strings de quantidade (ex: "=10+2") são suportados, mas restritos a operadores básicos (+ - * /) por segurança.

## 5. Próximos Passos (Fase 2)
- Importação de fotos de produtos em lote.
- Vínculo inteligente de CFOPs e Impostos em XMLs de compra.
- Dashboard de evolução de saldos migrados vs realizados.

---

## Checklist de Homologação

### 1. Cadastros
- [ ] Importar planilha de 10 produtos (novos e existentes).
- [ ] Validar se duplicidades de SKU foram tratadas como update.
- [ ] Importar clientes com CPFs válidos e inválidos (verificar se o sistema bloqueou os inválidos).

### 2. Estoque
- [ ] Realizar abertura de estoque para 5 produtos.
- [ ] Conferir na tela de Estoque se a origem aparece como "Abertura".
- [ ] Validar se o saldo anterior foi respeitado no log de movimento.

### 3. Fiscal (XML)
- [ ] Subir um arquivo .zip com 3 XMLs.
- [ ] Tentar reimportar um XML já existente (validar erro de duplicidade).
- [ ] Conferir se o fornecedor foi vinculado corretamente pelo CNPJ.

### 4. Financeiro
- [ ] Importar 5 contas a pagar e 5 a receber.
- [ ] Validar se os títulos aparecem na tela de Financeiro com a etiqueta de origem correta.
