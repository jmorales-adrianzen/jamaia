Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    console.log('=== INICIO embed-query ===');

    // 1. Leer body
    const body = await req.json();
    const text = body?.text;
    console.log(`Texto recibido: "${text}"`);

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Falta el campo "text"' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 2. Limpiar texto
    const textoLimpio = text
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);
    console.log(`Texto limpio: "${textoLimpio}"`);

    // 3. Verificar que Supabase.ai existe
    console.log(`Tipo de Supabase: ${typeof Supabase}`);
    console.log(`Tipo de Supabase.ai: ${typeof Supabase?.ai}`);
    console.log(`Tipo de Supabase.ai.Session: ${typeof Supabase?.ai?.Session}`);

    // 4. Inicializar modelo
    const model = new Supabase.ai.Session('gte-small');
    console.log('Modelo inicializado');

    // 5. Generar embedding
    const embedding384 = await model.run(textoLimpio, {
      mean_pool: true,
      normalize: true,
    });
    console.log(`Embedding generado, dims=${(embedding384 as any[])?.length}`);

    // 6. Padding a 1536
    const embedding1536 = new Array(1536).fill(0);
    for (let i = 0; i < 384; i++) {
      embedding1536[i] = (embedding384 as number[])[i];
    }
    console.log('Padding completado');

    // 7. Devolver
    return new Response(
      JSON.stringify({
        embedding: embedding1536,
        text: textoLimpio,
        dimensiones: 1536,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error('=== ERROR en embed-query ===');
    console.error('Error completo:', error);
    console.error('Error tipo:', typeof error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        tipo: typeof error,
        stack: error instanceof Error ? error.stack : null,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});