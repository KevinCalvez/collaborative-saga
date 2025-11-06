import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { StoryList } from "@/components/StoryList";
import { StoryChat } from "@/components/StoryChat";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  if (selectedStoryId) {
    return <StoryChat storyId={selectedStoryId} onBack={() => setSelectedStoryId(null)} />;
  }

  return <StoryList onSelectStory={setSelectedStoryId} />;
};

export default Index;