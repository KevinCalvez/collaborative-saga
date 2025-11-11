import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, storyId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Charger la configuration de l'histoire si elle existe
    let storyContext = "";
    if (storyId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const storyResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/stories?id=eq.${storyId}&select=config_id,story_configs(system_prompt)`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            }
          }
        );
        
        if (storyResponse.ok) {
          const storyData = await storyResponse.json();
          if (storyData && storyData[0]?.story_configs?.system_prompt) {
            storyContext = storyData[0].story_configs.system_prompt;
          }
        }
      } catch (err) {
        console.error("Error loading story config:", err);
      }
    }

    const systemPrompt = storyContext || `Tu es un narrateur de jeu de rôle expérimenté et créatif. 
Tu continues les histoires de manière immersive et captivante.
Tu adaptes ton style au contexte de l'histoire et aux actions des joueurs.
Tu crées des rebondissements intéressants et des descriptions vivantes.
Tu restes cohérent avec l'histoire précédente.

Réponds de manière concise (2-4 phrases maximum) pour permettre aux joueurs de réagir.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants, veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const narratorResponse = data.choices?.[0]?.message?.content;

    if (!narratorResponse) {
      throw new Error("No response from AI");
    }

    return new Response(
      JSON.stringify({ content: narratorResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in narrative-ai function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});