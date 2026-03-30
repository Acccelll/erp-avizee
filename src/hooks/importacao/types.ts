export type ImportType = "produtos" | "clientes" | "fornecedores";
export type ImportSource = "cadastros" | "estoque" | "xml";

export interface Mapping {
  [key: string]: string;
}
