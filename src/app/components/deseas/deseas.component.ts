import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MainMenuComponent } from '../main-menu/main-menu.component';

import { UbicacionService } from 'src/app/services/ubicacion.service';
import { PlatoService, PlatoMatch } from 'src/app/services/plato.service';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { ValidacionTerminosService, ValidacionTermino } from 'src/app/services/validacion-terminos.service';

import {
  Ubicacion,
  PlatoCompleto,
  IngredientePlato
} from 'src/app/models/plato.model';

@Component({
  selector: 'app-deseas',
  standalone: true,
  imports: [CommonModule, FormsModule, MainMenuComponent],
  templateUrl: './deseas.component.html',
  styleUrls: ['./deseas.component.css']
})
export class DeseasComponent implements OnInit {

  // ===== País =====
  paises: Ubicacion[] = [];
  paisActual: string = 'PE';
  paisSeleccionado: Ubicacion | null = null;

  // ===== Búsqueda =====
  consulta: string = '';
  buscando: boolean = false;
  haBuscado: boolean = false;
  errorMensaje: string | null = null;

  // ===== Resultados =====
  resultados: PlatoMatch[] = [];

  // ===== Detalle expandible =====
  detalleExpandido: number | null = null;
  detalleActual: PlatoCompleto | null = null;
  cargandoDetalle: boolean = false;

  // ===== Validación de términos =====
  sugerenciasBusqueda: ValidacionTermino[] = [];

  atributosIncluir: string[] = [];
  atributosExcluir: string[] = [];

  // ===== Ejemplos inspiradores =====
  readonly ejemplos: string[] = [
    'algo con pollo',
    'algo con pollo y papa pero sin arroz',
    'algo con carne y papa',
    'algo con fideos spaghetti',
    'algo con pescado',
    'algo vegetariano',
    'algo con ensalada',
    'quiero un postre',    
  ];

  constructor(
    private ubicacionService: UbicacionService,
    private platoService: PlatoService,
    private analytics: AnalyticsService,
    private validacionService: ValidacionTerminosService
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
      }
      this.analytics.track('app_load', '/deseas');
    } catch (e) {
      console.error('Error al cargar países', e);
      this.errorMensaje = 'No pudimos cargar los países.';
    }
  }

  // ============================================================
  //  ACCIONES UI
  // ============================================================
  async cambiarPais(): Promise<void> {
    const pais = this.paises.find(p => p.codigo_iso === this.paisActual);
    if (!pais) return;
    this.paisSeleccionado = pais;

    // Si ya hay resultados, re-buscar
    if (this.haBuscado && this.consulta.trim()) {
      await this.buscar();
    }
  }

  usarEjemplo(ejemplo: string): void {
    this.consulta = ejemplo;
    // Auto-focus en el input (opcional)
  }

  // ============================================================
  //  BÚSQUEDA SEMÁNTICA
  // ============================================================
  async buscar(): Promise<void> {
    const texto = this.consulta.trim();

    if (!texto) {
      this.errorMensaje = 'Escribe qué deseas comer.';
      return;
    }

    if (texto.length < 5) {
      this.errorMensaje = 'Cuéntanos un poco más sobre lo que deseas comer.';
      return;
    }

    if (!this.paisSeleccionado) return;

    this.buscando = true;
    this.errorMensaje = null;
    this.resultados = [];
    this.sugerenciasBusqueda = [];
    this.detalleExpandido = null;
    this.detalleActual = null;

    // Track
    this.analytics.track('click_generar', '/deseas');

    try {
      // ============================================================
      // 1. Extraer términos del texto
      // ============================================================
      const terminos = this.extraerTerminos(texto);
      console.log('📝 Términos detectados:', terminos);

      // ============================================================
      // 2. Validar términos contra el catálogo
      // ============================================================
      let textoParaBuscar = texto;   // 👈 texto que se enviará al embedding
      let terminosReconocidos: string[] = terminos;

      if (terminos.length > 0) {
        const validaciones = await this.validacionService.validarTerminos(
          terminos,
          this.paisSeleccionado.id
        );

        console.log('✅ Validaciones:', validaciones);

        // Guardar los NO reconocidos
        this.sugerenciasBusqueda = validaciones.filter(v => !v.reconocido);

        // Si hay 3+ términos no reconocidos → bloquear búsqueda
        if (this.sugerenciasBusqueda.length >= 3) {
          this.errorMensaje = 
            'Revisa tu búsqueda: hay varios términos que no reconocemos. ' +
            'Intenta con ingredientes más comunes.';
          this.buscando = false;
          return;
        }

        // 👇 Si hay términos no reconocidos, LIMPIARLOS del texto de búsqueda
        if (this.sugerenciasBusqueda.length > 0) {
          // Quedarse solo con los términos reconocidos
          terminosReconocidos = validaciones
            .filter(v => v.reconocido)
            .map(v => v.termino);

          // Reconstruir el texto de búsqueda solo con términos válidos
          if (terminosReconocidos.length > 0) {
            textoParaBuscar = terminosReconocidos.join(' ');
            console.log('📝 Texto de búsqueda limpio:', textoParaBuscar);
          } else {
            // Si NO hay ningún término reconocido, mostrar solo sugerencias
            this.resultados = [];
            this.haBuscado = true;
            this.errorMensaje = 
              'No reconocemos ningún ingrediente de tu búsqueda. ' +
              'Prueba con las sugerencias de arriba.';
            this.buscando = false;
            return;
          }
        }
      }

      const atributos = this.platoService.extraerAtributos(texto);
      console.log('🏷️ Atributos detectados:', atributos);

      // Guardar para mostrar chips en la UI
      this.atributosIncluir = atributos.incluir;
      this.atributosExcluir = atributos.excluir;      

      // ============================================================
      // 3. Ejecutar la búsqueda semántica
      // ============================================================
      this.resultados = await this.platoService.buscarSemantico(
        textoParaBuscar,
        this.paisSeleccionado.id,
        'nombre',
        0.55,
        30,                  // 👈 subir de 20 a 30 (más candidatos, el corte real es en cortarPorGap)
        atributos.incluir,   // 👈 NUEVO
        atributos.excluir    // 👈 NUEVO
      );

      this.haBuscado = true;

      if (this.resultados.length === 0) {
        this.errorMensaje =
          'No encontramos platos similares. Intenta describir con otras palabras.';
      }
    } catch (e: any) {
      console.error('Error en búsqueda', e);
      this.errorMensaje = 'Hubo un error en la búsqueda. Intenta de nuevo.';
    } finally {
      this.buscando = false;
    }
  }


  // ============================================================
  //  DETALLE EXPANDIBLE
  // ============================================================
  async toggleDetalle(platilloId: number): Promise<void> {
    if (this.detalleExpandido === platilloId) {
      this.detalleExpandido = null;
      this.detalleActual = null;
      return;
    }

    this.detalleExpandido = platilloId;
    this.cargandoDetalle = true;
    this.detalleActual = null;

    try {
      if (!this.paisSeleccionado) return;
      this.detalleActual = await this.platoService.obtenerDetallePlato(
        platilloId,
        this.paisSeleccionado.id
      );
    } catch (e) {
      console.error('Error al cargar detalle', e);
    } finally {
      this.cargandoDetalle = false;
    }
  }

  // ============================================================
  //  HELPERS
  // ============================================================
  formatearCantidad(cant: number, unidad: string): string {
    if (cant >= 1000 && unidad === 'g') {
      return (cant / 1000).toFixed(2) + ' kg';
    }
    if (['unid', 'lata', 'litro'].includes(unidad)) {
      return (cant < 1 && unidad === 'litro' ? cant.toFixed(2) : Math.ceil(cant)) + ' ' + unidad;
    }
    return Math.round(cant) + ' ' + unidad;
  }

  parsearPasos(preparacion: string): { titulo: string; pasos: string[] }[] {
    if (!preparacion) return [];

    const lineas = preparacion
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const secciones: { titulo: string; pasos: string[] }[] = [];
    let seccionActual: { titulo: string; pasos: string[] } | null = null;

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
    return secciones;
  }

  // ============================================================
  //  EXTRAER TÉRMINOS DEL TEXTO DEL USUARIO
  // ============================================================
  private extraerTerminos(texto: string): string[] {
    const textoLimpio = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(algo|que|con|de|para|pero|sin|no|tenga|lleve|quiero|deseo|comer|y|e|o|u|ni|tipo|sea|hay|esta|este)\b/g, ' ')
      .replace(/[.,;:!?()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 👇 NUEVO: palabras que NO son ingredientes (atributos, categorías, conceptos)
    const noIngredientes = new Set([
      // Categorías
      'entrada', 'entradas', 'sopa', 'sopas', 'caldo', 'caldos', 'crema', 'cremas',
      'postre', 'postres', 'bebida', 'bebidas', 'refresco', 'jugo',
      'desayuno', 'desayunos', 'almuerzo', 'cena', 'comida',
      'plato', 'platos', 'principal', 'fondo',
      // Atributos
      'vegetariano', 'vegetariana', 'vegetarianos',
      'vegano', 'vegana', 'veganos',
      'saludable', 'saludables', 'ligero', 'ligera', 'liviano', 'liviana',
      'light', 'picante', 'picantes', 'economico', 'economica',
      'barato', 'barata', 'accesible', 'celiaco', 'celiaca',
      'intolerante', 'proteico', 'proteica',
      // Conceptos generales
      'ensalada', 'ensaladas', 'guarnicion', 'guarniciones',
      'entrada', 'entradas', 'plato', 'platos',
      'carne', 'carnes', 'pescado', 'pescados', 'pollo', 'carnes',
      'comida', 'comidas', 'alimento', 'alimentos',
      'hoy', 'semana', 'dias', 'dia',
    ]);

    return textoLimpio
      .split(' ')
      .filter(p => p.length >= 3)
      .filter(p => !noIngredientes.has(p))   // 👈 NUEVO
      .filter((v, i, a) => a.indexOf(v) === i);
  }

  // ============================================================
  //  REEMPLAZAR UN TÉRMINO POR UNA SUGERENCIA
  // ============================================================
  reemplazarTermino(original: string, nuevo: string): void {
    // Reemplazar en el texto de consulta
    this.consulta = this.consulta.replace(
      new RegExp(original, 'gi'),
      nuevo
    );
    // Limpiar sugerencias y re-buscar
    this.sugerenciasBusqueda = [];
    this.buscar();
  }

  // ============================================================
  //  LIMPIAR
  // ============================================================
  limpiar(): void {
    this.consulta = '';
    this.resultados = [];
    this.sugerenciasBusqueda = [];
    this.haBuscado = false;
    this.errorMensaje = null;
    this.detalleExpandido = null;
    this.detalleActual = null;
    this.atributosIncluir = [];
    this.atributosExcluir = [];    
  }

  // Mapa de codigo → { nombre, icono } para mostrar chips
  readonly ATRIBUTOS_LABEL: { [k: string]: { nombre: string; icono: string } } = {
    'entrada':       { nombre: 'Entrada',        icono: '🥗' },
    'sopa':          { nombre: 'Sopa/Crema',     icono: '🍲' },
    'plato_fondo':   { nombre: 'Plato de fondo', icono: '🍽️' },
    'postre':        { nombre: 'Postre',         icono: '🍮' },
    'bebida':        { nombre: 'Bebida',         icono: '🥤' },
    'desayuno':      { nombre: 'Desayuno',       icono: '☀️' },
    'vegetariano':   { nombre: 'Vegetariano',    icono: '🥬' },
    'vegano':        { nombre: 'Vegano',         icono: '🌱' },
    'saludable':     { nombre: 'Saludable',      icono: '💚' },
    'bajo_calorias': { nombre: 'Bajo en calorías', icono: '🥗' },
    'alto_proteina': { nombre: 'Alto en proteína', icono: '💪' },
    'sin_gluten':    { nombre: 'Sin gluten',     icono: '🌾' },
    'sin_lactosa':   { nombre: 'Sin lactosa',    icono: '🥛' },
    'picante':       { nombre: 'Picante',        icono: '🌶️' },
    'economico':     { nombre: 'Económico',      icono: '💰' },
  };

  getLabelAtributo(codigo: string): { nombre: string; icono: string } {
    return this.ATRIBUTOS_LABEL[codigo] ?? { nombre: codigo, icono: '🏷️' };
  }

}