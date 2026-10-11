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
  categoria_id?: number | null;   // 👈 NUEVO
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
 * @param query            - Texto del usuario (ej: "algo con pollo y papas")
 * @param ubicacionId      - 1 = Perú, 2 = Argentina
 * @param tipo             - 'nombre' (busca por nombre) o 'preparacion' (busca por pasos)
 * @param threshold        - Umbral mínimo de similitud para la RPC (0.55 es buen punto con gte-small)
 * @param limit            - Máximo de candidatos que devuelve la RPC
 * @param atributosIncluir - Códigos de atributos que el plato DEBE tener
 * @param atributosExcluir - Códigos de atributos que el plato NO debe tener
 */
async buscarSemantico(
  query: string,
  ubicacionId: number,
  tipo: 'nombre' | 'preparacion' = 'nombre',
  threshold: number = 0.25,
  limit: number = 10,
  atributosIncluir: string[] = [],
  atributosExcluir: string[] = []
): Promise<PlatoMatch[]> {
  console.group('🔍 BÚSQUEDA SEMÁNTICA');

  // ============================================================
  // 1. Extraer filtros de ingredientes
  // ============================================================
  const filtros = this.extraerFiltros(query);
  console.log('📝 Query original:', `"${query}"`);
  console.log('🎯 Filtros ingredientes:');
  console.log('  → Incluir:', filtros.incluir.length > 0 ? filtros.incluir : '(ninguno)');
  console.log('  → Excluir:', filtros.excluir.length > 0 ? filtros.excluir : '(ninguno)');
  console.log('🏷️ Atributos:');
  console.log('  → Incluir:', atributosIncluir.length > 0 ? atributosIncluir : '(ninguno)');
  console.log('  → Excluir:', atributosExcluir.length > 0 ? atributosExcluir : '(ninguno)');

  // ============================================================
  // 2. Limpiar texto para embedding
  // ============================================================
  const textoParaEmbedding = this.limpiarTextoParaEmbedding(query);
  const textoFinal = textoParaEmbedding || query;
  console.log('📤 Texto para embedding:', `"${textoFinal}"`);

  // ============================================================
  // 3. Generar embedding
  // ============================================================
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

  // ============================================================
  // 4. Preparar parámetros para la RPC
  // ============================================================
  const params = {
    query_embedding:     embedData.embedding,
    match_threshold:     threshold,
    match_count:         limit,
    p_ubicacion_id:      ubicacionId,
    p_tipo:              tipo,
    p_incluir:           filtros.incluir.length > 0 ? filtros.incluir : undefined,
    p_excluir:           filtros.excluir.length > 0 ? filtros.excluir : undefined,
    p_atributos:         atributosIncluir.length > 0 ? atributosIncluir : undefined,
    p_atributos_excluir: atributosExcluir.length > 0 ? atributosExcluir : undefined,
  };

  console.log('📤 Parámetros RPC:', params);

  // ============================================================
  // 5. Ejecutar la RPC
  // ============================================================
  const { data, error } = await this.sb.client.rpc('match_platos_con_filtros', params);

  if (error) {
    console.error('❌ Error en RPC:', error);
    console.groupEnd();
    throw error;
  }

  console.log(`✅ ${data?.length ?? 0} resultados crudos`);

  // ============================================================
  // 6. Mapear
  // ============================================================
  const mapeados: PlatoMatch[] = (data ?? []).map((r: any) => ({
    platillo_id:          r.platillo_id,
    nombre:               r.nombre,
    imagen_url:           r.imagen_url ?? '',
    tiempo_prep:          r.tiempo_prep ?? '',
    categoria_id:         r.categoria_id ?? null,
    ingredientes_totales: 0,
    ingredientes_tiene:   0,
    ingredientes_faltantes: 0,
    porcentaje_match:     Math.round(r.similarity * 100),
  }));

  const tieneIngredientes = filtros.incluir.length > 0 || filtros.excluir.length > 0;
  const tieneAtributos    = atributosIncluir.length > 0 || atributosExcluir.length > 0;
  const pidioCategoria    = atributosIncluir.some(a =>
    ['entrada', 'sopa', 'plato_fondo', 'postre', 'bebida', 'desayuno'].includes(a)
  );

  console.log('🧭 Estrategia de ranking:');
  console.log('  → tieneIngredientes:', tieneIngredientes);
  console.log('  → tieneAtributos:   ', tieneAtributos);
  console.log('  → pidioCategoria:   ', pidioCategoria);

  // ============================================================
  // Orden de prioridad de categorías para presentación
  // ============================================================
  const ORDEN_CATEGORIA: { [k: number]: number } = {
    1: 0,   // Plato de Fondo
    3: 1,   // Sopa / Crema
    4: 2,   // Entrada
    2: 3,   // Guarnición
    5: 4,   // Postre
    6: 5,   // Desayuno
  };

  /** Ordena por prioridad de categoría y luego por similitud DESC */
  const ordenarPorCategoriaYSimilitud = (arr: PlatoMatch[]): PlatoMatch[] => {
    return [...arr].sort((a, b) => {
      const aPrio = ORDEN_CATEGORIA[a.categoria_id ?? 99] ?? 99;
      const bPrio = ORDEN_CATEGORIA[b.categoria_id ?? 99] ?? 99;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return b.porcentaje_match - a.porcentaje_match;
    });
  };

  /**
   * Corta la lista respetando los grupos de categoría: dentro de cada
   * categoría se aplica corte por gap, pero nunca se descarta una
   * categoría completa si tiene al menos 1 resultado razonable.
   *
   * Regla:
   *   - Se recorre la lista agrupada por categoría.
   *   - En cada categoría se conservan los elementos hasta que la
   *     similitud caiga más de `gapMaxPorCategoria` puntos respecto
   *     al PRIMER elemento de esa categoría.
   *   - Se garantiza al menos 1 elemento por categoría presente (si su
   *     top >= umbralBlando).
   */
  const cortarRespetandoCategorias = (
    arr: PlatoMatch[],
    umbralBlando: number = 78,
    gapMaxPorCategoria: number = 8,
    maxPorCategoria: number = 5
  ): PlatoMatch[] => {
    // Agrupar por categoría (manteniendo el orden de ORDEN_CATEGORIA)
    const grupos = new Map<number, PlatoMatch[]>();
    for (const r of arr) {
      const cat = r.categoria_id ?? 99;
      if (!grupos.has(cat)) grupos.set(cat, []);
      grupos.get(cat)!.push(r);
    }

    const categoriasOrdenadas = Array.from(grupos.keys()).sort(
      (a, b) => (ORDEN_CATEGORIA[a] ?? 99) - (ORDEN_CATEGORIA[b] ?? 99)
    );

    const resultado: PlatoMatch[] = [];

    for (const cat of categoriasOrdenadas) {
      const items = grupos.get(cat)!;

      // Ordenar por similitud DESC dentro de la categoría
      const itemsOrd = [...items].sort(
        (a, b) => b.porcentaje_match - a.porcentaje_match
      );

      const top = itemsOrd[0]?.porcentaje_match ?? 0;
      if (top < umbralBlando) continue;   // categoría demasiado débil

      const umbralCat = top - gapMaxPorCategoria;
      const seleccionados: PlatoMatch[] = [];

      for (const it of itemsOrd) {
        if (seleccionados.length >= maxPorCategoria) break;
        if (it.porcentaje_match < umbralCat) break;
        seleccionados.push(it);
      }

      resultado.push(...seleccionados);
    }

    return resultado;
  };

  // ============================================================
  // CASO 1: Solo atributos (sin ingredientes)
  // ============================================================
  if (tieneAtributos && !tieneIngredientes) {
    const atributosDieteticos = [
      'vegetariano', 'vegano', 'saludable', 'bajo_calorias',
      'alto_proteina', 'sin_gluten', 'sin_lactosa', 'economico'
    ];
    const pidioDietetico = atributosIncluir.some(a => atributosDieteticos.includes(a));

    console.log('🎯 Reordenando por categoría');
    console.log('  → pidioCategoria:', pidioCategoria);
    console.log('  → pidioDietetico:', pidioDietetico);

    let base: PlatoMatch[];

    if (pidioCategoria) {
      // El usuario pidió una categoría explícita (postre, sopa, etc.)
      base = [...mapeados].sort((a, b) => b.porcentaje_match - a.porcentaje_match);
    } else {
      // No hay categoría explícita: priorizar fondos → sopas → entradas → ...
      base = ordenarPorCategoriaYSimilitud(mapeados);
    }

    let recortados: PlatoMatch[];

    if (pidioDietetico && !pidioCategoria) {
      // Solo platos de fondo
      recortados = base.filter(r => r.categoria_id === 1).slice(0, 12);
      console.log(`🥬 Filtrando solo platos de fondo: ${recortados.length}`);
    } else if (pidioCategoria) {
      recortados = base.slice(0, 12);
    } else {
      // Caso interesante: atributos como "picante", "económico" sin categoría.
      // Usamos el corte por categoría para no truncar entradas/postres válidos.
      recortados = cortarRespetandoCategorias(base, 78, 8, 5);
      if (recortados.length === 0) recortados = base.slice(0, 12);
    }

    if (recortados.length > 0) {
      console.table(recortados.map(r => ({
        platillo_id: r.platillo_id,
        nombre:      r.nombre,
        cat:         r.categoria_id,
        match:       r.porcentaje_match + '%',
      })));
    }

    console.groupEnd();
    return recortados;
  }

  // ============================================================
  // CASO 2: Hay ingredientes → ordenar por categoría y aplicar
  //         corte respetando grupos.
  // ============================================================
  console.log('✂️ Aplicando corte respetando categorías');

  // 1) Ordenar por categoría + similitud
  const ordenados = ordenarPorCategoriaYSimilitud(mapeados);

  // 2) El corte es más permisivo cuando hay ingredientes concretos
  //    porque la RPC YA hizo un filtro fuerte (p_incluir / p_excluir).
  const umbralBlando = tieneIngredientes ? 70 : 78;
  const gapMaxPorCategoria = tieneIngredientes ? 15 : 8;
  const maxPorCategoria = tieneIngredientes ? 8 : 5;

  console.log('  → umbralBlando:', umbralBlando);
  console.log('  → gapMaxPorCategoria:', gapMaxPorCategoria);
  console.log('  → maxPorCategoria:', maxPorCategoria);

  const cortados = cortarRespetandoCategorias(
    ordenados,
    umbralBlando,
    gapMaxPorCategoria,
    maxPorCategoria
  );

  // 3) Si el corte fue muy agresivo (0 resultados) pero hay candidatos,
  //    caer a la lista sin corte.
  const final = cortados.length > 0 ? cortados : ordenados.slice(0, 15);

  if (final.length > 0) {
    console.table(final.map(r => ({
      platillo_id: r.platillo_id,
      nombre:      r.nombre,
      cat:         r.categoria_id,
      match:       r.porcentaje_match + '%',
    })));
  }

  console.groupEnd();
  return final;
}  



  // ============================================================
  //  CORTE POR GAP DE SIMILITUD
  // ============================================================
  private cortarPorGap(
    resultados: PlatoMatch[],
    maxResultados: number = 8,
    minResultados: number = 2,
    caidaRespectoAlTop: number = 0.06,
    gapAbsoluto: number = 4,
    topMinimoAceptable: number = 82   // 👈 NUEVO
  ): PlatoMatch[] {
    if (resultados.length === 0) return resultados;

    // 👇 NUEVO: si el top no alcanza calidad mínima, devolver muy pocos
    const topScore = resultados[0].porcentaje_match;

    if (topScore < topMinimoAceptable) {
      console.log(
        `⚠️ Top score ${topScore}% < mínimo ${topMinimoAceptable}% → devolviendo solo los primeros 3`
      );
      // Opcional: devolver solo los 2-3 primeros para dar algo de contexto
      return resultados.slice(0, Math.min(3, resultados.length));
    }

    if (resultados.length <= minResultados) return resultados;

    const umbralTop = topScore * (1 - caidaRespectoAlTop);
    const cortados: PlatoMatch[] = [];

    for (let i = 0; i < resultados.length && cortados.length < maxResultados; i++) {
      const r = resultados[i];

      if (cortados.length >= minResultados && i > 0) {
        const previo = resultados[i - 1].porcentaje_match;
        const gap = previo - r.porcentaje_match;
        if (gap >= gapAbsoluto) {
          console.log(`✂️ Corte por gap puntual: ${previo}% → ${r.porcentaje_match}%`);
          break;
        }
      }

      if (cortados.length >= minResultados && r.porcentaje_match < umbralTop) {
        console.log(
          `✂️ Corte por umbral: ${r.porcentaje_match}% < ${umbralTop.toFixed(1)}% (top ${topScore}%)`
        );
        break;
      }

      cortados.push(r);
    }

    console.log(`📊 Resultados tras corte: ${cortados.length} de ${resultados.length}`);
    return cortados;
  }




  // ============================================================
  //  EXTRAER ATRIBUTOS DEL TEXTO DEL USUARIO
  // ============================================================
  /**
   * Detecta qué atributos (vegetariano, picante, postre, etc.)
   * se mencionan en el texto del usuario.
   * Devuelve dos arrays: incluir y excluir.
   *
   * Ejemplos:
   *   "algo vegetariano"            → incluir:['vegetariano'], excluir:[]
   *   "algo NO vegetariano"          → incluir:[], excluir:['vegetariano']
   *   "sin gluten y sin lactosa"     → incluir:['sin_gluten','sin_lactosa'], excluir:[]
   *   "quiero un postre"             → incluir:['postre'], excluir:[]
   *   "algo picante que no sea postre" → incluir:['picante'], excluir:['postre']
   */
  extraerAtributos(texto: string): { incluir: string[]; excluir: string[] } {
    const t = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Mapa codigo → lista de sinónimos / frases
    const mapa: { [codigo: string]: string[] } = {
      // Categorías (por categoria_id)
      'entrada': ['entrada', 'entradas', 'para empezar', 'para picar'],
      'sopa': ['sopa', 'sopas', 'caldo', 'caldos', 'crema', 'cremas'],
      'plato_fondo': ['plato de fondo', 'plato principal', 'almuerzo', 'cena', 'comida fuerte'],
      'postre': ['postre', 'postres', 'dulce', 'algo dulce', 'para el postre'],
      'bebida': ['bebida', 'bebidas', 'refresco', 'jugo', 'trago'],
      'desayuno': ['desayuno', 'desayunos', 'para desayunar', 'para la mañana'],
      // Dietéticos
      'vegetariano': ['vegetariano', 'vegetariana', 'vegetarianos', 'sin carne'],
      'vegano': ['vegano', 'vegana', 'veganos', 'sin productos animales'],
      'saludable': ['saludable', 'saludables', 'ligero', 'ligera', 'liviano', 'healthy'],
      'bajo_calorias': ['bajo en calorias', 'bajo en calorias', 'light', 'pocas calorias', 'poco calorico'],
      'alto_proteina': ['alto en proteina', 'alto en proteinas', 'proteico', 'mucha proteina'],
      'sin_gluten': ['sin gluten', 'sin tacc', 'celiaco', 'celiaca', 'gluten free'],
      'sin_lactosa': ['sin lactosa', 'intolerante a la lactosa', 'sin leche'],
      'picante': ['picante', 'picantes', 'con picante', 'que pique', 'spicy'],
      'economico': ['economico', 'economica', 'barato', 'barata', 'de bajo costo', 'accesible'],
    };

    // Frases de negación (aplican al atributo que sigue)
    const negaciones = [
      'no ', 'sin ', 'que no sea ', 'que no tenga ', 'que no sea ',
      'nada de ', 'excepto ', 'menos ', 'que no sea del tipo ',
      'que no sea tipo '
    ];

    const incluir = new Set<string>();
    const excluir = new Set<string>();

    // Detectar negaciones primero
    for (const [codigo, sinonimos] of Object.entries(mapa)) {
      for (const sin of sinonimos) {
        // Negación: "no vegetariano", "sin gluten", "que no sea postre", etc.
        for (const neg of negaciones) {
          // OJO: "sin gluten" es un atributo EN SÍ, no una negación de "gluten"
          // Los excluimos de la detección de negaciones:
          if (neg.trim() === 'sin' && sin === 'gluten') continue;
          if (neg.trim() === 'sin' && sin === 'lactosa') continue;

          if (t.includes(neg + sin)) {
            excluir.add(codigo);
          }
        }
      }
    }

    // Detectar inclusiones (evitando los que ya se excluyeron por negación)
    for (const [codigo, sinonimos] of Object.entries(mapa)) {
      for (const sin of sinonimos) {
        if (t.includes(sin)) {
          // Verificar que no esté precedido por negación
          let negado = false;
          for (const neg of negaciones) {
            if (t.includes(neg + sin)) {
              negado = true;
              break;
            }
          }
          if (!negado) {
            incluir.add(codigo);
          }
        }
      }
    }

    return {
      incluir: Array.from(incluir),
      excluir: Array.from(excluir),
    };
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

    const noIngredientes = new Set([
      // Categorías
      'entrada', 'entradas', 'sopa', 'sopas', 'caldo', 'caldos', 'crema', 'cremas',
      'postre', 'postres', 'bebida', 'bebidas', 'refresco', 'jugo',
      'desayuno', 'desayunos', 'almuerzo', 'cena',
      'plato', 'platos', 'principal', 'fondo',
      // Atributos
      'vegetariano', 'vegetariana', 'vegetarianos',
      'vegano', 'vegana', 'veganos',
      'saludable', 'saludables', 'ligero', 'ligera', 'liviano', 'liviana',
      'light', 'picante', 'picantes', 'economico', 'economica',
      'barato', 'barata', 'accesible', 'celiaco', 'celiaca',
      'intolerante', 'proteico', 'proteica',
      // Conceptos
      'ensalada', 'ensaladas', 'guarnicion', 'guarniciones',
      'comida', 'comidas', 'alimento', 'alimentos',
      'hoy', 'semana', 'dias', 'dia',
    ]);

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
      if (noIngredientes.has(ing)) continue;
      for (const neg of negaciones) {
        if (textoLimpio.includes(neg + ing)) {
          excluir.push(ing);
        }
      }
    }

    // Detectar inclusiones
    for (const ing of ingredientesComunes) {
      if (noIngredientes.has(ing)) continue;
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
      if (noIngredientes.has(ing)) continue;
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