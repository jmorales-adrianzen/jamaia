import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/landing/landing.component')
        .then(m => m.LandingComponent),
    title: 'Jama — Cocina tu comida peruana y jamea según tu antojo'
  },
  {
    path: 'planner',
    loadComponent: () =>
      import('./components/planner/planner.component')
        .then(m => m.PlannerComponent),
    title: 'Menú Semanal — Jama'
  },
  {
    path: 'despensa',
    loadComponent: () =>
      import('./components/despensa/despensa.component')
        .then(m => m.DespensaComponent),
    title: 'Mi despensa — Jama'
  },
  {
    path: '**',
    redirectTo: ''
  }
];