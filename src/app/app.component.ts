import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AnalyticsService } from './services/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'jamaia';

  constructor(
    private analytics: AnalyticsService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // 1. Inicializar analytics (una sola vez)
    await this.analytics.init();

    // 2. Trackear cada cambio de ruta como 'app_load'
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.analytics.track('app_load', e.urlAfterRedirects);
      });
  }
}