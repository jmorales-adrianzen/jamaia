import { Injectable } from '@angular/core';
import { CatalogoPlatos, CompraAcumulada, PlatoSeleccionado } from '../models/plato.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  readonly CatPlatosPeru: CatalogoPlatos = {
    ninguno: {
      nombre: "— Ninguno / Descanso —",
      ingredientes: [],
      sugerenciaPrevia: "",
      preparacion: "",
      imagen: ""
    },
    lentejas_pescado: {
      nombre: "Lentejas con pescado frito",
      imagen: "assets/imagenes/lentejas-con-pescado.frito.jpg",
      ingredientes: [
        { id: "lenteja_id", nombre: "Lentejas", cant: 125, unidad: "g", precioUnit: 0.01 },
        { id: "pescado", nombre: "Pescado Bonito", cant: 200, unidad: "g", precioUnit: 0.012 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 0.006 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Remojar las lentejas 2 a 3 horas antes en agua templada con una pizca de sal.",
      preparacion: "1. Sofríe cebolla y ajo... 2. Agrega las lentejas... 3. Sazona el pescado..."
    },
    carne_papas: {
      nombre: "Carne frita con papas doradas, ensalada y arroz",
      imagen: "assets/imagenes/carne-frita-papas-ensalada-arroz.jpg",
      ingredientes: [
        { id: "carne", nombre: "Bistec de carne", cant: 150, unidad: "g", precioUnit: 0.033 },
        { id: "papa", nombre: "Papa Blanca/Canchán", cant: 200, unidad: "g", precioUnit: 0.003 },
        { id: "ensalada", nombre: "Tomate y Lechuga", cant: 150, unidad: "g", precioUnit: 0.005 },
        { id: "limon", nombre: "Limón", cant: 1, unidad: "unid", precioUnit: 0.3 },
        { id: "arroz", nombre: "Arroz", cant: 100, unidad: "g", precioUnit: 0.004 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Sancochar las papas peladas con sal con anticipación.",
      preparacion: "1. Corta las papas... 2. Condimenta la carne... 3. Sella a fuego alto..."
    }
    // Agregar el resto de platos del catálogo aquí...
  };

  readonly CatPlatosArgentina: CatalogoPlatos = {
    ninguno: {
      nombre: "— Ninguno / Descanso —",
      ingredientes: [],
      sugerenciaPrevia: "",
      preparacion: "",
      imagen: ""
    },
    lentejas_pescado: {
      nombre: "Lentejas con filet de pescado frito",
      imagen: "assets/imagenes/lentejas-con-pescado.frito.jpg",
      ingredientes: [
        { id: "lenteja_id", nombre: "Lentejas secas", cant: 125, unidad: "g", precioUnit: 3.5 },
        { id: "pescado", nombre: "Filet de Merluza", cant: 200, unidad: "g", precioUnit: 9.0 },
        { id: "cebolla_ajo", nombre: "Cebolla y Ajo", cant: 40, unidad: "g", precioUnit: 2.0 }
      ],
      sugerenciaPrevia: "💡 Tarea previa: Dejar las lentejas en remojo 2 horas antes.",
      preparacion: "1. Rehogá cebolla picada... 2. Sumá las lentejas... 3. Condimentá los filets..."
    }
    // Agregar el resto de platos del catálogo aquí...
  };

  getCatalogo(pais: string): CatalogoPlatos {
    return pais === 'PE' ? this.CatPlatosPeru : this.CatPlatosArgentina;
  }

  formatearCantidad(cant: number, unidad: string): string {
    if (cant >= 1000 && unidad === 'g') {
      return (cant / 1000).toFixed(2) + ' kg';
    }
    if (unidad === 'unid' || unidad === 'lata' || unidad === 'litro') {
      return (cant < 1 && unidad === 'litro' ? cant.toFixed(2) : Math.ceil(cant)) + ' ' + unidad;
    }
    return Math.round(cant) + ' ' + unidad;
  }
}