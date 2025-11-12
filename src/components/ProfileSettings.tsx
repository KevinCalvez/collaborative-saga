import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else if (data) {
      setUsername(data.username);
    }
  };

  const updateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: "Erreur", description: "Le pseudo ne peut pas être vide", variant: "destructive" });
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
