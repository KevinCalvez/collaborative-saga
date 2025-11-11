import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Story {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  config_id: string | null;
}

interface StoryConfig {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
}

interface StoryListProps {
  onSelectStory: (storyId: string) => void;
}

export const StoryList = ({ onSelectStory }: StoryListProps) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [storyConfigs, setStoryConfigs] = useState<StoryConfig[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStories();
    loadStoryConfigs();
  }, []);

  const loadStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setStories(data || []);
    }
  };

  const loadStoryConfigs = async () => {
    const { data, error } = await supabase
      .from("story_configs")
      .select("*")
      .order("name");

    if (error) {
      console.error("Erreur chargement configs:", error);
    } else {
      setStoryConfigs(data || []);
    }
  };

  const createStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: story, error } = await supabase
        .from("stories")
        .insert({ 
          title, 
          description,
          config_id: selectedConfigId || null
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("story_participants")
        .insert({ story_id: story.id, user_id: user.id });

      toast({ title: "Histoire créée!" });
      setTitle("");
      setDescription("");
      setSelectedConfigId("");
      setShowCreateForm(false);
      loadStories();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-[var(--gradient-gold)] bg-clip-text text-transparent">
            Tes Chroniques
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border hover:bg-accent"
            >
              Déconnexion
            </Button>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-primary text-primary-foreground hover:shadow-[var(--shadow-glow)] transition-shadow"
            >
              {showCreateForm ? "Annuler" : "Nouvelle Histoire"}
            </Button>
          </div>
        </div>

        {showCreateForm && (
          <Card className="mb-6 border-border shadow-[var(--shadow-deep)]">
            <CardHeader>
              <CardTitle className="text-foreground">Créer une nouvelle histoire</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createStory} className="space-y-4">
                <Input
                  placeholder="Titre de l'histoire"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-input border-border"
                />
                <Textarea
                  placeholder="Description (optionnelle)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-input border-border"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Thème de l'histoire
                  </label>
                  <select
                    value={selectedConfigId}
                    onChange={(e) => setSelectedConfigId(e.target.value)}
                    className="w-full p-2 rounded-md border border-border bg-input text-foreground"
                  >
                    <option value="">Aucun thème spécifique</option>
                    {storyConfigs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                        {config.description && ` - ${config.description}`}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-secondary text-secondary-foreground hover:shadow-[var(--shadow-glow)] transition-shadow"
                >
                  {loading ? "Création..." : "Créer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="grid gap-4">
            {stories.map((story) => (
              <Card
                key={story.id}
                className="cursor-pointer hover:border-primary transition-colors border-border shadow-[var(--shadow-deep)] hover:shadow-[var(--shadow-glow)]"
                onClick={() => onSelectStory(story.id)}
              >
                <CardHeader>
                  <CardTitle className="text-foreground">{story.title}</CardTitle>
                  {story.description && (
                    <CardDescription className="text-muted-foreground">
                      {story.description}
                    </CardDescription>
                  )}
                  <CardDescription className="text-xs text-muted-foreground">
                    Créée le {new Date(story.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};