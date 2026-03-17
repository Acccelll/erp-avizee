import { Input } from "@/components/ui/input";
import { useCallback } from "react";

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask: "cpf" | "cnpj" | "cpf_cnpj" | "telefone" | "celular" | "cep";
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const masks: Record<string, (v: string) => string> = {
  cpf: (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14),
  cnpj: (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2").slice(0, 18),
  cpf_cnpj: (v) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length <= 11) return masks.cpf(v);
    return masks.cnpj(v);
  },
  telefone: (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2").slice(0, 14),
  celular: (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2").slice(0, 15),
  cep: (v) => v.replace(/\D/g, "").replace(/(\d{5})(\d{1,3})$/, "$1-$2").slice(0, 9),
};

export function MaskedInput({ mask, value, onChange, className, ...props }: MaskedInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = masks[mask](e.target.value);
    onChange(masked);
  }, [mask, onChange]);

  return (
    <Input
      {...props}
      value={value}
      onChange={handleChange}
      className={`font-mono text-sm ${className || ""}`}
    />
  );
}
