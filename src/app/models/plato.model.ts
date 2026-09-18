export interface Ingrediente {
  id: string;
  nombre: string;
  cant: number;
  unidad: string;
  precioUnit: number;
}

export interface Plato {
  nombre: string;
  imagen: string;
  ingredientes: Ingrediente[];
  sugerenciaPrevia: string;
  preparacion: string;
}

export type CatalogoPlatos = Record<string, Plato>;

export interface CompraAcumulada {
  cant: number;
  unidad: string;
  costo: number;
}

export interface PlatoSeleccionado {
  dia: string;
  key: string;
  plato: Plato;
}