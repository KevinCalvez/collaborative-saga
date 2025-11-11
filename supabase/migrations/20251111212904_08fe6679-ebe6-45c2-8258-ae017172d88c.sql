-- Table pour définir les champs de fiche de personnage par configuration
CREATE TABLE IF NOT EXISTS public.character_sheet_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id uuid NOT NULL REFERENCES public.story_configs(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'textarea', 'select')),
  field_label text NOT NULL,
  field_options jsonb, -- Pour les select, contient les options disponibles
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table pour stocker les fiches de personnage des joueurs
CREATE TABLE IF NOT EXISTS public.character_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_values jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.character_sheet_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_sheets ENABLE ROW LEVEL SECURITY;

-- RLS policies pour character_sheet_fields (lecture publique pour les participants)
CREATE POLICY "Users can view fields for their story configs"
ON public.character_sheet_fields
FOR SELECT
USING (
  config_id IN (
    SELECT config_id FROM public.stories 
    WHERE id IN (
      SELECT story_id FROM public.story_participants 
      WHERE user_id = auth.uid()
    )
  )
);

-- RLS policies pour character_sheets
CREATE POLICY "Users can view character sheets in their stories"
ON public.character_sheets
FOR SELECT
USING (
  story_id IN (
    SELECT story_id FROM public.story_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own character sheets"
ON public.character_sheets
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND story_id IN (
    SELECT story_id FROM public.story_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own character sheets"
ON public.character_sheets
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_character_sheets_updated_at
BEFORE UPDATE ON public.character_sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer des champs par défaut pour les configs existantes
INSERT INTO public.character_sheet_fields (config_id, field_name, field_type, field_label, is_required, display_order)
SELECT id, 'name', 'text', 'Nom du personnage', true, 0
FROM public.story_configs
WHERE is_template = true
ON CONFLICT DO NOTHING;

INSERT INTO public.character_sheet_fields (config_id, field_name, field_type, field_label, field_options, is_required, display_order)
SELECT 
  id, 
  'class', 
  'select', 
  CASE 
    WHEN name LIKE '%Fantasy%' THEN 'Classe'
    WHEN name LIKE '%Sci-Fi%' THEN 'Profession'
    ELSE 'Rôle'
  END,
  CASE 
    WHEN name LIKE '%Fantasy%' THEN '["Guerrier", "Mage", "Voleur", "Prêtre"]'::jsonb
    WHEN name LIKE '%Sci-Fi%' THEN '["Pilote", "Ingénieur", "Scientifique", "Soldat"]'::jsonb
    ELSE '["Leader", "Support", "Combattant", "Explorateur"]'::jsonb
  END,
  true, 
  1
FROM public.story_configs
WHERE is_template = true
ON CONFLICT DO NOTHING;

INSERT INTO public.character_sheet_fields (config_id, field_name, field_type, field_label, is_required, display_order)
SELECT id, 'background', 'textarea', 'Histoire du personnage', false, 2
FROM public.story_configs
WHERE is_template = true
ON CONFLICT DO NOTHING;