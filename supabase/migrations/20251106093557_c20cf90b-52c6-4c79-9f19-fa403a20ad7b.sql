-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_ai_narrator BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story_participants table
CREATE TABLE IF NOT EXISTS public.story_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
CREATE POLICY "Users can view stories they participate in"
  ON public.stories FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.story_participants WHERE story_id = id
    )
  );

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Story creators can update their stories"
  ON public.stories FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Story creators can delete their stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from stories they participate in"
  ON public.messages FOR SELECT
  USING (
    story_id IN (
      SELECT story_id FROM public.story_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in stories they participate in"
  ON public.messages FOR INSERT
  WITH CHECK (
    story_id IN (
      SELECT story_id FROM public.story_participants WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for story_participants
CREATE POLICY "Users can view participants in their stories"
  ON public.story_participants FOR SELECT
  USING (
    story_id IN (
      SELECT story_id FROM public.story_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Story creators can add participants"
  ON public.story_participants FOR INSERT
  WITH CHECK (
    story_id IN (
      SELECT id FROM public.stories WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can remove themselves from stories"
  ON public.story_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_participants;