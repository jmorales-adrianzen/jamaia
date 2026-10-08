// src/app/services/plato.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  PlatoCompleto,
  IngredientePlato,
  RecomendacionAcompanamiento
} from '../models/plato.model';

// Estructura del resultado de buscarPorIngredientes
export interface PlatoMatch {
  platillo_id: number;
  nombre: string;
  imagen_url: string;
  tiempo_prep: string;
  ingredientes_totales: number;
  ingredientes_tiene: number;
  ingredientes_faltantes: number;
  porcentaje_match: number;
}

@Injectable({ providedIn: 'root' })
export class PlatoService {
  constructor(private sb: SupabaseService) { }

  // ============================================================
  //  OBTENER TODOS LOS PLATOS DE UN PAÍS
  // ============================================================
  async obtenerPlatosPorPais(ubicacionId: number): Promise<PlatoCompleto[]> {
    // Query 1: platillos + traducción + metadata
    const { data: traducciones, error: err1 } = await this.sb.client
      .from('platillo_traducciones')
      .select(`
        platillo_id,
        nombre,
        preparacion,
        platillos!inner(imagen_url, tiempo_prep, categoria_id)
      `)
      .eq('ubicacion_id', ubicacionId);

    if (err1) throw err1;
    if (!traducciones?.length) return [];

    const platilloIds = traducciones.map(t => t.platillo_id);

    // Query 2: ingredientes
    const { data: ingredientesRaw, error: err2 } = await this.sb.client
      .from('platillo_ingredientes')
      .select(`
        platillo_id,
        ingrediente_id,
        cantidad,
        unidad,
        ingredientes!inner(
          categoria_id,
          categorias_ingredientes(codigo, nombre, icono, orden),
          ingrediente_traducciones!inner(nombre, ubicacion_id)
        )
      `)
      .in('platillo_id', platilloIds)
      .eq('ingredientes.ingrediente_traducciones.ubicacion_id', ubicacionId);

    if (err2) throw err2;

    const ingredienteIds = [
      ...new Set((ingredientesRaw ?? []).map((i: any) => i.ingrediente_id as number))
    ];

    // Queries 3, 4 y 5 en paralelo
    const [preciosRes, recomRes, acompRes] = await Promise.all([
      this.sb.client
        .from('precios_ingredientes')
        .select('ingrediente_id, precio')
        .in('ingrediente_id', ingredienteIds)
        .eq('ubicacion_id', ubicacionId)
        .eq('tipo_precio_id', 1)
        .eq('activo', true),
      this.sb.client
        .from('recomendaciones')
        .select('platillo_id, sugerencia')
        .in('platillo_id', platilloIds)
        .eq('ubicacion_id', ubicacionId),
      this.sb.client
        .from('recomendaciones_acompanamiento')
        .select(`
          platillo_id,
          sugerencia,
          tipos_recomendacion(codigo, nombre, icono)
        `)
        .in('platillo_id', platilloIds)
        .eq('ubicacion_id', ubicacionId)
        .order('tipo_id')
        .order('orden')
    ]);

    if (preciosRes.error) throw preciosRes.error;
    if (recomRes.error) throw recomRes.error;
    if (acompRes.error) throw acompRes.error;

    const precioMap = new Map(
      (preciosRes.data ?? []).map(p => [p.ingrediente_id, p.precio])
    );
    const recomMap = new Map(
      (recomRes.data ?? []).map(r => [r.platillo_id, r.sugerencia])
    );

    const acompMap = new Map<number, RecomendacionAcompanamiento[]>();
    for (const row of (acompRes.data ?? []) as any[]) {
      if (!acompMap.has(row.platillo_id)) {
        acompMap.set(row.platillo_id, []);
      }
      acompMap.get(row.platillo_id)!.push({
        tipo_codigo: row.tipos_recomendacion?.codigo ?? 'otro',
        tipo_nombre: row.tipos_recomendacion?.nombre ?? 'Otro',
        tipo_icono: row.tipos_recomendacion?.icono ?? '📌',
        sugerencia: row.sugerencia
      });
    }

    // Armar resultado final
    return traducciones.map((t: any) => {
      const ings: IngredientePlato[] = (ingredientesRaw ?? [])
        .filter((i: any) => i.platillo_id === t.platillo_id)
        .map((i: any) => {
          const trad = i.ingredientes?.ingrediente_traducciones?.[0];
          const cat = i.ingredientes?.categorias_ingredientes;

          return {
            ingrediente_id: i.ingrediente_id,
            nombre: trad?.nombre ?? '',
            cantidad: Number(i.cantidad),
            unidad: i.unidad,
            precio_unitario: precioMap.get(i.ingrediente_id) ?? null,
            categoria_id: i.ingredientes?.categoria_id ?? null,
            categoria_codigo: cat?.codigo ?? null,
            categoria_nombre: cat?.nombre ?? null,
            categoria_icono: cat?.icono ?? null,
            categoria_orden: cat?.orden ?? null
          };
        });

      return {
        platillo_id: t.platillo_id,
        nombre: t.nombre,
        preparacion: t.preparacion ?? '',
        imagen_url: t.platillos?.imagen_url ?? '',
        tiempo_prep: t.platillos?.tiempo_prep ?? '',
        categoria_id: t.platillos?.categoria_id ?? null,
        recomendacion: recomMap.get(t.platillo_id) ?? null,
        ingredientes: ings,
        acompanamientos: acompMap.get(t.platillo_id) ?? []
      };
    });
  }

  // ============================================================
  //  BUSCAR PLATOS POR INGREDIENTES (RPC)
  // ============================================================
  /**
   * Llama a la función RPC `buscar_platos_por_ingredientes`.
   * Devuelve platos ordenados por cantidad de faltantes.
   */
  async buscarPorIngredientes(
    ingredienteIds: number[],
    ubicacionId: number,
    maxFaltantes: number = 2,
    limit: number = 30
  ): Promise<PlatoMatch[]> {
    const { data, error } = await this.sb.client.rpc(
      'buscar_platos_por_ingredientes',
      {
        p_ingredientes: ingredienteIds,
        p_ubicacion_id: ubicacionId,
        p_max_faltantes: maxFaltantes,
        p_limit: limit
      }
    );

    if (error) throw error;
    return (data ?? []) as PlatoMatch[];
  }

  // ============================================================
  //  OBTENER DETALLE COMPLETO DE UN PLATO
  // ============================================================
  /**
   * Trae todos los platos y filtra el que coincide con el ID.
   * (Reutiliza `obtenerPlatosPorPais` para no duplicar lógica).
   */
  async obtenerDetallePlato(
    platilloId: number,
    ubicacionId: number
  ): Promise<PlatoCompleto | null> {
    const platos = await this.obtenerPlatosPorPais(ubicacionId);
    return platos.find(p => p.platillo_id === platilloId) ?? null;
  }

  // ============================================================
  //  BÚSQUEDA SEMÁNTICA CON gte-small
  // ============================================================
  /**
   * Busca platos por texto libre usando embeddings.
   * 
   * @param query - Texto del usuario (ej: "algo con pollo y papas")
   * @param ubicacionId - 1 = Perú, 2 = Argentina
   * @param tipo - 'nombre' (busca por nombre) o 'preparacion' (busca por pasos)
   * @param threshold - Umbral de similitud (0.3 = flexible, 0.5 = estricto)
   * @param limit - Máximo de resultados
   */
  // ============================================================
  //  BÚSQUEDA SEMÁNTICA CON FILTROS Y LOGS
  // ============================================================
  async buscarSemantico(
    query: string,
    ubicacionId: number,
    tipo: 'nombre' | 'preparacion' = 'nombre',
    threshold: number = 0.25,
    limit: number = 10
  ): Promise<PlatoMatch[]> {
    console.group('🔍 BÚSQUEDA SEMÁNTICA');

    // ============================================================
    // 1. Extraer filtros del texto
    // ============================================================
    const filtros = this.extraerFiltros(query);
    console.log('📝 Query original:', `"${query}"`);
    console.log('🎯 Filtros extraídos:', filtros);
    console.log('  → Incluir:', filtros.incluir.length > 0 ? filtros.incluir : '(ninguno)');
    console.log('  → Excluir:', filtros.excluir.length > 0 ? filtros.excluir : '(ninguno)');

    // ============================================================
    // 2. Limpiar el texto para el embedding (quitar negaciones)
    // ============================================================
    const textoParaEmbedding = this.limpiarTextoParaEmbedding(query);
    console.log('📝 Texto limpio para embedding:', `"${textoParaEmbedding}"`);

    // ============================================================
    // 3. Generar embedding del texto limpio
    // ============================================================
    const textoFinal = textoParaEmbedding || query;   // Fallback si queda vacío
    console.log('📤 Enviando a embed-query:', `"${textoFinal}"`);

    const { data: embedData, error: embedError } = await this.sb.client.functions.invoke(
      'embed-query',
      { body: { text: textoFinal } }
    );

    if (embedError) {
      console.error('❌ Error en embed-query:', embedError);
      console.groupEnd();
      throw embedError;
    }

    if (!embedData?.embedding) {
      console.error('❌ No se generó embedding');
      console.groupEnd();
      throw new Error('No se pudo generar el embedding');
    }

    console.log('✅ Embedding generado. Dims:', embedData.embedding.length);

    // ============================================================
    // 4. Preparar parámetros para la RPC
    // ============================================================
    const params = {
      query_embedding: embedData.embedding,
      match_threshold: threshold,
      match_count: limit,
      p_ubicacion_id: ubicacionId,
      p_tipo: tipo,
      p_incluir: filtros.incluir.length > 0 ? filtros.incluir : undefined,
      p_excluir: filtros.excluir.length > 0 ? filtros.excluir : undefined,
    };

    console.log('📤 Parámetros RPC:');
    console.log('  → match_threshold:', threshold);
    console.log('  → match_count:', limit);
    console.log('  → ubicacion_id:', ubicacionId);
    console.log('  → tipo:', tipo);
    console.log('  → p_incluir:', params.p_incluir ?? '(null)');
    console.log('  → p_excluir:', params.p_excluir ?? '(null)');

    // ============================================================
    // 5. Ejecutar la RPC
    // ============================================================
    const { data, error } = await this.sb.client.rpc('match_platos_con_filtros', params);

    if (error) {
      console.error('❌ Error en RPC match_platos_con_filtros:', error);
      console.groupEnd();
      throw error;
    }

    console.log(`✅ Resultado: ${data?.length ?? 0} platos encontrados`);

    if (data && data.length > 0) {
      console.table(data.map((r: any) => ({
        platillo_id: r.platillo_id,
        nombre: r.nombre,
        similarity: (r.similarity * 100).toFixed(1) + '%',
      })));
    } else {
      console.warn('⚠️ Sin resultados. Revisa los filtros o baja el threshold.');
    }

    console.groupEnd();

    // ============================================================
    // 6. Adaptar al formato PlatoMatch
    // ============================================================
    return (data ?? []).map((r: any) => ({
      platillo_id: r.platillo_id,
      nombre: r.nombre,
      imagen_url: r.imagen_url ?? '',
      tiempo_prep: r.tiempo_prep ?? '',
      ingredientes_totales: 0,
      ingredientes_tiene: 0,
      ingredientes_faltantes: 0,
      porcentaje_match: Math.round(r.similarity * 100),
    }));
  }

  // ============================================================
  //  EXTRAER FILTROS DEL TEXTO DEL USUARIO
  // ============================================================
  /**
   * Analiza el texto del usuario y extrae:
   *   - incluir: ingredientes que DEBE tener
   *   - excluir: ingredientes que NO debe tener
   * 
   * Ejemplos:
   *   "algo con pollo pero sin arroz" → incluir: ['pollo'], excluir: ['arroz']
   *   "algo sin papa ni arroz"        → incluir: [], excluir: ['papa', 'arroz']
   *   "comida ligera con ensalada"    → incluir: ['ensalada'], excluir: []
   */
  private extraerFiltros(texto: string): { incluir: string[]; excluir: string[] } {
    const textoLimpio = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const negaciones = [
      'sin ', 'no ', 'nada de ', 'nada ', 'ni ',
      'que no tenga ', 'que no lleve ',
      'evitar ', 'excepto ', 'menos '
    ];

    const inclusiones = [
      'con ', 'que tenga ', 'que lleve ', 'que contenga ',
      'que sea de ', 'que sea con ', 'tipo '
    ];

    const ingredientesComunes = [
      // Legumbres
      'lenteja', 'lentejas', 'frejol', 'frejoles', 'frijol', 'frijoles',
      'poroto', 'porotos', 'arveja', 'arvejas', 'alverja', 'alverjas',
      'garbanzo', 'garbanzos', 'pallar', 'pallares',
      // Granos
      'arroz', 'quinua', 'quinoa', 'trigo', 'cebada',
      // Pastas
      'fideo', 'fideos', 'tallarin', 'tallarines', 'tallarín',
      'spaghetti', 'spaghettis', 'spaguetti', 'spaguetis', 'spagheti',
      'espagueti', 'espaguetis', 'espaghetti', 'espaghettis', 'espaguety',
      'pasta', 'pastas', 'macarron', 'macarrones', 'penne', 'fetuccini',
      // Carnes
      'pollo', 'pechuga', 'suprema', 'muslo', 'carne', 'res', 'bistec', 'bife',
      'lomo', 'cerdo', 'chancho', 'chuleta', 'costilla', 'tocino',
      'pescado', 'filete', 'merluza', 'bonito', 'atun',
      // Tubérculos
      'papa', 'papas', 'patata', 'patatas', 'camote', 'boniato',
      'yuca', 'mandioca', 'olluco',
      // Verduras
      'tomate', 'cebolla', 'ajo', 'lechuga', 'zanahoria', 'espinaca',
      'acelga', 'espinacas', 'col', 'coliflor', 'brocoli',
      'calabaza', 'zapallo', 'berenjena', 'pepino', 'pimiento',
      'morron', 'rocoto', 'aji', 'panca', 'amarillo',
      'mirasol', 'palillo', 'curcuma',
      // Hierbas
      'albahaca', 'cilantro', 'culantro', 'coriandro',
      'perejil', 'oregano', 'huacatay', 'hierbabuena', 'menta', 'romero', 'tomillo',      
      // Lácteos
      'huevo', 'huevos', 'leche', 'queso', 'mantequilla', 'manteca',
      // Frutas
      'limon', 'naranja', 'manzana', 'platano', 'banana', 'palta', 'aguacate',
      // Otros
      'aceituna', 'aceitunas', 'pasa', 'pasas', 'nuez', 'nueces',
      'mani', 'almendra', 'pepita',
      // Conceptos
      'verdura', 'verduras', 'vegetal', 'vegetales', 'ensalada',
      'vegetariano', 'vegetariana', 'vegano', 'vegana',
    ];

    const incluir: string[] = [];
    const excluir: string[] = [];

    // Detectar exclusiones
    for (const ing of ingredientesComunes) {
      for (const neg of negaciones) {
        if (textoLimpio.includes(neg + ing)) {
          excluir.push(ing);
        }
      }
    }

    // Detectar inclusiones
    for (const ing of ingredientesComunes) {
      if (excluir.includes(ing)) continue;

      for (const inc of inclusiones) {
        if (textoLimpio.includes(inc + ing)) {
          incluir.push(ing);
          break;
        }
      }
    }

    // Detección simple (si el texto solo menciona ingredientes)
    for (const ing of ingredientesComunes) {
      if (excluir.includes(ing) || incluir.includes(ing)) continue;
      if (textoLimpio.includes(ing)) {
        incluir.push(ing);
      }
    }

    // Deduplicar y normalizar (singular/plural)
    const normalizar = (arr: string[]): string[] => {
      const normalizados = new Set<string>();
      for (const palabra of arr) {
        // Normalizar plurales simples: papas → papa, lentejas → lenteja
        const singular = palabra
          .replace(/es$/, '')     // "papas" → "papa" (aunque sea "papases"→"papas")
          .replace(/s$/, '');      // "papas" → "papa"
        
        // Guardar la versión singular (más corta y más match con LIKE)
        normalizados.add(singular.length >= 3 ? singular : palabra);
      }
      return Array.from(normalizados);
    };

    return {
      incluir: normalizar([...new Set(incluir)]),
      excluir: normalizar([...new Set(excluir)]),
    };
  }

  // ============================================================
  //  LIMPIAR TEXTO PARA EL EMBEDDING
  // ============================================================
  private limpiarTextoParaEmbedding(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Quitar negaciones Y la palabra siguiente (el ingrediente)
      .replace(/\b(sin|no|nada de|ni|excepto|menos)\s+\w+/g, '')
      // Quitar palabras de relleno
      .replace(/\b(algo|que|con|de|para|pero|tenga|lleve|sea|quiero|deseo|comer|tipo|y|e|o|u)\b/g, '')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      .trim();
  }

}