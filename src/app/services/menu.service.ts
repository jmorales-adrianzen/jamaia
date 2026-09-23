import { Injectable } from '@angular/core';
import { PlatoService } from './plato.service';
import {
  PlatoCompleto,
  ItemCompra,
  ResultadoMenu,
  PlatoSeleccionado,
  MenuSemanal,
  MenuMensual,
  SemanaMenu,
  DiaSemana
} from '../models/plato.model';

@Injectable({ providedIn: 'root' })
export class MenuService {

  /**
   * Orden canónico de los días de la semana.
   * Reutilizable en cualquier cálculo del menú.
   */
  readonly diasKeys: DiaSemana[] = [
    'lunes', 'martes', 'miercoles', 'jueves',
    'viernes', 'sabado', 'domingo'
  ];

  constructor(private platoService: PlatoService) {}

  // ============================================================
  //  CARGA DE PLATOS
  // ============================================================

  /**
   * Trae los platos de un país desde Supabase.
   */
  async obtenerPlatos(ubicacionId: number): Promise<PlatoCompleto[]> {
    return this.platoService.obtenerPlatosPorPais(ubicacionId);
  }

  // ============================================================
  //  CÁLCULO DEL MENÚ (semanal)
  // ============================================================

  /**
   * Calcula la lista de compras de UNA semana.
   * Es la pieza central: la usarás también para cada semana del menú mensual.
   */
  calcularMenu(
    menuSemanal: MenuSemanal,
    platoMap: Map<number, PlatoCompleto>,
    personas: number,
    despensa: { [ingredienteId: number]: boolean }
  ): ResultadoMenu {
    const ignorar = Object.entries(despensa)
      .filter(([, v]) => v)
      .map(([k]) => +k);

    const comprasAcc: { [ingredienteId: number]: ItemCompra } = {};
    let costoTotal = 0;
    const platosConDetalle: PlatoSeleccionado[] = [];

    for (const diaKey of this.diasKeys) {
      const platoId = menuSemanal[diaKey];
      if (!platoId) continue;

      const plato = platoMap.get(platoId);
      if (!plato) continue;

      const diaFmt = diaKey.charAt(0).toUpperCase() + diaKey.slice(1);
      platosConDetalle.push({ dia: diaFmt, plato });

      for (const ing of plato.ingredientes) {
        if (ignorar.includes(ing.ingrediente_id)) continue;

        const cantidadTotal = ing.cantidad * personas;
        const costo = ing.precio_unitario
          ? cantidadTotal * ing.precio_unitario
          : 0;

        if (!comprasAcc[ing.ingrediente_id]) {
          comprasAcc[ing.ingrediente_id] = {
            ingrediente_id: ing.ingrediente_id,
            nombre: ing.nombre,
            cantidad: 0,
            unidad: ing.unidad,
            costo: 0,
            categoria_orden: ing.categoria_orden ?? 999,
            categoria_icono: ing.categoria_icono ?? '📦',
            categoria_nombre: ing.categoria_nombre ?? 'Otros'
          };
        }

        comprasAcc[ing.ingrediente_id].cantidad += cantidadTotal;
        comprasAcc[ing.ingrediente_id].costo += costo;
        costoTotal += costo;
      }
    }

    // Ordenar por categoría, luego por nombre
    const compras = Object.values(comprasAcc).sort((a, b) => {
      if (a.categoria_orden !== b.categoria_orden) {
        return a.categoria_orden - b.categoria_orden;
      }
      return a.nombre.localeCompare(b.nombre);
    });

    return { compras, costoTotal, platosConDetalle };
  }

  // ============================================================
  //  CÁLCULO DEL MENÚ (mensual) — Preparado para v2
  // ============================================================

  /**
   * (Preparado para v2) Calcula el menú de un mes completo.
   * Reutiliza `calcularMenu` por cada semana y consolida resultados.
   *
   * Uso futuro:
   *   const resultado = menuService.calcularMenuMensual(
   *     menuMensual, platoMap, 4, despensa
   *   );
   */
  calcularMenuMensual(
    menuMensual: MenuMensual,
    platoMap: Map<number, PlatoCompleto>,
    personas: number,
    despensa: { [ingredienteId: number]: boolean }
  ): ResultadoMenu {
    const semanas: SemanaMenu[] = Object.values(menuMensual)
      .filter((s): s is SemanaMenu => !!s);

    const comprasAcc: { [ingredienteId: number]: ItemCompra } = {};
    let costoTotal = 0;
    const platosConDetalle: PlatoSeleccionado[] = [];

    for (const semana of semanas) {
      const resultado = this.calcularMenu(semana, platoMap, personas, despensa);

      for (const c of resultado.compras) {
        if (!comprasAcc[c.ingrediente_id]) {
          comprasAcc[c.ingrediente_id] = { ...c, cantidad: 0, costo: 0 };
        }
        comprasAcc[c.ingrediente_id].cantidad += c.cantidad;
        comprasAcc[c.ingrediente_id].costo += c.costo;
      }

      costoTotal += resultado.costoTotal;
      platosConDetalle.push(...resultado.platosConDetalle);
    }

    const compras = Object.values(comprasAcc).sort((a, b) => {
      if (a.categoria_orden !== b.categoria_orden) {
        return a.categoria_orden - b.categoria_orden;
      }
      return a.nombre.localeCompare(b.nombre);
    });

    return { compras, costoTotal, platosConDetalle };
  }

  // ============================================================
  //  UTILIDADES
  // ============================================================

  /**
   * Formatea una cantidad para mostrarla (kg si es > 1000g, etc.).
   */
  formatearCantidad(cant: number, unidad: string): string {
    if (cant >= 1000 && unidad === 'g') {
      return (cant / 1000).toFixed(2) + ' kg';
    }
    if (unidad === 'unid' || unidad === 'lata' || unidad === 'litro') {
      return (cant < 1 && unidad === 'litro' ? cant.toFixed(2) : Math.ceil(cant)) + ' ' + unidad;
    }
    return Math.round(cant) + ' ' + unidad;
  }

  /**
   * Crea una semana vacía (todos los días en null).
   * Útil para inicializar el estado del componente.
   */
  crearSemanaVacia(): SemanaMenu {
    return {
      lunes: null,
      martes: null,
      miercoles: null,
      jueves: null,
      viernes: null,
      sabado: null,
      domingo: null
    };
  }
}