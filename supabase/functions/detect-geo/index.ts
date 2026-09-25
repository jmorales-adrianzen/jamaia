// ============================================================
// EDGE FUNCTION: detect-geo
// Detecta el país del visitante con 2 estrategias:
//   1. Cabeceras de Cloudflare (producción, país exacto)
//   2. Timezone enviado por el navegador (fallback, país aproximado)
// Sin servicios externos, sin permisos del usuario.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Mapeo de códigos ISO a nombres de país
const countryNames: Record<string, string> = {
  'PE': 'Perú',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'MX': 'México',
  'BR': 'Brasil',
  'EC': 'Ecuador',
  'BO': 'Bolivia',
  'PY': 'Paraguay',
  'UY': 'Uruguay',
  'VE': 'Venezuela',
  'US': 'Estados Unidos',
  'ES': 'España',
  'PA': 'Panamá',
  'CR': 'Costa Rica',
  'GT': 'Guatemala',
  'DO': 'República Dominicana',
  'CU': 'Cuba',
  'PR': 'Puerto Rico',
};

// Mapeo de timezone → país (fallback cuando Cloudflare no está disponible)
const timezoneToCountry: Record<string, { code: string, name: string }> = {
  // === América del Sur ===
  'America/Lima': { code: 'PE', name: 'Perú' },
  'America/Argentina/Buenos_Aires': { code: 'AR', name: 'Argentina' },
  'America/Argentina/Cordoba': { code: 'AR', name: 'Argentina' },
  'America/Argentina/Mendoza': { code: 'AR', name: 'Argentina' },
  'America/Santiago': { code: 'CL', name: 'Chile' },
  'America/Bogota': { code: 'CO', name: 'Colombia' },
  'America/Caracas': { code: 'VE', name: 'Venezuela' },
  'America/Guayaquil': { code: 'EC', name: 'Ecuador' },
  'America/La_Paz': { code: 'BO', name: 'Bolivia' },
  'America/Asuncion': { code: 'PY', name: 'Paraguay' },
  'America/Montevideo': { code: 'UY', name: 'Uruguay' },
  'America/Sao_Paulo': { code: 'BR', name: 'Brasil' },
  'America/Bahia': { code: 'BR', name: 'Brasil' },
  'America/Fortaleza': { code: 'BR', name: 'Brasil' },
  'America/Recife': { code: 'BR', name: 'Brasil' },
  'America/Manaus': { code: 'BR', name: 'Brasil' },

  // === América del Norte y Central ===
  'America/Mexico_City': { code: 'MX', name: 'México' },
  'America/Monterrey': { code: 'MX', name: 'México' },
  'America/Tijuana': { code: 'MX', name: 'México' },
  'America/Cancun': { code: 'MX', name: 'México' },
  'America/Panama': { code: 'PA', name: 'Panamá' },
  'America/Costa_Rica': { code: 'CR', name: 'Costa Rica' },
  'America/Guatemala': { code: 'GT', name: 'Guatemala' },
  'America/Santo_Domingo': { code: 'DO', name: 'República Dominicana' },
  'America/Havana': { code: 'CU', name: 'Cuba' },
  'America/Puerto_Rico': { code: 'PR', name: 'Puerto Rico' },
  'America/New_York': { code: 'US', name: 'Estados Unidos' },
  'America/Chicago': { code: 'US', name: 'Estados Unidos' },
  'America/Denver': { code: 'US', name: 'Estados Unidos' },
  'America/Los_Angeles': { code: 'US', name: 'Estados Unidos' },
  'America/Miami': { code: 'US', name: 'Estados Unidos' },

  // === Europa ===
  'Europe/Madrid': { code: 'ES', name: 'España' },
  'Europe/Barcelona': { code: 'ES', name: 'España' },
  'Europe/Lisbon': { code: 'PT', name: 'Portugal' },
  'Europe/Paris': { code: 'FR', name: 'Francia' },
  'Europe/London': { code: 'GB', name: 'Reino Unido' },
  'Europe/Berlin': { code: 'DE', name: 'Alemania' },
  'Europe/Rome': { code: 'IT', name: 'Italia' },
};

Deno.serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ============================================================
    // Estrategia 1: Cabeceras de Cloudflare (producción)
    // ============================================================
    let countryCode = req.headers.get('cf-ipcountry');
    let region = req.headers.get('cf-region');
    let city = req.headers.get('cf-ipcity');
    let timezone = req.headers.get('cf-timezone');
    let source = 'cloudflare';

    // ============================================================
    // Estrategia 2: Fallback a timezone enviado por el frontend
    // (funciona desde localhost y como respaldo)
    // ============================================================
    if (!countryCode) {
      source = 'timezone';

      // Leer el body que envía Angular
      try {
        const body = await req.json();
        const clientTimezone = body?.timezone;

        if (clientTimezone) {
          timezone = clientTimezone;
          const match = timezoneToCountry[clientTimezone];

          if (match) {
            countryCode = match.code;
            // region y city quedan null porque timezone no los da
          }
        }
      } catch {
        // Body vacío o inválido, seguimos con nulls
      }
    }

    // ============================================================
    // Mapeo de código ISO a nombre
    // ============================================================
    const countryName = countryCode
      ? (countryNames[countryCode] || countryCode)
      : null;

    return new Response(
      JSON.stringify({
        country_code: countryCode,
        country_name: countryName,
        region: region,
        city: city,
        timezone: timezone,
        source: source,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'No se pudo detectar la ubicación',
        details: String(error),
        country_code: null,
        country_name: null,
        region: null,
        city: null,
        timezone: null,
        source: 'error',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  }
});