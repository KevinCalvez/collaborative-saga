import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Bienvenue aventurier!" });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: "Compte créé! Tu peux maintenant te connecter." });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-[var(--shadow-deep)]">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center bg-[var(--gradient-gold)] bg-clip-text text-transparent">
            Chroniques Narratives
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Entre dans l'aventure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input border-border"
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-input border-border"
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:shadow-[var(--shadow-glow)] transition-shadow"
            >
              {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer un compte"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              {isLogin ? "Créer un compte" : "Déjà un compte? Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};