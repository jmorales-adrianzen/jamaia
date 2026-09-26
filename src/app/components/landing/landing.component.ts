import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {

  readonly currentYear = new Date().getFullYear();
  menuAbierto: boolean = false;

  constructor(
    private router: Router,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  scrollA(seccionId: string): void {
    const el = document.getElementById(seccionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.cerrarMenu();
  }

  /**
   * Trackea el clic en "Probar Jama" y navega a /planner.
   */
  probarJama(): void {
    this.analytics.track('click_probar');
    this.cerrarMenu();
    this.router.navigate(['/planner']);
  }

  /**
   * Trackea el clic en "Mi despensa" y navega a /despensa.
   */
  irAMiDespensa(): void {
    this.analytics.track('click_probar');  // Reutilizamos el evento
    this.cerrarMenu();
    this.router.navigate(['/despensa']);
  }  

}