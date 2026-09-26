import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainMenuComponent } from '../main-menu/main-menu.component';

import { UbicacionService } from 'src/app/services/ubicacion.service';
import { MenuService } from 'src/app/services/menu.service';
import { PlatoService, PlatoMatch } from 'src/app/services/plato.service';
import { AnalyticsService } from 'src/app/services/analytics.service';

import {
  Ubicacion,
  PlatoCompleto,
  IngredientePlato,
  IngredienteDespensa,
  CategoriaDespensa
} from 'src/app/models/plato.model';

@Component({
  selector: 'app-despensa',
  standalone: true,
  imports: [CommonModule, FormsModule, MainMenuComponent],
  templateUrl: './despensa.component.html',
  styleUrls: ['./despensa.component.css']
})
export class DespensaComponent implements OnInit {

  // ===== Estado de país =====
  paises: Ubicacion[] = [];
  paisActual: string = 'PE';
  paisSeleccionado: Ubicacion | null = null;
  simboloMoneda: string = 'S/';

  // ===== Ingredientes =====
  ingredientes: IngredienteDespensa[] = [];
  categorias: CategoriaDespensa[] = [];
  seleccionados: Set<number> = new Set();
  filtroIngredientes: string = '';

  // ===== Configuración de búsqueda =====
  maxFaltantes: number = 2;
  opcionesFaltantes = [
    { valor: 0, label: 'Exacto',   desc: 'Solo platos completos' },
    { valor: 1, label: 'Flexible', desc: 'Hasta 1 faltante' },
    { valor: 2, label: 'Abierto',  desc: 'Hasta 2 faltantes' },
    { valor: 3, label: 'Muy abierto', desc: 'Hasta 3 faltantes' }
  ];

  // ===== Estado de carga =====
  cargandoDatos: boolean = false;
  buscando: boolean = false;
  errorMensaje: string | null = null;

  // ===== Resultados =====
  resultados: PlatoMatch[] = [];
  haBuscado: boolean = false;
  detalleExpandido: number | null = null;
  detalleActual: PlatoCompleto | null = null;
  cargandoDetalle: boolean = false;

  constructor(
    private ubicacionService: UbicacionService,
    private menuService: MenuService,
    private platoService: PlatoService,
    private analytics: AnalyticsService
  ) {}

  async ngOnInit(): Promise<void> {
    window.scrollTo(0, 0);
    await this.cargarPaises();
  }

  // ============================================================
  //  CARGA INICIAL
  // ============================================================
  private async cargarPaises(): Promise<void> {
    try {
      this.paises = await this.ubicacionService.obtenerPaises();
      const peru = this.paises.find(p => p.codigo_iso === 'PE') ?? this.paises[0];
      if (peru) {
        this.paisSeleccionado = peru;
        this.paisActual = peru.codigo_iso ?? 'PE';
        this.simboloMoneda = this.paisActual === 'PE' ? 'S/' : '$';
        await this.cargarIngredientesDelPais();
      }
    } catch (e: any) {
      console.error('Error al cargar países', e);
      this.errorMensaje = 'No pudimos cargar los países. Intenta recargar.';
    }
  }

  private async cargarIngredientesDelPais(): Promise<void> {
    if (!this.paisSeleccionado) return;
    this.cargandoDatos = true;
    this.errorMensaje = null;

    try {
      const platos = await this.menuService.obtenerPlatos(this.paisSeleccionado.id);

      // Extraer ingredientes únicos
      const mapa = new Map<number, IngredienteDespensa>();
      for (const p of platos) {
        for (const i of p.ingredientes) {
          if (!mapa.has(i.ingrediente_id)) {
            mapa.set(i.ingrediente_id, {
              id: i.ingrediente_id,
              nombre: i.nombre,
              categoria_codigo: i.categoria_codigo ?? 'otros',
              categoria_nombre: i.categoria_nombre ?? 'Otros',
              categoria_icono: i.categoria_icono ?? '📦',
              categoria_orden: i.categoria_orden ?? 999
            });
          }
        }
      }

      this.agruparIngredientes(Array.from(mapa.values()));

      // Reset
      this.seleccionados.clear();
      this.filtroIngredientes = '';
      this.resultados = [];
      this.haBuscado = false;
      this.detalleExpandido = null;
      this.detalleActual = null;

      // Track
      this.analytics.track('app_load', '/despensa');
    } catch (e: any) {
      console.error('Error al cargar ingredientes', e);
      this.errorMensaje = 'No pudimos cargar los ingredientes. Intenta recargar.';
    } finally {
      this.cargandoDatos = false;
    }
  }

  private agruparIngredientes(ingredientes: IngredienteDespensa[]): void {
    const grupos = new Map<string, CategoriaDespensa>();

    for (const ing of ingredientes) {
      if (!grupos.has(ing.categoria_codigo)) {
        grupos.set(ing.categoria_codigo, {
          codigo: ing.categoria_codigo,
          nombre: ing.categoria_nombre,
          icono: ing.categoria_icono,
          orden: ing.categoria_orden,
          expandida: true,
          items: []
        });
      }
      grupos.get(ing.categoria_codigo)!.items.push(ing);
    }

    this.categorias = Array.from(grupos.values())
      .sort((a, b) => a.orden - b.orden);

    this.categorias.forEach(cat =>
      cat.items.sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
  }

  // ============================================================
  //  ACCIONES UI
  // ============================================================
  async cambiarPais(): Promise<void> {
    const pais = this.paises.find(p => p.codigo_iso === this.paisActual);
    if (!pais) return;
    this.paisSeleccionado = pais;
    this.simboloMoneda = this.paisActual === 'PE' ? 'S/' : '$';
    await this.cargarIngredientesDelPais();
  }

  toggleIngrediente(id: number): void {
    if (this.seleccionados.has(id)) {
      this.seleccionados.delete(id);
    } else {
      this.seleccionados.add(id);
    }
  }

  isSeleccionado(id: number): boolean {
    return this.seleccionados.has(id);
  }

  toggleCategoria(cat: CategoriaDespensa): void {
    cat.expandida = !cat.expandida;
  }

  contarSeleccionadosCategoria(cat: CategoriaDespensa): number {
    return cat.items.filter(i => this.seleccionados.has(i.id)).length;
  }

  toggleCategoriaCompleta(cat: CategoriaDespensa, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    cat.items.forEach(i => {
      if (checked) this.seleccionados.add(i.id);
      else this.seleccionados.delete(i.id);
    });
  }

  limpiarSeleccion(): void {
    this.seleccionados.clear();
    this.resultados = [];
    this.haBuscado = false;
    this.detalleExpandido = null;
    this.detalleActual = null;
  }

  get totalSeleccionados(): number {
    return this.seleccionados.size;
  }

  // ============================================================
  //  BÚSQUEDA
  // ============================================================
  async buscar(): Promise<void> {
    if (this.seleccionados.size === 0) {
      this.errorMensaje = 'Selecciona al menos un ingrediente para buscar.';
      return;
    }
    if (!this.paisSeleccionado) return;

    this.buscando = true;
    this.errorMensaje = null;
    this.detalleExpandido = null;
    this.detalleActual = null;

    // Track
    this.analytics.track('click_generar', '/despensa');

    try {
      const ids = Array.from(this.seleccionados);
      const resultados = await this.platoService.buscarPorIngredientes(
        ids,
        this.paisSeleccionado.id,
        this.maxFaltantes,
        30
      );

      // Ordenar por porcentaje de match DESC (tu decisión)
      this.resultados = resultados.sort((a, b) => {
        if (b.porcentaje_match !== a.porcentaje_match) {
          return b.porcentaje_match - a.porcentaje_match;
        }
        return a.ingredientes_faltantes - b.ingredientes_faltantes;
      });

      this.haBuscado = true;
    } catch (e: any) {
      console.error('Error al buscar platos', e);
      this.errorMensaje = 'Hubo un error al buscar. Intenta nuevamente.';
    } finally {
      this.buscando = false;
    }
  }

  // ============================================================
  //  DETALLE EXPANDIDO
  // ============================================================
  async toggleDetalle(platilloId: number): Promise<void> {
    if (this.detalleExpandido === platilloId) {
      // Cerrar
      this.detalleExpandido = null;
      this.detalleActual = null;
      return;
    }

    // Abrir
    this.detalleExpandido = platilloId;
    this.cargandoDetalle = true;
    this.detalleActual = null;

    try {
      if (!this.paisSeleccionado) return;
      this.detalleActual = await this.platoService.obtenerDetallePlato(
        platilloId,
        this.paisSeleccionado.id
      );
    } catch (e: any) {
      console.error('Error al cargar detalle', e);
    } finally {
      this.cargandoDetalle = false;
    }
  }

// ============================================================
//  OBTENER FALTANTES DE UN PLATO
// ============================================================
/**
 * Compara los ingredientes del plato con los que el usuario
 * seleccionó, y devuelve la lista de los que faltan.
 */
obtenerFaltantes(plato: PlatoCompleto): IngredientePlato[] {
  return plato.ingredientes.filter(
    ing => !this.seleccionados.has(ing.ingrediente_id)
  );
}

  // ============================================================
  //  HELPERS
  // ============================================================
  formatearCantidad(cant: number, unidad: string): string {
    return this.menuService.formatearCantidad(cant, unidad);
  }

  getPlatoMatch(platilloId: number): PlatoMatch | undefined {
    return this.resultados.find(r => r.platillo_id === platilloId);
  }
}