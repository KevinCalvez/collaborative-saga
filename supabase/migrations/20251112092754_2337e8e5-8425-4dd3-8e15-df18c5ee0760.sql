-- URGENT: Re-enable Row-Level Security on core tables
-- This fixes the critical security vulnerability where RLS was disabled

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_participants ENABLE ROW LEVEL SECURITY;
