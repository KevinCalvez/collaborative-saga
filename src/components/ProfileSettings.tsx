import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";
import { z } from "zod";

const usernameSchema = z.object({
  username: z.string().trim().min(1, "Le pseudo ne peut pas être vide").max(50, "Le pseudo est trop long")
});

export const ProfileSettings = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error('Load profile error:', error);
      toast({ title: "Erreur", description: "Impossible de charger le profil", variant: "destructive" });
    } else if (data) {
      setUsername(data.username);
    }
  };

  const updateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = usernameSchema.safeParse({ username });
    if (!validation.success) {
      toast({
        title: "Erreur",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim() })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Pseudo mis à jour!" });
      setOpen(false);
    } catch (error: any) {
      console.error('Update username error:', error);
      
      let userMessage = "Impossible de mettre à jour le pseudo";
      if (error.code === '23505') {
        userMessage = "Ce pseudo est déjà utilisé";
      }
      
      toast({ 
        title: "Erreur", 
        description: userMessage, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          Modifier mon pseudo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier mon pseudo</DialogTitle>
          <DialogDescription>
            Change ton nom d'aventurier
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={updateUsername} className="space-y-4">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nouveau pseudo"
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Mise à jour..." : "Mettre à jour"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
