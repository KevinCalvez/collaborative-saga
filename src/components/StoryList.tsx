import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, Globe, Users, LogOut, Plus } from "lucide-react";
import { JoinStoryDialog } from "./JoinStoryDialog";
import { ProfileSettings } from "./ProfileSettings";
import { ImageGenerator } from "./ImageGenerator";
import { z } from "zod";

const storySchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200, "Le titre est trop long"),
  description: z.string().max(2000, "La description est trop longue").optional(),
  password: z.string().max(100, "Le mot de passe est trop long").optional()
});

interface Story {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  config_id: string | null;
  is_public: boolean;
  password: string | null;
  created_by: string;
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
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentUser();
    loadStories();
    loadStoryConfigs();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Load stories error:', error);
      toast({ title: "Erreur", description: "Impossible de charger les histoires", variant: "destructive" });
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
    
    // Validate input
    const validation = storySchema.safeParse({ 
      title, 
      description: description || undefined,
      password: password || undefined
    });
    
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: story, error } = await supabase
        .from("stories")
        .insert({ 
          title: title.trim(), 
          description: description.trim() || null,
          config_id: selectedConfigId || null,
          is_public: isPublic,
          password: password.trim() || null
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
      setIsPublic(false);
      setPassword("");
      setShowCreateForm(false);
      loadStories();
    } catch (error: any) {
      console.error('Create story error:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de créer l'histoire. Réessaye plus tard.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = async (story: Story) => {
    // Si c'est le créateur ou déjà participant, accès direct
    if (story.created_by === currentUserId) {
      onSelectStory(story.id);
      return;
    }

    // Vérifier si déjà participant
    const { data: participant } = await supabase
      .from("story_participants")
      .select("id")
      .eq("story_id", story.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (participant) {
      onSelectStory(story.id);
      return;
    }

    // Story publique avec mot de passe
    if (story.is_public && story.password) {
      setSelectedStory(story);
      setJoinDialogOpen(true);
      return;
    }

    // Story publique sans mot de passe
    if (story.is_public && !story.password) {
      await joinStory(story.id);
      return;
    }

    toast({ 
      title: "Accès refusé", 
      description: "Cette histoire est privée",
      variant: "destructive" 
    });
  };

  const joinStory = async (storyId: string, providedPassword?: string) => {
    setLoading(true);
    try {
      const story = stories.find(s => s.id === storyId);
      if (!story) throw new Error("Histoire introuvable");

      // Vérifier le mot de passe si nécessaire
      if (story.password && story.password !== providedPassword) {
        throw new Error("Mot de passe incorrect");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("story_participants")
        .insert({ story_id: storyId, user_id: user.id });

      if (error) throw error;

      setJoinDialogOpen(false);
      setSelectedStory(null);
      toast({ title: "Tu as rejoint l'histoire!" });
      onSelectStory(storyId);
    } catch (error: any) {
      console.error('Join story error:', error);
      
      let userMessage = "Impossible de rejoindre l'histoire";
      if (error.message?.includes("Mot de passe incorrect")) {
        userMessage = "Mot de passe incorrect";
      } else if (error.message?.includes("already exists")) {
        userMessage = "Tu as déjà rejoint cette histoire";
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
            <ProfileSettings />
            <ImageGenerator />
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border hover:bg-accent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-primary text-primary-foreground hover:shadow-[var(--shadow-glow)] transition-shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
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

                <div className="flex items-center justify-between space-x-2 border border-border rounded-lg p-3 bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-public" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Histoire publique
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Visible par tous les joueurs
                    </p>
                  </div>
                  <Switch
                    id="is-public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>

                {isPublic && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Mot de passe (optionnel)
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Laisser vide pour aucun mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                )}
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
                onClick={() => handleStoryClick(story)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      {story.title}
                      {story.is_public ? (
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Publique
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Privée
                        </Badge>
                      )}
                      {story.password && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </div>
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

        {selectedStory && (
          <JoinStoryDialog
            open={joinDialogOpen}
            onOpenChange={setJoinDialogOpen}
            onJoin={(pwd) => joinStory(selectedStory.id, pwd)}
            storyTitle={selectedStory.title}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};