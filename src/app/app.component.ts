import { Component } from '@angular/core';
import { PlannerComponent } from './components/planner/planner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PlannerComponent],
  template: `<app-planner></app-planner>`
})
export class AppComponent {}