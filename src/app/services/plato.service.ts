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
  constructor(private sb: SupabaseService) {}

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
        platillos!inner(imagen_url, tiempo_prep)
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
}