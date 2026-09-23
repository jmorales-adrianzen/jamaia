import { Injectable } from '@angular/core';
import { ItemCompra } from '../models/plato.model';
import { MenuService } from './menu.service';
import {
  DatosEnvioWhatsapp,
  OpcionesEnvioWhatsapp
} from '../models/whatsapp.model';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  constructor(private menuService: MenuService) {}

  // ============================================================
  //  PUNTO DE ENTRADA
  // ============================================================

  /**
   * Genera el mensaje según las opciones del usuario y abre WhatsApp Web.
   */
  enviarWhatsapp(datos: DatosEnvioWhatsapp, opciones: OpcionesEnvioWhatsapp): void {
    let mensaje = '';

    switch (opciones.modo) {
      case 'proveedor':
        mensaje = this.generarPedidoProveedor(datos, opciones);
        break;
      case 'compartir':
        mensaje = this.generarResumenCompartible(datos, opciones);
        break;
      case 'rapida':
        mensaje = this.generarListaRapida(datos);
        break;
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  // ============================================================
  //  MODO 1: PEDIDO A PROVEEDOR
  //  - Sin precios
  //  - Filtrado por categorías seleccionadas
  //  - Lenguaje formal
  // ============================================================

  private generarPedidoProveedor(
    datos: DatosEnvioWhatsapp,
    opciones: OpcionesEnvioWhatsapp
  ): string {
    const comprasFiltradas = datos.compras.filter(c =>
      opciones.categoriasSeleccionadas.includes(c.categoria_nombre)
    );

    if (comprasFiltradas.length === 0) {
      return 'No has seleccionado ninguna categoría para incluir en el pedido.';
    }

    const lineas: string[] = [];
    lineas.push('🛒 *PEDIDO DE INSUMOS*');
    lineas.push('');
    lineas.push('Hola, por favor necesito:');

    // Agrupar por categoría
    const grupos = this.agruparPorCategoria(comprasFiltradas);
    const categoriasOrdenadas = this.ordenarCategorias(grupos);

    categoriasOrdenadas.forEach(([catNombre, items]) => {
      lineas.push('');
      lineas.push(`*${catNombre.toUpperCase()}*`);
      items.forEach(item => {
        lineas.push(`  ☐ ${item.nombre}: ${this.formatearCantidad(item.cantidad, item.unidad)}`);
      });
    });

    // Datos opcionales
    const tieneDatos = opciones.nombreCliente?.trim() || opciones.direccionCliente?.trim();
    if (tieneDatos) {
      lineas.push('');
      lineas.push('━━━━━━━━━━━━━━━━━━━━');
      if (opciones.nombreCliente?.trim()) {
        lineas.push(`👤 Cliente: ${opciones.nombreCliente.trim()}`);
      }
      if (opciones.direccionCliente?.trim()) {
        lineas.push(`📍 Dirección: ${opciones.direccionCliente.trim()}`);
      }
    }

    lineas.push('');
    lineas.push('¡Gracias!');

    return lineas.join('\n');
  }

  // ============================================================
  //  MODO 2: RESUMEN COMPARTIBLE
  //  - Con precios
  //  - Con nombres de platos (opcional)
  //  - Lenguaje casual
  // ============================================================

  private generarResumenCompartible(
    datos: DatosEnvioWhatsapp,
    opciones: OpcionesEnvioWhatsapp
  ): string {
    const lineas: string[] = [];
    lineas.push('🍽️ *MENÚ DE LA SEMANA*');
    lineas.push(`📍 ${datos.pais}  •  👥 ${datos.personas} personas`);

    // Platos
    if (opciones.incluirPlatos && datos.platos.length > 0) {
      lineas.push('');
      lineas.push('*Vamos a comer:*');
      datos.platos.forEach(({ dia, plato }) => {
        lineas.push(`  📌 ${dia}: ${plato.nombre}`);
      });
    }

    lineas.push('');
    lineas.push('━━━━━━━━━━━━━━━━━━━━');
    lineas.push('');
    lineas.push('🛒 *LISTA DE COMPRAS*');

    // Compras por categoría
    const grupos = this.agruparPorCategoria(datos.compras);
    const categoriasOrdenadas = this.ordenarCategorias(grupos);

    categoriasOrdenadas.forEach(([catNombre, items]) => {
      const icono = items[0]?.categoria_icono ?? '📦';
      lineas.push('');
      lineas.push(`${icono} *${catNombre.toUpperCase()}*`);

      items.forEach(item => {
        const cant = this.formatearCantidad(item.cantidad, item.unidad);
        if (opciones.incluirPrecios) {
          lineas.push(`  • ${item.nombre}: ${cant} — ${datos.simboloMoneda} ${item.costo.toFixed(2)}`);
        } else {
          lineas.push(`  • ${item.nombre}: ${cant}`);
        }
      });
    });

    // Total
    if (opciones.incluirPrecios) {
      const total = datos.compras.reduce((sum, c) => sum + c.costo, 0);
      lineas.push('');
      lineas.push('━━━━━━━━━━━━━━━━━━━━');
      lineas.push(`💰 *Total estimado:* ${datos.simboloMoneda} ${total.toFixed(2)}`);
    }

    lineas.push('');
    lineas.push('_¡Buen provecho!_ 🍴');

    return lineas.join('\n');
  }

  // ============================================================
  //  MODO 3: LISTA RÁPIDA
  //  - Con categorías
  //  - Con precios referenciales
  //  - Con checkboxes
  // ============================================================

  private generarListaRapida(datos: DatosEnvioWhatsapp): string {
    const lineas: string[] = [];
    lineas.push('🛒 *LISTA DE COMPRAS*');
    lineas.push(`👥 ${datos.personas} personas`);
    lineas.push('');

    const grupos = this.agruparPorCategoria(datos.compras);
    const categoriasOrdenadas = this.ordenarCategorias(grupos);

    categoriasOrdenadas.forEach(([catNombre, items]) => {
      const icono = items[0]?.categoria_icono ?? '📦';
      lineas.push(`${icono} *${catNombre}*`);
      items.forEach(item => {
        const cant = this.formatearCantidad(item.cantidad, item.unidad);
        lineas.push(`☐ ${item.nombre}: ${cant} — ${datos.simboloMoneda} ${item.costo.toFixed(2)}`);
      });
      lineas.push('');
    });

    const total = datos.compras.reduce((sum, c) => sum + c.costo, 0);
    lineas.push('━━━━━━━━━━━━━━━━━━━━');
    lineas.push(`💰 *Total:* ${datos.simboloMoneda} ${total.toFixed(2)}`);

    return lineas.join('\n');
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  private agruparPorCategoria(compras: ItemCompra[]): Map<string, ItemCompra[]> {
    const grupos = new Map<string, ItemCompra[]>();
    for (const c of compras) {
      if (!grupos.has(c.categoria_nombre)) {
        grupos.set(c.categoria_nombre, []);
      }
      grupos.get(c.categoria_nombre)!.push(c);
    }
    return grupos;
  }

  private ordenarCategorias(grupos: Map<string, ItemCompra[]>): [string, ItemCompra[]][] {
    return Array.from(grupos.entries()).sort(([, itemsA], [, itemsB]) => {
      const ordenA = itemsA[0]?.categoria_orden ?? 999;
      const ordenB = itemsB[0]?.categoria_orden ?? 999;
      return ordenA - ordenB;
    });
  }

  private formatearCantidad(cant: number, unidad: string): string {
    return this.menuService.formatearCantidad(cant, unidad);
  }
}