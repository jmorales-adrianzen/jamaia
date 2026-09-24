import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {

  // Año dinámico para el footer
  readonly currentYear = new Date().getFullYear();

  // Estado del menú móvil
  menuAbierto: boolean = false;

  ngOnInit(): void {
    // Scroll to top al entrar a la landing
    window.scrollTo(0, 0);
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  /**
   * Hace scroll suave a una sección de la landing.
   */
  scrollA(seccionId: string): void {
    const el = document.getElementById(seccionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.cerrarMenu();
  }
}