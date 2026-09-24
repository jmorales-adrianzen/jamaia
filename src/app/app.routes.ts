import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/landing/landing.component')
        .then(m => m.LandingComponent),
    title: 'Jama — Cocina tu menú y jamea según tu antojo'
  },
  {
    path: 'planner',
    loadComponent: () =>
      import('./components/planner/planner.component')
        .then(m => m.PlannerComponent),
    title: 'Planificador — Jama'
  },
  {
    path: '**',
    redirectTo: ''
  }
];