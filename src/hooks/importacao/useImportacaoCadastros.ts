import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  validateProdutoImport,
  validateClienteImport,
  validateFornecedorImport
} from "@/lib/importacao/validators";
import { FIELD_ALIASES } from "@/lib/importacao/aliases";

export type ImportType = "produtos" | "clientes" | "fornecedores";

interface Mapping {
  [key: string]: string;
}

export function useImportacaoCadastros() {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>("");
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [importType, setImportType] = useState<ImportType>("produtos");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loteId, setLoteId] = useState<string | null>(null);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      if (wb.SheetNames.length > 0) {
        onSheetChange(wb.SheetNames[0], wb);
      }
    };
    reader.readAsBinaryString(selectedFile);
  }, [onSheetChange]);

  const onSheetChange = useCallback((sheetName: string, wb = workbook) => {
    if (!wb) return;
    setCurrentSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length > 0) {
      const headerRow = data[0] as string[];
      setHeaders(headerRow);
      setRawRows(XLSX.utils.sheet_to_json(ws));

      // Auto-mapping based on aliases
      const initialMapping: Mapping = {};
      headerRow.forEach(h => {
        const cleanH = String(h).trim().toUpperCase();
        if (FIELD_ALIASES[cleanH]) {
          initialMapping[FIELD_ALIASES[cleanH]] = h;
        }
      });
      setMapping(initialMapping);
    }
  }, [workbook]);

  const generatePreview = useCallback(() => {
    if (rawRows.length === 0) return;

    const preview = rawRows.map((row, index) => {
      const mappedRow: any = {};
      Object.entries(mapping).forEach(([field, colName]) => {
        mappedRow[field] = row[colName];
      });

      let validation;
      if (importType === "produtos") validation = validateProdutoImport(mappedRow);
      else if (importType === "clientes") validation = validateClienteImport(mappedRow);
      else validation = validateFornecedorImport(mappedRow);

      return {
        ...validation.normalizedData,
        _valid: validation.valid,
        _errors: validation.errors,
        _originalLine: index + 2,
        _originalRow: row
      };
    });

    setPreviewData(preview);
    return preview;
  }, [rawRows, mapping, importType]);

  const processImport = async () => {
    if (previewData.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Criar Lote
      const { data: user } = await supabase.auth.getUser();
      const { data: lote, error: loteError } = await supabase
        .from("importacao_lotes")
        .insert({
          tipo_importacao: importType,
          arquivo_nome: file?.name,
          status: "processando",
          total_lidos: previewData.length,
          criado_por: user?.user?.id
        })
        .select()
        .single();

      if (loteError) throw loteError;
      const currentLoteId = lote.id;
      setLoteId(currentLoteId);

      // 2. Salvar em Staging
      const stagingTable = `stg_${importType === "produtos" ? "produtos" : importType === "clientes" ? "clientes" : "fornecedores"}`;
      const stagingData = previewData.map(item => ({
        lote_importacao_id: currentLoteId,
        arquivo_origem: file?.name,
        aba_origem: currentSheet,
        linha_origem: item._originalLine,
        payload: item._originalRow,
        status_validacao: item._valid ? "valido" : "erro",
        motivo_erro: item._errors.join(", "),
        criado_por: user?.user?.id
      }));

      const { error: stagingError } = await supabase.from(stagingTable as any).insert(stagingData);
      if (stagingError) throw stagingError;

      // 3. Atualizar Lote com contagens
      const validos = previewData.filter(i => i._valid).length;
      const erros = previewData.length - validos;

      await supabase
        .from("importacao_lotes")
        .update({
          status: erros > 0 ? "parcial" : "validado",
          total_validos: validos,
          total_erros: erros
        })
        .eq("id", currentLoteId);

      toast.success(`${validos} registros validados e prontos para carga.`);
      setIsProcessing(false);
      return currentLoteId;

    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error(`Falha no processamento: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const finalizeImport = async (idLote = loteId) => {
    if (!idLote) return;
    setIsProcessing(true);

    try {
      // Carregar registros válidos de staging
      const stagingTable = `stg_${importType === "produtos" ? "produtos" : importType === "clientes" ? "clientes" : "fornecedores"}`;
      const finalTable = importType; // produtos, clientes ou fornecedores

      const { data: validItems, error: fetchError } = await supabase
        .from(stagingTable as any)
        .select("payload, linha_origem")
        .eq("lote_importacao_id", idLote)
        .eq("status_validacao", "valido");

      if (fetchError) throw fetchError;
      if (!validItems || validItems.length === 0) {
        toast.warning("Nenhum registro válido para importar.");
        setIsProcessing(false);
        return;
      }

      // Inserir na tabela final
      // Nota: Idealmente faríamos um upsert por código/CPF.
      // Por simplicidade técnica e segurança, usaremos a estratégia solicitada.

      let importedCount = 0;
      for (const item of validItems) {
        const raw = item.payload;
        // Re-normalizar para garantir consistência final
        let validated;
        if (importType === "produtos") validated = validateProdutoImport(raw);
        else if (importType === "clientes") validated = validateClienteImport(raw);
        else validated = validateFornecedorImport(raw);

        const dataToInsert = validated.normalizedData;

        // Estratégia de Upsert Simples
        let query;
        if (importType === "produtos") {
          query = supabase.from("produtos").upsert(dataToInsert, { onConflict: "codigo_interno" });
        } else {
          // Clientes/Fornecedores por CPF/CNPJ
          query = supabase.from(importType as any).upsert(dataToInsert, { onConflict: "cpf_cnpj" });
        }

        const { error: insertError } = await query;
        if (!insertError) {
          importedCount++;
        } else {
          // Log de erro no processamento final
          await supabase.from("importacao_logs").insert({
            lote_importacao_id: idLote,
            nivel: "error",
            etapa: "carga_final",
            mensagem: `Erro na linha ${item.linha_origem}: ${insertError.message}`,
            payload: dataToInsert
          });
        }
      }

      // Atualizar Lote Final
      await supabase
        .from("importacao_lotes")
        .update({
          status: "concluido",
          total_importados: importedCount,
          observacoes: `Carga finalizada com ${importedCount} registros inseridos/atualizados.`
        })
        .eq("id", idLote);

      toast.success(`Importação finalizada! ${importedCount} registros carregados.`);
      setIsProcessing(false);
      return true;

    } catch (error: any) {
      console.error("Erro na finalização:", error);
      toast.error(`Falha na carga final: ${error.message}`);
      setIsProcessing(false);
    }
  };

  return {
    file,
    sheets,
    currentSheet,
    headers,
    mapping,
    importType,
    previewData,
    isProcessing,
    onFileChange,
    onSheetChange,
    setMapping,
    setImportType,
    generatePreview,
    processImport,
    finalizeImport,
    loteId
  };
}
