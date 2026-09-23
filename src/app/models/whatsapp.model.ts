// src/app/models/whatsapp.model.ts
import { ItemCompra, PlatoCompleto } from './plato.model';

/**
 * Modos de envío disponibles en el modal.
 */
export type ModoEnvio = 'proveedor' | 'compartir' | 'rapida';

/**
 * Datos que el modal recibe del planner para construir el mensaje.
 */
export interface DatosEnvioWhatsapp {
  compras: ItemCompra[];
  platos: { dia: string; plato: PlatoCompleto }[];
  personas: number;
  pais: string;
  simboloMoneda: string;
}

/**
 * Opciones configuradas por el usuario en el modal.
 */
export interface OpcionesEnvioWhatsapp {
  modo: ModoEnvio;
  // Solo para modo 'proveedor'
  categoriasSeleccionadas: string[];   // códigos de categoría
  nombreCliente?: string;
  direccionCliente?: string;
  // Solo para modo 'compartir'
  incluirPlatos: boolean;
  incluirPrecios: boolean;
}