import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginEmail, loginGoogle, registerEmail } from "@/lib/firebase";

const DEV = import.meta.env.VITE_USE_DEV_AUTH === "true";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await loginEmail(email, password);
      else await registerEmail(email, password);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full grid place-items-center p-6 bg-gradient-to-br from-primary/5 via-background to-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
              V
            </div>
            <CardTitle className="text-xl">VolleyIQ</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Entra na tua conta para continuar."
              : "Cria uma conta para começar."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEV && (
            <div className="rounded-md border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
              Modo dev activo — clica em <b>Entrar</b> (ou Google) para entrar
              como <code>dev@volleyiq.local</code> sem Firebase.
            </div>
          )}
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!DEV}
                placeholder="treinador@clube.pt"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!DEV}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                await loginGoogle();
                window.location.reload();
              } catch (err: any) {
                toast.error(err.message ?? "Falha Google");
              }
            }}
          >
            Continuar com Google
          </Button>
          <button
            className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Ainda não tens conta? Criar uma."
              : "Já tens conta? Entrar."}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
