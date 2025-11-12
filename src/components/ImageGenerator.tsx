import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Image, Loader2 } from "lucide-react";

export const ImageGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast({ title: "Erreur", description: "Décris la scène à générer", variant: "destructive" });
      return;
    }

    setLoading(true);
    setGeneratedImage(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-scene-image", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({ title: "Image générée avec succès!" });
      } else {
        throw new Error("Aucune image générée");
      }
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de générer l'image", 
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
          <Image className="h-4 w-4" />
          Générer une scène
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Générateur de scénographie</DialogTitle>
          <DialogDescription>
            Décris la scène que tu souhaites visualiser
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={generateImage} className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décris la scène: une forêt mystérieuse au crépuscule, un château en ruines, une taverne animée..."
            disabled={loading}
            rows={4}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              "Générer l'image"
            )}
          </Button>
          
          {generatedImage && (
            <div className="mt-4">
              <img 
                src={generatedImage} 
                alt="Scène générée" 
                className="w-full rounded-lg border border-border shadow-lg"
              />
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
