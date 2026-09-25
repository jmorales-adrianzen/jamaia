import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EnviarWhatsappModalComponent } from 'src/app/components/enviar-whatsapp-modal/enviar-whatsapp-modal.component';
import { ItemCompra } from 'src/app/models/plato.model';
import { UbicacionService } from 'src/app/services/ubicacion.service';
import { MenuService } from 'src/app/services/menu.service';
import { RouterModule } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics.service';
import {
  PlatoCompleto,
  Ubicacion,
  ResultadoMenu,
  MenuSemanal,
  DiaSemana,
  CategoriaDespensa,
  IngredienteDespensa
} from 'src/app/models/plato.model';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EnviarWhatsappModalComponent],
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css']
})
export class PlannerComponent implements OnInit {

  paises: Ubicacion[] = [];
  paisActual: string = 'PE';
  paisSeleccionado: Ubicacion | null = null;
  simboloMoneda: string = 'S/';

  personas: number = 4;
  maxPersonas: number = 10;
  minPersonas: number = 1;

  cargando: boolean = false;
  cargandoDatos: boolean = false;
  mostrarResultado: boolean = false;
  selectAllChecked: boolean = false;
  errorMensaje: string | null = null;

  platosDisponibles: PlatoCompleto[] = [];
  private platoMap = new Map<number, PlatoCompleto>();

  menuSemanal: MenuSemanal = {
    lunes: null, martes: null, miercoles: null,
    jueves: null, viernes: null, sabado: null, domingo: null
  };

  diasKeys: DiaSemana[] = [
    'lunes', 'martes', 'miercoles', 'jueves',
    'viernes', 'sabado', 'domingo'
  ];

  despensa: { [ingredienteId: number]: boolean } = {};
  categoriasDespensa: CategoriaDespensa[] = [];
  filtroDespensa: string = '';

  comprasGlobales: { [nombre: string]: { cant: number; unidad: string; costo: number } } = {};
  costoTotalGlobal: number = 0;
  htmlCompras: string = '';
  htmlSugerencias: SafeHtml | string = '';

    // ===== Modal WhatsApp =====
  mostrarModalWhatsapp: boolean = false;
  platosSeleccionados: { dia: string; plato: PlatoCompleto }[] = [];
  comprasDetalladas: ItemCompra[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private ubicacionService: UbicacionService,
    private menuService: MenuService,
    private analytics: AnalyticsService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarPaises();
  }

  private async cargarPaises(): Promise<void> {
    try {
      this.paises = await this.ubicacionService.obtenerPaises();
      const peru = this.paises.find(p => p.codigo_iso === 'PE') ?? this.paises[0];
      if (peru) {
        this.paisSeleccionado = peru;
        this.paisActual = peru.codigo_iso ?? 'PE';
        this.simboloMoneda = this.paisActual === 'PE' ? 'S/' : '$';
        await this.cargarDatosDelPais();
      }
    } catch (e: any) {
      console.error('Error al cargar países', e);
      this.errorMensaje = 'No pudimos cargar los países. Intenta recargar.';
    }
  }

  private async cargarDatosDelPais(): Promise<void> {
    if (!this.paisSeleccionado) return;
    this.cargandoDatos = true;
    this.errorMensaje = null;

    try {
      const platos = await this.menuService.obtenerPlatos(this.paisSeleccionado.id);
      this.platosDisponibles = platos;
      this.platoMap = new Map(platos.map(p => [p.platillo_id, p]));

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

      this.agruparDespensa(Array.from(mapa.values()));

      this.despensa = {};
      this.categoriasDespensa.forEach(cat =>
        cat.items.forEach(i => this.despensa[i.id] = false)
      );
      this.selectAllChecked = false;
      this.filtroDespensa = '';
      this.menuSemanal = this.menuService.crearSemanaVacia();
      this.mostrarResultado = false;
      this.htmlCompras = '';
      this.htmlSugerencias = '';
      this.comprasGlobales = {};
      this.costoTotalGlobal = 0;
    } catch (e: any) {
      console.error('Error al cargar platos', e);
      this.errorMensaje = 'No pudimos cargar los platos. Intenta recargar.';
    } finally {
      this.cargandoDatos = false;
    }
  }

  private agruparDespensa(ingredientes: IngredienteDespensa[]): void {
    const grupos = new Map<string, CategoriaDespensa>();

    for (const ing of ingredientes) {
      if (!grupos.has(ing.categoria_codigo)) {
        grupos.set(ing.categoria_codigo, {
          codigo: ing.categoria_codigo,
          nombre: ing.categoria_nombre,
          icono: ing.categoria_icono,
          orden: ing.categoria_orden,
          expandida: false,
          items: []
        });
      }
      grupos.get(ing.categoria_codigo)!.items.push(ing);
    }

    this.categoriasDespensa = Array.from(grupos.values())
      .sort((a, b) => a.orden - b.orden);

    this.categoriasDespensa.forEach(cat =>
      cat.items.sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
  }

  async cambiarPais(): Promise<void> {
    const pais = this.paises.find(p => p.codigo_iso === this.paisActual);
    if (!pais) return;
    this.paisSeleccionado = pais;
    this.simboloMoneda = this.paisActual === 'PE' ? 'S/' : '$';
    await this.cargarDatosDelPais();
  }

  cambiarPersonas(delta: number): void {
    this.personas = Math.max(
      this.minPersonas,
      Math.min(this.maxPersonas, this.personas + delta)
    );
  }

  toggleCategoria(cat: CategoriaDespensa): void {
    cat.expandida = !cat.expandida;
  }

  toggleCategoriaCompleta(cat: CategoriaDespensa, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    cat.items.forEach(i => this.despensa[i.id] = checked);
    this.actualizarEstadoSelectAll();
  }

  contarMarcadosCategoria(cat: CategoriaDespensa): number {
    return cat.items.filter(i => this.despensa[i.id]).length;
  }

  toggleSelectAll(): void {
    Object.keys(this.despensa).forEach(k => {
      this.despensa[+k] = this.selectAllChecked;
    });
  }

  actualizarEstadoSelectAll(): void {
    const valores = Object.values(this.despensa);
    this.selectAllChecked = valores.length > 0 && valores.every(v => v);
  }

  seleccionarAleatorio(): void {
    if (this.platosDisponibles.length === 0) return;
    const ids = this.platosDisponibles.map(p => p.platillo_id);
    const mezcla = [...ids].sort(() => Math.random() - 0.5);

    this.diasKeys.forEach((dia, i) => {
      this.menuSemanal[dia] = mezcla[i] ?? null;
    });
  }

  get todasExpandidas(): boolean {
    return this.categoriasDespensa.length > 0 &&
           this.categoriasDespensa.every(cat => cat.expandida);
  }

  toggleExpandirTodas(): void {
    const todasAbiertas = this.categoriasDespensa.every(cat => cat.expandida);
    this.categoriasDespensa.forEach(cat => cat.expandida = !todasAbiertas);
  }

  onFiltroChange(): void {
    const f = this.filtroDespensa.trim().toLowerCase();

    if (!f) {
      this.categoriasDespensa.forEach(cat => cat.expandida = false);
      return;
    }

    this.categoriasDespensa.forEach(cat => {
      const tieneCoincidencias = cat.items.some(i =>
        i.nombre.toLowerCase().includes(f)
      );
      cat.expandida = tieneCoincidencias;
    });
  }

ejecutarGeneracion(): void {
  this.analytics.track('click_generar');   // 👈 NUEVO
  this.mostrarResultado = false;
  this.cargando = true;
  setTimeout(() => {
    this.cargando = false;
    this.generarPlanificacion();
  }, 800);
}

  private generarPlanificacion(): void {
    const resultado: ResultadoMenu = this.menuService.calcularMenu(
      this.menuSemanal,
      this.platoMap,
      this.personas,
      this.despensa
    );

    // 👇 NUEVO: guardar datos para el modal
    this.comprasDetalladas = resultado.compras;
    this.platosSeleccionados = resultado.platosConDetalle;    

    this.comprasGlobales = {};
    for (const c of resultado.compras) {
      this.comprasGlobales[c.nombre] = {
        cant: c.cantidad,
        unidad: c.unidad,
        costo: c.costo
      };
    }
    this.costoTotalGlobal = resultado.costoTotal;

    let htmlC = '<ul>';
    for (const c of resultado.compras) {
      htmlC += `<li><strong>${c.nombre}:</strong> ${this.menuService.formatearCantidad(c.cantidad, c.unidad)} — <em>${this.simboloMoneda} ${c.costo.toFixed(2)}</em></li>`;
    }
    htmlC += '</ul>';
    this.htmlCompras = htmlC;

    let htmlS = '';
    if (resultado.platosConDetalle.length === 0) {
      htmlS = '<p style="text-align:center;color:#718096;">No has seleccionado ningún plato.</p>';
    } else {
      for (const { dia, plato } of resultado.platosConDetalle) {
        const insumos = plato.ingredientes
          .map(i => `<b>${i.nombre}:</b> ${this.menuService.formatearCantidad(i.cantidad * this.personas, i.unidad)}`)
          .join(' • ');

        const pasosArr = plato.preparacion
          ? plato.preparacion.split(/\r?\n/).filter(p => p.trim() !== '')
          : [];
        const pasosHtml = pasosArr.length
          ? `<ol>${pasosArr.map(p => `<li>${p.replace(/^\d+[\.\)]\s*/, '')}</li>`).join('')}</ol>`
          : plato.preparacion;

        const tipsHtml = plato.recomendacion
          ? `
            <div class="prep-section prep-section-tips">
              <strong>💡 Tips:</strong>
              <p>${plato.recomendacion}</p>
            </div>
          `
          : '';

        const acompHtml = plato.acompanamientos.length > 0
          ? `
            <div class="prep-section prep-section-acomp">
              <strong>🍽️ Acompáñalo con...</strong>
              <ul>
                ${plato.acompanamientos.map(a => `
                  <li>${a.tipo_icono} <b>${a.tipo_nombre}:</b> ${a.sugerencia}</li>
                `).join('')}
              </ul>
            </div>
          `
          : '';

        htmlS += `
          <div class="prep-card">
            <div class="prep-day">📌 ${dia}</div>
            <div class="prep-dish">${plato.nombre}</div>
            ${plato.tiempo_prep ? `<div class="prep-time">🕒 Tiempo estimado de preparación: ${plato.tiempo_prep}</div>` : ''}
            ${plato.imagen_url ? `<img src="${plato.imagen_url}" alt="${plato.nombre}" class="dish-img" loading="lazy" onerror="this.style.display='none'">` : ''}

            <div class="prep-section prep-section-insumos">
              <strong>🥘 Insumos exactos para ${this.personas} personas:</strong>
              <p>${insumos}</p>
            </div>

            <div class="prep-section prep-section-pasos">
              <strong>📝 Pasos de Preparación:</strong>
              ${pasosHtml}
            </div>

            ${tipsHtml}

            ${acompHtml}
          </div>
        `;
      }
    }

    this.htmlSugerencias = this.sanitizer.bypassSecurityTrustHtml(htmlS);
    this.mostrarResultado = true;
  }

  // ============================================================
  //  WHATSAPP — Abrir modal
  // ============================================================
  abrirModalWhatsapp(): void {
    if (this.comprasDetalladas.length === 0) {
      alert('Primero genera la lista de compras.');
      return;
    }
    this.mostrarModalWhatsapp = true;
  }

  cerrarModalWhatsapp(): void {
    this.mostrarModalWhatsapp = false;
  }

}