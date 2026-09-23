// ============================================================
//  INTERFACES DEL DOMINIO (alineadas con Supabase)
// ============================================================

export interface IngredientePlato {
  ingrediente_id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number | null;
  categoria_id: number | null;
  categoria_codigo: string | null;
  categoria_nombre: string | null;
  categoria_icono: string | null;
  categoria_orden: number | null;
}

export interface RecomendacionAcompanamiento {
  tipo_codigo: string;
  tipo_nombre: string;
  tipo_icono: string;
  sugerencia: string;
}

export interface PlatoCompleto {
  platillo_id: number;
  nombre: string;
  preparacion: string;
  imagen_url: string;
  tiempo_prep: string;
  recomendacion: string | null;
  ingredientes: IngredientePlato[];
  acompanamientos: RecomendacionAcompanamiento[];
}

// ============================================================
//  UBICACIONES
// ============================================================

export interface Ubicacion {
  id: number;
  nombre: string;
  tipo: 'pais' | 'ciudad' | 'distrito';
  padre_id: number | null;
  codigo_iso: string | null;
  activo: boolean;
}

// ============================================================
//  MENÚ SEMANAL / MENSUAL
// ============================================================

export type DiaSemana =
  | 'lunes' | 'martes' | 'miercoles' | 'jueves'
  | 'viernes' | 'sabado' | 'domingo';

export type SemanaMenu = {
  [K in DiaSemana]: number | null;
};

export type MenuSemanal = SemanaMenu;

export type MenuMensual = {
  [K in `semana${1 | 2 | 3 | 4 | 5}`]?: SemanaMenu;
};

// ============================================================
//  CÁLCULO DEL MENÚ
// ============================================================

export interface ItemCompra {
  ingrediente_id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  costo: number;
  categoria_orden: number;
  categoria_icono: string;
  categoria_nombre: string;
}

export interface PlatoSeleccionado {
  dia: string;
  plato: PlatoCompleto;
}

export interface ResultadoMenu {
  compras: ItemCompra[];
  costoTotal: number;
  platosConDetalle: PlatoSeleccionado[];
}

// ============================================================
//  DESPENSA AGRUPADA
// ============================================================

export interface IngredienteDespensa {
  id: number;
  nombre: string;
  categoria_codigo: string;
  categoria_nombre: string;
  categoria_icono: string;
  categoria_orden: number;
}

export interface CategoriaDespensa {
  codigo: string;
  nombre: string;
  icono: string;
  orden: number;
  expandida: boolean;
  items: IngredienteDespensa[];
}