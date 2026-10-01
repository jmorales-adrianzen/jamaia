import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ValidacionTermino {
  termino: string;
  reconocido: boolean;
  coincidencias: string[];
  sugerencias: string[];
}

@Injectable({ providedIn: 'root' })
export class ValidacionTerminosService {
  constructor(private sb: SupabaseService) {}

  /**
   * Valida un array de términos contra el catálogo de ingredientes.
   */
  async validarTerminos(
    terminos: string[],
    ubicacionId: number
  ): Promise<ValidacionTermino[]> {
    if (terminos.length === 0) return [];

    try {
      const { data, error } = await this.sb.client.functions.invoke(
        'validate-terms',
        { body: { terminos, ubicacion_id: ubicacionId } }
      );

      if (error) throw error;
      return data?.resultados ?? [];
    } catch (e) {
      console.warn('⚠️ Validación de términos falló (no crítico):', e);
      return [];
    }
  }
}