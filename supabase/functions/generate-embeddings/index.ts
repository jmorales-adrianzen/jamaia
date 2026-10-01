import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const model = new Supabase.ai.Session('gte-small');

const DIMS_GTE_SMALL = 384;
const DIMS_VECTOR_DB = 1536;

/**
 * Rellena un embedding de 384 dims con ceros hasta 1536 dims.
 */
function padEmbedding(embedding: number[]): number[] {
  const padded = new Array(DIMS_VECTOR_DB).fill(0);
  for (let i = 0; i < DIMS_GTE_SMALL; i++) {
    padded[i] = embedding[i];
  }
  return padded;
}

/**
 * Serializa un error a string legible.
 */
function errorToString(e: any): string {
  if (!e) return 'Error desconocido';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const tipo = body.tipo ?? 'nombre';
    const platilloId = body.platillo_id ?? null;
    const ubicacionId = body.ubicacion_id ?? null;
    const offset = body.offset ?? 0;
    const limit = body.limit ?? 5;

    console.log(`Modo: ${platilloId ? 'ESPECÍFICO' : 'LOTE'} | platillo=${platilloId}, ubicacion=${ubicacionId}, tipo=${tipo}`);

    // 1. Construir query
    let query = supabase
      .from('platillo_traducciones')
      .select('platillo_id, ubicacion_id, nombre, preparacion');

    if (platilloId && ubicacionId) {
      query = query.eq('platillo_id', platilloId).eq('ubicacion_id', ubicacionId);
    } else {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: traducciones, error } = await query;
    if (error) throw error;

    if (!traducciones || traducciones.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, mensaje: 'No hay traducciones', procesados: 0, completado: true }),
        { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
      );
    }

    let generados = 0;
    let errores = 0;
    const detalle: any[] = [];

    for (const t of traducciones) {
      try {
        // Preparar texto fuente
        let textoFuente: string;
        if (tipo === 'nombre') {
          textoFuente = t.nombre || '';
        } else {
          // Limpiar el texto de la preparación
          const prepLimpia = (t.preparacion || '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/🔹|✅|📝|🥘|💡|🍽️|📌|🕒|🎯|⚠️|💚/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          textoFuente = prepLimpia.substring(0, 500);
        }

        console.log(`  → ${t.platillo_id}-${t.ubicacion_id}: len=${textoFuente.length} chars`);

        if (!textoFuente || textoFuente.length < 3) {
          errores++;
          detalle.push({
            platillo_id: t.platillo_id,
            ubicacion_id: t.ubicacion_id,
            error: 'Texto muy corto después de limpiar',
            len_original: t.preparacion?.length ?? 0,
            len_limpio: textoFuente.length,
          });
          continue;
        }

        // 2. Generar embedding
        console.log(`  → Generando embedding...`);
        const embedding384 = await model.run(textoFuente, {
          mean_pool: true,
          normalize: true,
        });

        if (!embedding384 || !Array.isArray(embedding384)) {
          throw new Error(`Embedding inválido: ${typeof embedding384}`);
        }

        console.log(`  → Embedding OK, dims=${(embedding384 as any[]).length}`);

        // 3. Rellenar con ceros
        const embedding1536 = padEmbedding(embedding384 as number[]);

        // 4. Guardar
        const { error: errUpsert } = await supabase
          .from('platillo_embeddings')
          .upsert({
            platillo_id: t.platillo_id,
            ubicacion_id: t.ubicacion_id,
            tipo: tipo,
            proveedor: 'supabase',
            modelo: 'gte-small',
            dimensiones: DIMS_GTE_SMALL,
            version: 1,
            embedding: embedding1536,
            texto_fuente: textoFuente,
            activo: true,
          }, {
            onConflict: 'platillo_id,ubicacion_id,tipo,proveedor,version',
          });

        if (errUpsert) throw errUpsert;

        console.log(`  → Upsert OK`);
        generados++;
      } catch (e) {
        errores++;
        const msgError = errorToString(e);
        console.error(`  → ERROR: ${msgError}`);
        detalle.push({
          platillo_id: t.platillo_id,
          ubicacion_id: t.ubicacion_id,
          error: msgError,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        modo: platilloId ? 'especifico' : 'lote',
        tipo,
        procesados: traducciones.length,
        generados,
        errores,
        completado: platilloId ? true : traducciones.length < limit,
        detalle: detalle.length > 0 ? detalle : undefined,
      }),
      { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error general:', error);
    return new Response(
      JSON.stringify({ ok: false, error: errorToString(error) }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
    );
  }
});