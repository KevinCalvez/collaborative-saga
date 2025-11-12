-- Fix missing RLS policies for profiles table
CREATE POLICY "Profiles viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Fix missing RLS policies for story_configs table
CREATE POLICY "Templates viewable by all" 
ON public.story_configs 
FOR SELECT 
USING (is_template = true OR created_by = auth.uid());

CREATE POLICY "Users can create configs" 
ON public.story_configs 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own configs" 
ON public.story_configs 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own configs" 
ON public.story_configs 
FOR DELETE 
USING (auth.uid() = created_by);