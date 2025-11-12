import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, Send, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InvitePlayer } from "@/components/InvitePlayer";
import { CharacterSheet } from "@/components/CharacterSheet";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().trim().min(1, "Le message ne peut pas être vide").max(5000, "Le message est trop long")
});

interface Message {
  id: string;
  content: string;
  is_ai_narrator: boolean;
  created_at: string;
  user_id: string | null;
  username?: string;
}

interface StoryChatProps {
  storyId: string;
  onBack: () => void;
}

export const StoryChat = ({ storyId, onBack }: StoryChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoking, setInvoking] = useState(false);
  const [autoNarrator, setAutoNarrator] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Array<{ id: string; username: string }>>([]);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    setupPresence();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [storyId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        profiles:user_id (username)
      `)
      .eq("story_id", storyId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Load messages error:', error);
      toast({ title: "Erreur", description: "Impossible de charger les messages", variant: "destructive" });
    } else {
      const messagesWithUsernames = (data || []).map((msg: any) => ({
        ...msg,
        username: msg.profiles?.username || "Joueur inconnu"
      }));
      setMessages(messagesWithUsernames);
    }
  };

  const setupPresence = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const channel = supabase.channel(`story-${storyId}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map((presence: any) => ({
          id: presence.user_id,
          username: presence.username
        }));
        setActiveUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: profile?.username || "Joueur inconnu",
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = channel;
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${storyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `story_id=eq.${storyId}`,
        },
        async (payload) => {
          // Charger le username pour le nouveau message
          let username = "Joueur inconnu";
          if (payload.new.user_id && !payload.new.is_ai_narrator) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", payload.new.user_id)
              .single();
            username = profile?.username || "Joueur inconnu";
          }

          setMessages((prev) => {
            // Éviter les doublons
            const exists = prev.find(msg => msg.id === payload.new.id);
            if (exists) return prev;
            return [...prev, { ...payload.new, username } as Message];
          });

          // Auto-invoquer le narrateur si activé et message non-AI
          if (autoNarrator && !payload.new.is_ai_narrator && payload.new.user_id) {
            setTimeout(() => {
              invokeNarrator();
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = messageSchema.safeParse({ content: newMessage });
    if (!validation.success) {
      toast({
        title: "Erreur",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const messageContent = newMessage.trim();
    setNewMessage(""); // Vider immédiatement pour meilleure UX
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("messages").insert({
        story_id: storyId,
        user_id: user.id,
        content: messageContent,
        is_ai_narrator: false,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Send message error:', error);
      setNewMessage(messageContent); // Remettre le message en cas d'erreur
      toast({ 
        title: "Erreur", 
        description: "Impossible d'envoyer le message", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const invokeNarrator = async () => {
    if (messages.length === 0) {
      toast({
        title: "Attention",
        description: "Commence l'histoire avant d'invoquer le narrateur!",
        variant: "destructive",
      });
      return;
    }

    setInvoking(true);
    try {
      const recentMessages = messages.slice(-10).map((msg) => ({
        role: msg.is_ai_narrator ? "assistant" : "user",
        content: msg.content,
      }));

      const { data, error } = await supabase.functions.invoke("narrative-ai", {
        body: { 
          messages: recentMessages,
          storyId: storyId
        },
      });

      if (error) throw error;

      const { error: insertError } = await supabase.from("messages").insert({
        story_id: storyId,
        content: data.content,
        is_ai_narrator: true,
        user_id: null,
      });

      if (insertError) throw insertError;
    } catch (error: any) {
      console.error('Invoke narrator error:', error);
      toast({
        title: "Erreur",
        description: "Le narrateur ne répond pas. Réessaye plus tard.",
        variant: "destructive",
      });
    } finally {
      setInvoking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card p-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {activeUsers.length} {activeUsers.length > 1 ? "joueurs actifs" : "joueur actif"}
            </span>
            <div className="flex gap-1 ml-2">
              {activeUsers.map((user) => (
                <Badge key={user.id} variant="secondary" className="text-xs">
                  {user.username}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CharacterSheet storyId={storyId} />
            <InvitePlayer storyId={storyId} />
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-narrator" className="text-sm text-muted-foreground cursor-pointer">
                Auto-narrateur
              </Label>
              <Switch
                id="auto-narrator"
                checked={autoNarrator}
                onCheckedChange={setAutoNarrator}
              />
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={`p-4 ${
                message.is_ai_narrator
                  ? "bg-accent/20 border-accent shadow-[var(--shadow-glow)]"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                {message.is_ai_narrator && (
                  <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold mb-1 ${
                      message.is_ai_narrator ? "text-accent" : "text-primary"
                    }`}
                  >
                    {message.is_ai_narrator ? "Narrateur" : message.username || "Joueur"}
                  </p>
                  <p className="text-foreground leading-relaxed">{message.content}</p>
                </div>
              </div>
            </Card>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <Button
            onClick={invokeNarrator}
            disabled={invoking}
            className="w-full bg-accent text-accent-foreground hover:shadow-[var(--shadow-glow)] transition-shadow"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {invoking ? "Le narrateur réfléchit..." : "Invoquer le Narrateur"}
          </Button>
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écris ton action..."
              disabled={loading}
              className="flex-1 bg-input border-border"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:shadow-[var(--shadow-glow)] transition-shadow"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};