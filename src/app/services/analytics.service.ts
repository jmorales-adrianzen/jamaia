// ============================================================
// ANALYTICS SERVICE — Jama
// Captura eventos de uso sin servicios externos.
// Combina datos del navegador + geolocalización por timezone/Cloudflare.
// ============================================================

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';

// Tipos de eventos soportados
export type EventType =
  | 'app_load'
  | 'click_probar'
  | 'click_generar'
  | 'click_whatsapp';

// Estructura de datos geográficos
interface GeoData {
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  source: 'cloudflare' | 'timezone' | 'error' | 'pending';
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  private sessionId: string | null = null;
  private geoData: GeoData = {
    country_code: null,
    country_name: null,
    region: null,
    city: null,
    timezone: null,
    source: 'pending'
  };
  private geoLoaded = false;
  private initialized = false;

  constructor(
    private sb: SupabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ============================================================
  //  INICIALIZACIÓN (llamada 1 sola vez desde AppComponent)
  // ============================================================
  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.initialized) return;

    // 1. Ignorar bots
    if (this.esBot()) {
      console.log('🤖 Bot detectado, analytics desactivado');
      return;
    }

    // 2. Generar/recuperar session ID
    this.sessionId = this.obtenerOCrearSessionId();

    this.initialized = true;
    console.log('✅ Analytics inicializado. Session:', this.sessionId);

    // 3. Cargar geolocalización en background (no bloquea)
    this.cargarGeo().catch(() => { /* silencioso */ });
  }

  // ============================================================
  //  TRACK — Registra un evento
  // ============================================================
  async track(event: EventType, pagePath?: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.sessionId) {
      console.warn('⚠️ Analytics no inicializado. Llama a init() primero.');
      return;
    }

    // 👇 NUEVO: filtrar app_load duplicado en la misma sesión
    if (event === 'app_load') {
        const KEY = `jama_app_load_${this.sessionId}`;
        if (sessionStorage.getItem(KEY)) {
        // Ya se registró app_load en esta sesión → no duplicar
        return;
        }
        sessionStorage.setItem(KEY, '1');
    }    

    // Esperar máximo 2s a que cargue la geo (no bloquea la UX)
    let intentos = 0;
    while (!this.geoLoaded && intentos < 20) {
      await new Promise(r => setTimeout(r, 100));
      intentos++;
    }

    const browserData = this.obtenerDatosNavegador();

    const evento = {
      event_type: event,
      session_id: this.sessionId,
      page_path: pagePath ?? window.location.pathname,

      // Geolocalización
      country_code: this.geoData.country_code,
      country_name: this.geoData.country_name,
      region: this.geoData.region,
      city: this.geoData.city,
      timezone: this.geoData.timezone,

      // Del navegador
      ...browserData,

      // Navegación
      referrer: document.referrer || 'direct'
    };

    try {
      const { error } = await this.sb.client
        .from('analytics_events')
        .insert(evento);

      if (error) {
        console.error('❌ Analytics error:', error);
      } else {
        console.log(`📊 Evento tracked: ${event}`, evento);
      }
    } catch (e) {
      console.warn('⚠️ Analytics falló (no crítico):', e);
    }
  }

  // ============================================================
  //  HELPERS PRIVADOS
  // ============================================================

  private obtenerOCrearSessionId(): string {
    const KEY = 'jama_session_id';
    let id = sessionStorage.getItem(KEY);

    if (!id) {
      // Generar UUID (funciona en navegadores modernos)
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  }

  private async cargarGeo(): Promise<void> {
    try {
      // Obtener timezone del navegador
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Llamar a la Edge Function con el timezone
      const { data, error } = await this.sb.client.functions.invoke(
        'detect-geo',
        { body: { timezone } }
      );

      if (error) throw error;

      if (data) {
        this.geoData = {
          country_code: data.country_code ?? null,
          country_name: data.country_name ?? null,
          region: data.region ?? null,
          city: data.city ?? null,
          timezone: data.timezone ?? timezone,
          source: data.source ?? 'error'
        };

        console.log('🌍 Geo detectada:', this.geoData);
      }
    } catch (e) {
      console.warn('⚠️ Geo falló, usando timezone local:', e);

      // Fallback: usar timezone directamente sin país
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.geoData = {
        country_code: null,
        country_name: null,
        region: null,
        city: null,
        timezone: timezone,
        source: 'error'
      };
    } finally {
      this.geoLoaded = true;
    }
  }

  private esBot(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    const bots = ['bot', 'crawler', 'spider', 'facebookexternalhit', 'lighthouse'];
    return bots.some(b => ua.includes(b)) || (navigator as any).webdriver === true;
  }

  private obtenerDatosNavegador() {
    const ua = navigator.userAgent;
    const nav: any = navigator;
    const conn: any = nav.connection || nav.mozConnection || nav.webkitConnection;

    return {
      // Navegador
      user_agent: ua,
      browser_name: this.detectarNavegador(ua),
      browser_version: this.detectarVersionNavegador(ua),
      os_name: this.detectarOS(ua),
      device_type: this.detectarDeviceType(ua),

      // Idioma
      language: navigator.language || 'es-PE',
      languages: (navigator.languages || []).join(','),

      // Pantalla
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio,
      color_depth: window.screen.colorDepth,
      orientation: (window.screen.orientation?.type ?? 'unknown'),

      // Hardware (con fallbacks)
      cpu_cores: nav.hardwareConcurrency ?? null,
      device_memory: nav.deviceMemory ?? null,
      connection_type: conn?.effectiveType ?? null,

      // Preferencias
      prefers_dark_mode: window.matchMedia('(prefers-color-scheme: dark)').matches
    };
  }

  private detectarNavegador(ua: string): string {
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Safari/')) return 'Safari';
    return 'Otro';
  }

  private detectarVersionNavegador(ua: string): string {
    const patterns = [
      /Edg\/([\d.]+)/,
      /OPR\/([\d.]+)/,
      /Chrome\/([\d.]+)/,
      /Firefox\/([\d.]+)/,
      /Version\/([\d.]+)/
    ];
    for (const p of patterns) {
      const m = ua.match(p);
      if (m) return m[1];
    }
    return '';
  }

  private detectarOS(ua: string): string {
    if (ua.includes('Windows NT 10')) return 'Windows 10/11';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone')) return 'iOS';
    if (ua.includes('iPad')) return 'iPadOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Otro';
  }

  private detectarDeviceType(ua: string): string {
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
  }
}