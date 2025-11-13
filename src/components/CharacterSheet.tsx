import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CharacterSheetField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options: any;
  is_required: boolean;
  display_order: number;
}

interface CharacterSheetProps {
  storyId: string;
}

export const CharacterSheet = ({ storyId }: CharacterSheetProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<CharacterSheetField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [existingSheetId, setExistingSheetId] = useState<string | null>(null);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCharacterSheet();
    }
  }, [open, storyId]);

  const loadCharacterSheet = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Récupérer la story pour obtenir le config_id et le system_prompt
      const { data: story, error: storyError } = await supabase
        .from("stories")
        .select(`
          config_id,
          story_configs (
            system_prompt
          )
        `)
        .eq("id", storyId)
        .single();

      if (storyError) throw storyError;
      if (!story?.config_id) {
        toast({ 
          title: "Aucune fiche disponible", 
          description: "Cette histoire n'a pas de modèle de fiche personnage",
          variant: "destructive"
        });
        setOpen(false);
        return;
      }

      // Stocker le system_prompt pour l'aide IA
      const prompt = (story as any).story_configs?.system_prompt || "";
      setSystemPrompt(prompt);

      // Charger les champs de la fiche
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("character_sheet_fields")
        .select("*")
        .eq("config_id", story.config_id)
        .order("display_order");

      if (fieldsError) throw fieldsError;
      setFields(fieldsData || []);

      // Charger la fiche existante si elle existe
      const { data: existingSheet, error: sheetError } = await supabase
        .from("character_sheets")
        .select("*")
        .eq("story_id", storyId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (sheetError && sheetError.code !== "PGRST116") throw sheetError;

      if (existingSheet) {
        setExistingSheetId(existingSheet.id);
        setFieldValues((existingSheet.field_values as Record<string, any>) || {});
      } else {
        setExistingSheetId(null);
        setFieldValues({});
      }
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const saveCharacterSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Valider les champs requis
    const missingRequired = fields.filter(
      field => field.is_required && !fieldValues[field.field_name]
    );

    if (missingRequired.length > 0) {
      toast({
        title: "Champs manquants",
        description: `Veuillez remplir: ${missingRequired.map(f => f.field_label).join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      if (existingSheetId) {
        // Mettre à jour la fiche existante
        const { error } = await supabase
          .from("character_sheets")
          .update({ field_values: fieldValues })
          .eq("id", existingSheetId);

        if (error) throw error;
        toast({ title: "Fiche mise à jour!" });
      } else {
        // Créer une nouvelle fiche
        const { error } = await supabase
          .from("character_sheets")
          .insert({
            story_id: storyId,
            user_id: user.id,
            field_values: fieldValues
          });

        if (error) throw error;
        toast({ title: "Fiche créée!" });
      }

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: CharacterSheetField) => {
    const value = fieldValues[field.field_name] || "";

    switch (field.field_type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.field_label}
            required={field.is_required}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.field_label}
            required={field.is_required}
            rows={4}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.field_label}
            required={field.is_required}
          />
        );

      case "select":
        const options = field.field_options?.options || [];
        return (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field.field_name, val)}
            required={field.is_required}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Choisir ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.field_label}
            required={field.is_required}
          />
        );
    }
  };

  const generateWithAi = async () => {
    if (!aiDescription.trim()) {
      toast({
        title: "Description requise",
        description: "Décris ton personnage pour que l'IA puisse t'aider",
        variant: "destructive"
      });
      return;
    }

    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('character-assistant', {
        body: {
          description: aiDescription,
          fields: fields,
          systemPrompt: systemPrompt
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Réessaye dans quelques instants.');
        }
        if (error.message?.includes('402')) {
          throw new Error('Crédits insuffisants. Ajoute des crédits à ton compte.');
        }
        throw error;
      }

      if (data?.fieldValues) {
        setFieldValues(data.fieldValues);
        setShowAiHelper(false);
        toast({ 
          title: "Fiche générée!",
          description: "Vérifie et ajuste les valeurs si besoin"
        });
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast({
        title: "Erreur",
        description: error.message || "L'IA n'a pas pu générer la fiche. Réessaye.",
        variant: "destructive"
      });
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Ma fiche personnage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Fiche de Personnage</DialogTitle>
          <DialogDescription>
            {existingSheetId ? "Modifier" : "Créer"} ta fiche de personnage
          </DialogDescription>
        </DialogHeader>

        {loading && fields.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {showAiHelper ? (
              <div className="space-y-4">
                <Card className="bg-accent/10 border-accent">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Aide IA</h3>
                        <p className="text-sm text-muted-foreground">
                          Décris ton personnage et l'IA va générer automatiquement ta fiche basée sur le thème de l'histoire.
                        </p>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Ex: Je veux jouer un mage elfe qui vient d'une forêt ancienne et qui maîtrise la magie de la nature..."
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      rows={6}
                      className="mb-4"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAiHelper(false)}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        onClick={generateWithAi}
                        disabled={aiGenerating}
                        className="flex-1 bg-accent text-accent-foreground"
                      >
                        {aiGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Génération...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Générer
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <form onSubmit={saveCharacterSheet}>
                <div className="mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAiHelper(true)}
                    className="w-full border-accent text-accent hover:bg-accent/10"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer avec l'IA
                  </Button>
                </div>

                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    {fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label>
                          {field.field_label}
                          {field.is_required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      existingSheetId ? "Mettre à jour" : "Créer"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
