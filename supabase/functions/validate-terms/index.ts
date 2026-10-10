// ============================================================
// EDGE FUNCTION: validate-terms
// Valida si los términos del usuario existen en el catálogo de
// ingredientes. Devuelve sugerencias para los no reconocidos.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Normaliza un texto: minúsculas, sin tildes, sin caracteres especiales.
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula similitud básica entre dos strings.
 * Usa el algoritmo simple de prefijos comunes + longitud.
 */
function similitud(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  // 1. Distancia de Levenshtein (más precisa)
  const distancia = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const scoreLevenshtein = 1 - (distancia / maxLen);

  // 2. Substring directo (más peso)
  const contiene = a.includes(b) || b.includes(a);
  const scoreContiene = contiene ? 0.9 : 0;

  // 3. N-gramas comunes (para palabras parecidas)
  const scoreNGramas = compararNGramas(a, b, 3);

  // Ponderación: substring > Levenshtein > n-gramas
  return Math.max(scoreContiene, scoreLevenshtein * 0.8, scoreNGramas * 0.6);
}

/**
 * Calcula la distancia de Levenshtein entre dos strings.
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matriz: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matriz[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matriz[i][j] = matriz[i - 1][j - 1];
      } else {
        matriz[i][j] = Math.min(
          matriz[i - 1][j - 1] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j] + 1
        );
      }
    }
  }

  return matriz[b.length][a.length];
}

/**
 * Compara similitud por n-gramas comunes.
 */
function compararNGramas(a: string, b: string, n: number): number {
  const gramasA = new Set<string>();
  const gramasB = new Set<string>();

  for (let i = 0; i <= a.length - n; i++) {
    gramasA.add(a.substring(i, i + n));
  }
  for (let i = 0; i <= b.length - n; i++) {
    gramasB.add(b.substring(i, i + n));
  }

  let comunes = 0;
  for (const g of gramasA) {
    if (gramasB.has(g)) comunes++;
  }

  const total = Math.max(gramasA.size, gramasB.size);
  return total > 0 ? comunes / total : 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { terminos, ubicacion_id } = await req.json();

    if (!terminos || !Array.isArray(terminos) || terminos.length === 0) {
      return new Response(
        JSON.stringify({ resultados: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ubicacion_id) {
      return new Response(
        JSON.stringify({ error: 'Falta ubicacion_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener TODOS los ingredientes de ese país
    const { data: ingredientes, error } = await supabase
      .from('ingrediente_traducciones')
      .select('nombre')
      .eq('ubicacion_id', ubicacion_id);

    if (error) throw error;

    const nombresIngredientes = (ingredientes ?? []).map(i => ({
      original: i.nombre,
      normalizado: normalizar(i.nombre),
    }));

    // 2. Validar cada término
    const resultados = terminos.map((terminoRaw: string) => {
      const termino = normalizar(terminoRaw);

      // 2.1. Buscar coincidencias directas
      const coincidencias = nombresIngredientes.filter(i =>
        i.normalizado.includes(termino) ||
        termino.includes(i.normalizado) ||
        i.normalizado.split(' ').some((palabra: string) =>
          palabra === termino || palabra.startsWith(termino)
        )
      );

      const reconocido = coincidencias.length > 0;

      // 2.2. Si NO está reconocido, buscar sugerencias
      let sugerencias: string[] = [];

      if (!reconocido) {
        // Buscar por similitud
        const conSimilitud = nombresIngredientes
          .map(i => ({
            nombre: i.original,
            score: similitud(termino, i.normalizado),
          }))
          .filter(i => i.score > 0.6)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(i => i.nombre);

        sugerencias = conSimilitud;

        // Si no hay por similitud, buscar por raíz común (primeras 3-4 letras)
        if (sugerencias.length === 0 && termino.length >= 4 && termino.length <= 12) {
          const raiz = termino.substring(0, 3);
          sugerencias = nombresIngredientes
            .filter(i =>
              i.normalizado.split(' ').some((palabra: string) =>
                palabra.startsWith(raiz) && Math.abs(palabra.length - termino.length) <= 3
              )
            )
            .slice(0, 3)
            .map(i => i.original);
        }
      }

      return {
        termino: terminoRaw,
        reconocido,
        coincidencias: coincidencias.slice(0, 3).map(c => c.original),
        sugerencias,
      };
    });

    return new Response(
      JSON.stringify({ resultados }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});