-- Make created_by non-nullable and set default to current user
ALTER TABLE public.stories 
ALTER COLUMN created_by SET NOT NULL,
ALTER COLUMN created_by SET DEFAULT auth.uid();