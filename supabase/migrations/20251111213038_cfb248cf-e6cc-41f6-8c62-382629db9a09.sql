-- Ajouter les champs de visibilité et mot de passe aux stories
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS password text;

-- Modifier la policy de sélection pour permettre de voir les stories publiques
DROP POLICY IF EXISTS "Users can view stories they participate in" ON public.stories;

CREATE POLICY "Users can view their own stories or public stories"
ON public.stories
FOR SELECT
USING (
  is_story_participant(auth.uid(), id) 
  OR is_public = true
);

-- Créer une fonction pour vérifier si un utilisateur peut voir les messages d'une story
CREATE OR REPLACE FUNCTION public.can_view_story_content(_user_id uuid, _story_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = _story_id
    AND (
      is_public = true
      OR EXISTS (
        SELECT 1 FROM public.story_participants
        WHERE story_id = _story_id AND user_id = _user_id
      )
    )
  )
$$;

-- Mettre à jour les policies pour les messages pour permettre la lecture des messages publics
DROP POLICY IF EXISTS "Users can view messages from stories they participate in" ON public.messages;

CREATE POLICY "Users can view messages from accessible stories"
ON public.messages
FOR SELECT
USING (can_view_story_content(auth.uid(), story_id));

-- Mettre à jour les policies pour story_participants
DROP POLICY IF EXISTS "Users can view participants in their stories" ON public.story_participants;

CREATE POLICY "Users can view participants in accessible stories"
ON public.story_participants
FOR SELECT
USING (can_view_story_content(auth.uid(), story_id));