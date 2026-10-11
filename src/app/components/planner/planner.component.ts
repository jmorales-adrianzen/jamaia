import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EnviarWhatsappModalComponent } from 'src/app/components/enviar-whatsapp-modal/enviar-whatsapp-modal.component';
import { ItemCompra } from 'src/app/models/plato.model';
import { UbicacionService } from 'src/app/services/ubicacion.service';
import { MenuService } from 'src/app/services/menu.service';
import { RouterModule } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { MainMenuComponent } from 'src/app/components/main-menu/main-menu.component';

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
  imports: [CommonModule, FormsModule, RouterModule, EnviarWhatsappModalComponent, MainMenuComponent],
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

  // ============================================================
  // DESPENSA COLAPSABLE
  // ============================================================
  despensaAbierta: boolean = false;

  comprasGlobales: { [nombre: string]: { cant: number; unidad: string; costo: number } } = {};
  costoTotalGlobal: number = 0;
  htmlCompras: string = '';
  htmlSugerencias: SafeHtml | string = '';

  // ===== Modal WhatsApp =====
  mostrarModalWhatsapp: boolean = false;
  platosSeleccionados: { dia: string; plato: PlatoCompleto }[] = [];
  comprasDetalladas: ItemCompra[] = [];

  // ============================================================
  // COMBO CON BUSCADOR POR DÍA
  // ============================================================
  comboAbierto: { [dia: string]: boolean } = {};
  textoBusqueda: { [dia: string]: string } = {};
  indiceResaltado: { [dia: string]: number } = {};

  // Lista de platos para los combos (Platos de Fondo + Sopas + Entradas)
  platosCombos: PlatoCompleto[] = [];

  // Categorías incluidas en los combos
  private readonly CATEGORIAS_COMBO = [1, 3, 4];

  constructor(
    private sanitizer: DomSanitizer,
    private ubicacionService: UbicacionService,
    private menuService: MenuService,
    private analytics: AnalyticsService
  ) { }

  // ============================================================
  // HOST LISTENERS
  // ============================================================
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (!target.closest('.combobox')) {
      this.diasKeys.forEach(d => this.comboAbierto[d] = false);
    }
  }

  @HostListener('document:focusin', ['$event'])
  onDocumentFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const combo = target.closest('.combobox');

    this.diasKeys.forEach(dia => {
      if (!combo) {
        this.comboAbierto[dia] = false;
      }
    });
  }

  // ============================================================
  // CICLO DE VIDA
  // ============================================================
  async ngOnInit(): Promise<void> {
    // La despensa siempre empieza cerrada (no persistimos estado).
    this.despensaAbierta = false;

    await this.cargarPaises();
  }

  // ============================================================
  // CARGA INICIAL
  // ============================================================
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

      // 👇 Platos para los combos: Platos de Fondo (1) + Sopas (3) + Entradas (4)
      this.platosCombos = platos.filter(p =>
        p.categoria_id !== null && this.CATEGORIAS_COMBO.includes(p.categoria_id)
      );

      console.log('Platos totales:', platos.length);
      console.log('Platos disponibles en combos (cat 1, 3, 4):', this.platosCombos.length);
      console.log('Categorías presentes:', [...new Set(platos.map(p => p.categoria_id))]);

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

      // Resetear estados de combos
      this.comboAbierto = {};
      this.textoBusqueda = {};
      this.indiceResaltado = {};
      this.diasKeys.forEach(d => {
        this.comboAbierto[d] = false;
        this.textoBusqueda[d] = '';
        this.indiceResaltado[d] = 0;
      });

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

  // ============================================================
  // COMBOBOX CON BUSCADOR Y NAVEGACIÓN POR TECLADO
  // ============================================================
  abrirCombo(dia: DiaSemana): void {
    this.diasKeys.forEach(d => {
      if (d !== dia) this.comboAbierto[d] = false;
    });

    this.comboAbierto[dia] = true;

    if (this.menuSemanal[dia] !== null) {
      const p = this.platoMap.get(this.menuSemanal[dia]!);
      this.textoBusqueda[dia] = p ? p.nombre : '';
      const idx = this.filtrarPlatosPorTexto(this.textoBusqueda[dia])
        .findIndex(x => x.platillo_id === this.menuSemanal[dia]);
      this.indiceResaltado[dia] = idx >= 0 ? idx + 1 : 0;
    } else {
      this.textoBusqueda[dia] = '';
      this.indiceResaltado[dia] = 0;
    }
  }

  cerrarCombo(dia: DiaSemana): void {
    this.comboAbierto[dia] = false;

    const textoActual = this.textoBusqueda[dia] ?? '';
    const coincideAlgunaOpcion = this.filtrarPlatosPorTexto(textoActual).length > 0;

    if (this.menuSemanal[dia] !== null) {
      const p = this.platoMap.get(this.menuSemanal[dia]!);
      if (p && p.nombre === textoActual) {
        return;
      }
      this.textoBusqueda[dia] = p ? p.nombre : '';
    } else if (!coincideAlgunaOpcion) {
      this.textoBusqueda[dia] = '';
    }
  }

  toggleCombo(dia: DiaSemana, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.comboAbierto[dia]) {
      this.comboAbierto[dia] = false;
    } else {
      this.abrirCombo(dia);
    }
  }

  onBuscar(dia: DiaSemana): void {
    this.comboAbierto[dia] = true;
    this.indiceResaltado[dia] = 0;
  }

  filtrarPlatosPorTexto(texto: string): PlatoCompleto[] {
    const t = (texto ?? '').trim().toLowerCase();
    if (!t) return this.platosCombos;
    return this.platosCombos.filter(p =>
      p.nombre.toLowerCase().includes(t)
    );
  }

  seleccionarPlato(dia: DiaSemana, platilloId: number | null): void {
    this.menuSemanal[dia] = platilloId;

    if (platilloId === null) {
      this.textoBusqueda[dia] = '';
    } else {
      const p = this.platoMap.get(platilloId);
      this.textoBusqueda[dia] = p ? p.nombre : '';
    }

    this.comboAbierto[dia] = false;
  }

  limpiarSeleccion(dia: DiaSemana, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuSemanal[dia] = null;
    this.textoBusqueda[dia] = '';
    this.comboAbierto[dia] = false;
  }

  onKeydownCombo(event: KeyboardEvent, dia: DiaSemana, idxDia: number): void {
    const opciones = this.filtrarPlatosPorTexto(this.textoBusqueda[dia]);
    const totalOpciones = opciones.length + 1;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!this.comboAbierto[dia]) {
          this.abrirCombo(dia);
          return;
        }
        this.indiceResaltado[dia] = Math.min(
          this.indiceResaltado[dia] + 1,
          totalOpciones - 1
        );
        this.scrollOpcionVisible(dia);
        break;
      }

      case 'ArrowUp': {
        event.preventDefault();
        if (!this.comboAbierto[dia]) {
          this.abrirCombo(dia);
          return;
        }
        this.indiceResaltado[dia] = Math.max(this.indiceResaltado[dia] - 1, 0);
        this.scrollOpcionVisible(dia);
        break;
      }

      case 'Enter': {
        event.preventDefault();
        if (!this.comboAbierto[dia]) {
          this.abrirCombo(dia);
          return;
        }
        const i = this.indiceResaltado[dia];
        if (i === 0) {
          this.seleccionarPlato(dia, null);
        } else {
          const p = opciones[i - 1];
          if (p) this.seleccionarPlato(dia, p.platillo_id);
        }
        this.enfocarSiguienteDia(idxDia);
        break;
      }

      case 'Escape': {
        event.preventDefault();
        this.cerrarCombo(dia);
        break;
      }

      case 'Tab': {
        this.cerrarCombo(dia);
        break;
      }

      case 'Backspace': {
        if ((this.textoBusqueda[dia] ?? '').length === 0) {
          this.menuSemanal[dia] = null;
        }
        break;
      }
    }
  }

  private enfocarSiguienteDia(idxActual: number): void {
    const siguiente = this.diasKeys[idxActual + 1];
    if (!siguiente) return;

    setTimeout(() => {
      const input = document.getElementById('combo-' + siguiente) as HTMLInputElement | null;
      input?.focus();
      this.abrirCombo(siguiente);
    }, 0);
  }

  private scrollOpcionVisible(dia: DiaSemana): void {
    setTimeout(() => {
      const id = 'opcion-' + dia + '-' + this.indiceResaltado[dia];
      const el = document.getElementById(id);
      el?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  // ============================================================
  // ACCIONES UI
  // ============================================================
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
    if (this.platosCombos.length === 0) return;

    const ids = this.platosCombos.map(p => p.platillo_id);
    const mezcla = [...ids].sort(() => Math.random() - 0.5);

    this.diasKeys.forEach((dia, i) => {
      const id = mezcla[i] ?? null;
      this.menuSemanal[dia] = id;

      if (id !== null) {
        const p = this.platoMap.get(id);
        this.textoBusqueda[dia] = p ? p.nombre : '';
      } else {
        this.textoBusqueda[dia] = '';
      }
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

  // ============================================================
  // DESPENSA COLAPSABLE
  // ============================================================
  toggleDespensa(): void {
    this.despensaAbierta = !this.despensaAbierta;
  }

  contarMarcadosDespensa(): number {
    return Object.values(this.despensa).filter(v => v).length;
  }

  // ============================================================
  // GENERACIÓN
  // ============================================================
  ejecutarGeneracion(): void {
    this.analytics.track('click_generar');
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

        const pasosHtml = this.generarHtmlPasos(plato.preparacion);

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

  private generarHtmlPasos(preparacion: string): string {
    if (!preparacion) return '';

    const lineas = preparacion
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    interface Seccion { titulo: string; pasos: string[]; }
    const secciones: Seccion[] = [];
    let seccionActual: Seccion | null = null;

    for (const linea of lineas) {
      if (linea.startsWith('🔹')) {
        seccionActual = {
          titulo: linea.replace('🔹', '').trim(),
          pasos: []
        };
        secciones.push(seccionActual);
      } else if (seccionActual) {
        seccionActual.pasos.push(linea.replace(/^\d+[\.\)]\s*/, ''));
      } else {
        seccionActual = {
          titulo: '',
          pasos: [linea.replace(/^\d+[\.\)]\s*/, '')]
        };
        secciones.push(seccionActual);
      }
    }

    return secciones.map(s => `
      <div class="prep-seccion">
        ${s.titulo ? `<h4 class="prep-seccion-titulo">${s.titulo}</h4>` : ''}
        <ol class="prep-seccion-pasos">
          ${s.pasos.map(p => `<li>${p}</li>`).join('')}
        </ol>
      </div>
    `).join('');
  }

  // ============================================================
  // WHATSAPP
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