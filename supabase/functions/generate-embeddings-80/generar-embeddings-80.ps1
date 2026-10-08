# ============================================================
# Genera embeddings para los 80 platillos faltantes (IDs 21-100)
# Origen:  platillo_traducciones
# Destino: platillo_embeddings
# ============================================================

$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZmVvaGVsd21jbWhid3lvZXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDc1NzMsImV4cCI6MjEwNTUyMzU3M30.rekspj3uAzNBhC7n-yNk65aRjB7eCf7KUqgyRVH7a0M"
$url     = "https://effeohelwmcmhbwyoewf.supabase.co/functions/v1/generate-embeddings"

$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type"  = "application/json"
}

$platillos = 21..100
$paises    = @(1, 2)
$tipos     = @("nombre", "preparacion")

$totalEsperado = $platillos.Count * $paises.Count * $tipos.Count

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Generacion de embeddings para 80 platillos" -ForegroundColor Cyan
Write-Host " Total de llamadas a realizar: $totalEsperado" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$ok       = 0
$errores  = 0
$saltados = 0
$contador = 0
$detalleErrores = @()

$inicio = Get-Date

foreach ($idPlatillo in $platillos) {
    foreach ($uid in $paises) {
        foreach ($tipo in $tipos) {

            $contador++
            $etiqueta = "[$contador/$totalEsperado] platillo=$idPlatillo, pais=$uid, tipo=$tipo"

            $body = @{
                platillo_id  = $idPlatillo
                ubicacion_id = $uid
                tipo         = $tipo
            } | ConvertTo-Json

            try {
                $r = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -TimeoutSec 120

                if ($r.generados -ge 1) {
                    $ok++
                    Write-Host "$etiqueta -> OK" -ForegroundColor Green
                } elseif ($r.procesados -eq 0) {
                    $saltados++
                    Write-Host "$etiqueta -> Sin traduccion en origen" -ForegroundColor Yellow
                    $detalleErrores += [pscustomobject]@{
                        platillo_id  = $idPlatillo
                        ubicacion_id = $uid
                        tipo         = $tipo
                        motivo       = "Sin fila en platillo_traducciones"
                    }
                } else {
                    $errores++
                    Write-Host "$etiqueta -> Error" -ForegroundColor Red
                    $detalleErrores += [pscustomobject]@{
                        platillo_id  = $idPlatillo
                        ubicacion_id = $uid
                        tipo         = $tipo
                        motivo       = ($r.detalle | ConvertTo-Json -Compress)
                    }
                }
            }
            catch {
                $errores++
                Write-Host "$etiqueta -> EXCEPCION: $_" -ForegroundColor Red
                $detalleErrores += [pscustomobject]@{
                    platillo_id  = $idPlatillo
                    ubicacion_id = $uid
                    tipo         = $tipo
                    motivo       = "$_"
                }
            }

            Start-Sleep -Milliseconds 250
        }
    }
}

$fin = Get-Date
$duracion = $fin - $inicio

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " OK:        $ok" -ForegroundColor Green
Write-Host " Saltados:  $saltados" -ForegroundColor Yellow
Write-Host " Errores:   $errores" -ForegroundColor Red
Write-Host " Total intentos: $contador / $totalEsperado"
Write-Host " Duracion: $($duracion.ToString('hh\:mm\:ss'))"
Write-Host ""

if ($detalleErrores.Count -gt 0) {
    $fecha = Get-Date -Format "yyyyMMdd-HHmmss"
    $logPath = "embeddings-errores-$fecha.csv"
    $detalleErrores | Export-Csv -Path $logPath -NoTypeInformation -Encoding UTF8
    Write-Host " Detalle de errores exportado a: $logPath" -ForegroundColor Yellow
}

Write-Host "Proceso completo" -ForegroundColor Green