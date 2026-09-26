import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css']
})
export class MainMenuComponent implements OnInit {

  /**
   * Modo del menú:
   * - 'full': muestra logo + todas las opciones (para /planner, /despensa, /faltantes)
   * - 'minimal': solo logo + botón "volver" (uso futuro)
   */
  @Input() modo: 'full' | 'minimal' = 'full';

  menuAbierto: boolean = false;
  rutaActual: string = '';

  // Opciones del menú
  readonly opciones = [
    { path: '/planner',   label: 'Menú Semanal',  icon: '📅' },
    { path: '/despensa',  label: 'Mi despensa',   icon: '🍳' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Detectar ruta actual para resaltar opción activa
    this.rutaActual = this.router.url;
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.rutaActual = e.urlAfterRedirects;
      });
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  esRutaActiva(path: string): boolean {
    return this.rutaActual.startsWith(path);
  }

  irAInicio(): void {
    this.cerrarMenu();
    this.router.navigate(['/']);
  }
}