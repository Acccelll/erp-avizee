import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">E-mail enviado</h2>
          <p className="text-muted-foreground text-sm mb-4">Verifique sua caixa de entrada para redefinir sua senha.</p>
          <Link to="/login"><Button variant="outline">Voltar ao Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Recuperar Senha</h2>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</Button>
          <Link to="/login" className="block text-center text-sm text-primary hover:underline">Voltar ao Login</Link>
        </form>
      </div>
    </div>
  );
}
