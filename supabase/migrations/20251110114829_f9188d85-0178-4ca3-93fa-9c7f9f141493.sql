-- Désactiver RLS sur toutes les tables
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_participants DISABLE ROW LEVEL SECURITY;