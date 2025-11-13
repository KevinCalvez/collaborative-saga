import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, fields, systemPrompt } = await req.json();
    console.log('Character assistant request:', { description, fields: fields?.length, systemPrompt: systemPrompt?.slice(0, 100) });

    if (!description || !fields || !Array.isArray(fields)) {
      throw new Error("Description et champs requis");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    // Construire la description des champs attendus
    const fieldsDescription = fields.map(f => 
      `- ${f.field_label} (${f.field_name}, type: ${f.field_type})${f.is_required ? ' [REQUIS]' : ''}${
        f.field_options?.options ? ` - Options: ${f.field_options.options.join(', ')}` : ''
      }`
    ).join('\n');

    const prompt = `Tu es un assistant créatif pour jeux de rôle narratifs. Le thème de l'histoire est:

${systemPrompt || "Fantasy générique"}

L'utilisateur veut créer un personnage avec cette description:
"${description}"

Génère les valeurs appropriées pour chaque champ de fiche de personnage ci-dessous. Sois créatif et cohérent avec le thème et la description.

Champs à remplir:
${fieldsDescription}

IMPORTANT: Tu dois retourner UN OBJET JSON UNIQUEMENT, sans texte supplémentaire. Format exact:
{
  "field_name_1": "valeur",
  "field_name_2": "valeur",
  ...
}

Pour les champs select, choisis EXACTEMENT une des options listées.
Pour les champs number, retourne un nombre.
Assure-toi que tous les champs REQUIS ont une valeur.`;

    console.log('Calling Lovable AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un assistant qui génère des fiches de personnage pour jeux de rôle. Tu retournes UNIQUEMENT du JSON valide, sans markdown ni texte supplémentaire.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requêtes atteinte. Réessaye dans quelques instants.');
      }
      if (response.status === 402) {
        throw new Error('Crédits insuffisants. Ajoute des crédits à ton compte Lovable.');
      }
      
      throw new Error('Erreur lors de la génération');
    }

    const data = await response.json();
    let generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('Aucune réponse de l\'IA');
    }

    console.log('AI response:', generatedContent);

    // Nettoyer la réponse (enlever markdown si présent)
    generatedContent = generatedContent.trim();
    if (generatedContent.startsWith('```json')) {
      generatedContent = generatedContent.slice(7);
    }
    if (generatedContent.startsWith('```')) {
      generatedContent = generatedContent.slice(3);
    }
    if (generatedContent.endsWith('```')) {
      generatedContent = generatedContent.slice(0, -3);
    }
    generatedContent = generatedContent.trim();

    // Parser le JSON
    let fieldValues;
    try {
      fieldValues = JSON.parse(generatedContent);
    } catch (e) {
      console.error('Failed to parse JSON:', generatedContent);
      throw new Error('Format de réponse invalide');
    }

    console.log('Generated field values:', fieldValues);

    return new Response(
      JSON.stringify({ fieldValues }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Character assistant error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Une erreur est survenue'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
