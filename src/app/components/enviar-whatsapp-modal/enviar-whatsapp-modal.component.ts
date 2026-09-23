import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { WhatsappService } from 'src/app/services/whatsapp.service';
import { ItemCompra, PlatoCompleto } from 'src/app/models/plato.model';
import {
  ModoEnvio,
  DatosEnvioWhatsapp,
  OpcionesEnvioWhatsapp
} from 'src/app/models/whatsapp.model';

interface CategoriaConCheck {
  nombre: string;
  icono: string;
  orden: number;
  itemsCount: number;
  seleccionada: boolean;
}

@Component({
  selector: 'app-enviar-whatsapp-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enviar-whatsapp-modal.component.html',
  styleUrls: ['./enviar-whatsapp-modal.component.css']
})
export class EnviarWhatsappModalComponent implements OnInit {

  // ===== Inputs =====
  @Input() compras: ItemCompra[] = [];
  @Input() platos: { dia: string; plato: PlatoCompleto }[] = [];
  @Input() personas: number = 4;
  @Input() pais: string = '';
  @Input() simboloMoneda: string = 'S/';

  // ===== Outputs =====
  @Output() cerrar = new EventEmitter<void>();

  // ===== Estado =====
  modo: ModoEnvio = 'proveedor';
  categorias: CategoriaConCheck[] = [];

  // Solo modo 'proveedor'
  nombreCliente: string = '';
  direccionCliente: string = '';

  // Solo modo 'compartir'
  incluirPlatos: boolean = true;
  incluirPrecios: boolean = true;

  constructor(private whatsappService: WhatsappService) {}

  ngOnInit(): void {
    this.construirCategorias();
  }

  private construirCategorias(): void {
    const mapa = new Map<string, CategoriaConCheck>();

    for (const c of this.compras) {
      if (!mapa.has(c.categoria_nombre)) {
        mapa.set(c.categoria_nombre, {
          nombre: c.categoria_nombre,
          icono: c.categoria_icono,
          orden: c.categoria_orden,
          itemsCount: 0,
          seleccionada: true   // ✅ todas seleccionadas por defecto
        });
      }
      mapa.get(c.categoria_nombre)!.itemsCount++;
    }

    this.categorias = Array.from(mapa.values())
      .sort((a, b) => a.orden - b.orden);
  }

  // ===== Acciones UI =====
  seleccionarModo(modo: ModoEnvio): void {
    this.modo = modo;
  }

  toggleTodasCategorias(): void {
    const todasMarcadas = this.categorias.every(c => c.seleccionada);
    this.categorias.forEach(c => c.seleccionada = !todasMarcadas);
  }

  contarCategoriasSeleccionadas(): number {
    return this.categorias.filter(c => c.seleccionada).length;
  }

  // ===== Enviar =====
  enviar(): void {
    const datos: DatosEnvioWhatsapp = {
      compras: this.compras,
      platos: this.platos,
      personas: this.personas,
      pais: this.pais,
      simboloMoneda: this.simboloMoneda
    };

    const opciones: OpcionesEnvioWhatsapp = {
      modo: this.modo,
      categoriasSeleccionadas: this.categorias
        .filter(c => c.seleccionada)
        .map(c => c.nombre),
      nombreCliente: this.nombreCliente,
      direccionCliente: this.direccionCliente,
      incluirPlatos: this.incluirPlatos,
      incluirPrecios: this.incluirPrecios
    };

    this.whatsappService.enviarWhatsapp(datos, opciones);
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  // ===== Validación =====
  get puedeEnviar(): boolean {
    if (this.modo === 'proveedor') {
      return this.contarCategoriasSeleccionadas() > 0;
    }
    return true;
  }

  get todasSeleccionadas(): boolean {
    return this.categorias.length > 0 &&
           this.categorias.every(c => c.seleccionada);
  }
}