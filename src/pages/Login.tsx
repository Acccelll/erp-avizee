import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { isSupabaseConfigured, supabase, supabaseConfigError } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, LogIn, Eye, EyeOff } from "lucide-react";
import logoAvizee from "@/assets/logoavizee.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast.error(supabaseConfigError || "Configuração do Supabase ausente.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos" : error.message);
    } else {
      toast.success("Login realizado com sucesso!");
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoAvizee} alt="AviZee" className="h-14 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Sistema AviZee</h1>
          <p className="text-muted-foreground text-sm mt-1">Acesse sua conta para continuar</p>
        </div>

        {!isSupabaseConfigured && (
          <Alert className="mb-4 border-destructive/30 bg-destructive/5 text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuração do Supabase ausente</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{supabaseConfigError}</p>
              <p className="text-xs text-muted-foreground">
                Configure no ambiente publicado as variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong>.
                Este projeto também aceita <strong>VITE_SUPABASE_ANON_KEY</strong> como fallback para a chave pública.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="bg-card border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">Esqueceu a senha?</Link>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading || !isSupabaseConfigured}>
            <LogIn className="w-4 h-4" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>);

}
