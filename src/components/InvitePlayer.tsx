import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface InvitePlayerProps {
  storyId: string;
}

export const InvitePlayer = ({ storyId }: InvitePlayerProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const invitePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Erreur", description: "Entre un email valide", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Vérifier si l'utilisateur existe
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", email.trim());

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        toast({ 
          title: "Joueur introuvable", 
          description: "Cet utilisateur n'existe pas encore", 
          variant: "destructive" 
        });
        return;
      }

      const userId = profiles[0].id;

      // Vérifier s'il n'est pas déjà participant
      const { data: existing } = await supabase
        .from("story_participants")
        .select("id")
        .eq("story_id", storyId)
        .eq("user_id", userId)
        .single();

      if (existing) {
        toast({ 
          title: "Déjà participant", 
          description: "Ce joueur fait déjà partie de cette histoire", 
          variant: "destructive" 
        });
        return;
      }

      // Ajouter le participant
      const { error } = await supabase
        .from("story_participants")
        .insert({ story_id: storyId, user_id: userId });

      if (error) throw error;

      toast({ title: "Joueur invité avec succès!" });
      setEmail("");
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
          <UserPlus className="h-4 w-4" />
          Inviter un joueur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un joueur</DialogTitle>
          <DialogDescription>
            Entre l'ID utilisateur du joueur à inviter
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={invitePlayer} className="space-y-4">
          <Input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ID utilisateur"
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Invitation..." : "Inviter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
