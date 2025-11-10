-- Table pour les profils utilisateurs avec pseudos
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS sur profiles (mais désactivé pour le moment comme les autres tables)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles (commentées car RLS désactivé)
-- CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Fonction pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'username',
      'joueur_' || substr(new.id::text, 1, 8)
    )
  );
  RETURN new;
END;
$$;

-- Trigger pour créer un profil automatiquement
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger pour updated_at sur profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour les configurations d'histoires (templates prédéfinis ou custom)
CREATE TABLE public.story_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.story_configs ENABLE ROW LEVEL SECURITY;

-- Ajouter une colonne config_id à stories
ALTER TABLE public.stories ADD COLUMN config_id UUID REFERENCES public.story_configs(id);

-- Trigger pour updated_at sur story_configs
CREATE TRIGGER update_story_configs_updated_at
  BEFORE UPDATE ON public.story_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer quelques templates prédéfinis
INSERT INTO public.story_configs (name, description, system_prompt, is_template) VALUES
(
  'Aventure Fantasy',
  'Une quête épique dans un monde de magie et de dragons',
  'Tu es un narrateur expert en fantasy. Crée des aventures épiques avec magie, dragons, et quêtes héroïques. Sois descriptif et immersif.',
  true
),
(
  'Horreur Lovecraftienne',
  'Mystères cosmiques et terreur indicible',
  'Tu es un narrateur de récits d''horreur lovecraftienne. Crée une atmosphère oppressante, des mystères cosmiques et une terreur psychologique. Sois sombre et inquiétant.',
  true
),
(
  'Science-Fiction Spatiale',
  'Exploration de galaxies lointaines',
  'Tu es un narrateur de science-fiction spatiale. Crée des aventures dans l''espace avec vaisseaux, aliens, et technologies futuristes. Sois imaginatif et scientifique.',
  true
),
(
  'Enquête Policière',
  'Résolution de crimes et mystères',
  'Tu es un narrateur de romans policiers. Crée des enquêtes captivantes avec indices, suspects et rebondissements. Sois méthodique et suspenseful.',
  true
);