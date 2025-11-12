import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Format d'email invalide").max(255, "Email trop long"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(100, "Mot de passe trop long")
});

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Erreur de validation",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast({ title: "Bienvenue aventurier!" });
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        toast({ title: "Compte créé! Tu peux maintenant te connecter." });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Map to user-friendly messages
      let userMessage = "Une erreur est survenue. Réessaye plus tard.";
      if (error.message?.includes("already registered")) {
        userMessage = "Cet email est déjà utilisé. Essaie de te connecter.";
      } else if (error.message?.includes("Invalid login credentials")) {
        userMessage = "Email ou mot de passe incorrect.";
      } else if (error.message?.includes("Email not confirmed")) {
        userMessage = "Confirme ton email avant de te connecter.";
      }
      
      toast({
        title: "Erreur",
        description: userMessage,
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