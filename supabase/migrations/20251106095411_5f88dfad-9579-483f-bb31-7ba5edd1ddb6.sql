-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their stories" ON public.story_participants;
DROP POLICY IF EXISTS "Users can view stories they participate in" ON public.stories;

-- Create security definer function to check story participation
CREATE OR REPLACE FUNCTION public.is_story_participant(_user_id uuid, _story_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.story_participants
    WHERE user_id = _user_id
      AND story_id = _story_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view participants in their stories" 
ON public.story_participants 
FOR SELECT 
USING (public.is_story_participant(auth.uid(), story_id));

CREATE POLICY "Users can view stories they participate in" 
ON public.stories 
FOR SELECT 
USING (public.is_story_participant(auth.uid(), id));