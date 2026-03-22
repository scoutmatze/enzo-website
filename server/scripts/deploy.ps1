# ═══════════════════════════════════════════════════════
# Da Enzo – Deploy Script (Windows PowerShell)
#
# Nutzung:
#   .\deploy.ps1 dev       → deployed auf DEV (dev.da-enzo-muenchen.de)
#   .\deploy.ps1 prod      → deployed auf PRODUKTION (www.da-enzo-muenchen.de)
#   .\deploy.ps1 promote   → kopiert DEV → PRODUKTION auf dem Server
#
# DEV ist passwortgeschuetzt: enzo / Enz0Dev2026!
# ═══════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod', 'promote')]
    [string]$Environment
)

$SSH = "hetzner"
$WEB_ROOT_PROD = "/var/www/enzo"
$WEB_ROOT_DEV = "/var/www/enzo-dev"

Write-Host ""
Write-Host "Da Enzo Deploy: $($Environment.ToUpper())" -ForegroundColor Cyan
Write-Host ""

switch ($Environment) {
    'dev' {
        $TARGET = $WEB_ROOT_DEV
        Write-Host "Deploying auf DEV..." -ForegroundColor Yellow

        Write-Host "[1/4] HTML + JS + JSON..." -ForegroundColor Gray
        scp website/index.html website/i18n.js website/impressum.html website/datenschutz.html website/barrierefreiheit.html website/404.html website/speisekarte.json website/wochenkarte.json "${SSH}:${TARGET}/"

        Write-Host "[2/4] Fonts..." -ForegroundColor Gray
        scp -r website/fonts "${SSH}:${TARGET}/"

        Write-Host "[3/4] Bilder..." -ForegroundColor Gray
        scp -r website/img "${SSH}:${TARGET}/"

        Write-Host "[4/4] Rechte setzen..." -ForegroundColor Gray
        ssh $SSH "chown -R www-data:www-data $TARGET && chmod -R 755 $TARGET"

        Write-Host ""
        Write-Host "DEV deployed!" -ForegroundColor Green
        Write-Host "URL: https://dev.da-enzo-muenchen.de" -ForegroundColor Cyan
        Write-Host "Login: enzo / Enz0Dev2026!" -ForegroundColor Cyan
    }

    'prod' {
        Write-Host "ACHTUNG: Du deployest direkt auf PRODUKTION!" -ForegroundColor Red
        $confirm = Read-Host "Bist du sicher? (ja/nein)"
        if ($confirm -ne 'ja') {
            Write-Host "Abgebrochen." -ForegroundColor Yellow
            return
        }

        $TARGET = $WEB_ROOT_PROD
        Write-Host "Deploying auf PRODUKTION..." -ForegroundColor Yellow

        Write-Host "[1/4] HTML + JS + JSON..." -ForegroundColor Gray
        scp website/index.html website/i18n.js website/impressum.html website/datenschutz.html website/barrierefreiheit.html website/404.html website/speisekarte.json website/wochenkarte.json "${SSH}:${TARGET}/"

        Write-Host "[2/4] Fonts..." -ForegroundColor Gray
        scp -r website/fonts "${SSH}:${TARGET}/"

        Write-Host "[3/4] Bilder..." -ForegroundColor Gray
        scp -r website/img "${SSH}:${TARGET}/"

        Write-Host "[4/4] Rechte setzen..." -ForegroundColor Gray
        ssh $SSH "chown -R www-data:www-data $TARGET && chmod -R 755 $TARGET"

        Write-Host ""
        Write-Host "PRODUKTION deployed!" -ForegroundColor Green
        Write-Host "URL: https://www.da-enzo-muenchen.de" -ForegroundColor Cyan
    }

    'promote' {
        Write-Host "Kopiere DEV nach PRODUKTION auf dem Server..." -ForegroundColor Yellow
        Write-Host "ACHTUNG: Ueberschreibt die aktuelle Produktionsversion!" -ForegroundColor Red
        $confirm = Read-Host "Bist du sicher? (ja/nein)"
        if ($confirm -ne 'ja') {
            Write-Host "Abgebrochen." -ForegroundColor Yellow
            return
        }

        ssh $SSH "TIMESTAMP=`$(date +%Y%m%d_%H%M) && tar -czf /opt/backups/enzo_pre_promote_`${TIMESTAMP}.tar.gz $WEB_ROOT_PROD && rsync -av --delete $WEB_ROOT_DEV/ $WEB_ROOT_PROD/ && chown -R www-data:www-data $WEB_ROOT_PROD && echo Done"

        Write-Host ""
        Write-Host "DEV auf PRODUKTION promoted! Backup erstellt." -ForegroundColor Green
    }
}
