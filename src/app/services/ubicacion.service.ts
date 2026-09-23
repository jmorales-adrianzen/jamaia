// src/app/services/ubicacion.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Database } from '../models/database.types';

type UbicacionRow = Database['public']['Tables']['ubicaciones']['Row'];

export interface Ubicacion {
  id: number;
  nombre: string;
  tipo: 'pais' | 'ciudad' | 'distrito';
  padre_id: number | null;
  codigo_iso: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  constructor(private sb: SupabaseService) {}

  async obtenerPaises(): Promise<Ubicacion[]> {
    const { data, error } = await this.sb.client
      .from('ubicaciones')
      .select('*')
      .eq('tipo', 'pais')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return (data ?? []).map(this.mapUbicacion);
  }

  async obtenerCiudades(paisId: number): Promise<Ubicacion[]> {
    const { data, error } = await this.sb.client
      .from('ubicaciones')
      .select('*')
      .eq('tipo', 'ciudad')
      .eq('padre_id', paisId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return (data ?? []).map(this.mapUbicacion);
  }

  async obtenerDistritos(ciudadId: number): Promise<Ubicacion[]> {
    const { data, error } = await this.sb.client
      .from('ubicaciones')
      .select('*')
      .eq('tipo', 'distrito')
      .eq('padre_id', ciudadId)
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;
    return (data ?? []).map(this.mapUbicacion);
  }

  private mapUbicacion(row: UbicacionRow): Ubicacion {
    return {
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo as 'pais' | 'ciudad' | 'distrito',
      padre_id: row.padre_id,
      codigo_iso: row.codigo_iso,
      activo: row.activo ?? true
    };
  }
}