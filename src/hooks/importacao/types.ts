export type ImportType = "produtos" | "clientes" | "fornecedores";
export type ImportSource = "cadastros" | "estoque" | "xml" | "faturamento";

export interface Mapping {
  [key: string]: string;
}
